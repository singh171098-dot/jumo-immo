"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ── Props ───────────────────────────────────────────────────────────────── */
type Props = {
  surface?: number;
  dpe?: string;
  heatingType?: string | null;
  insulationLevel?: string | null;
};

/* ── Cost table (€ per m²) ───────────────────────────────────────────────── */
const BASE_COSTS: Record<string, number> = {
  "F-E": 150,
  "F-D": 300,
  "F-C": 500,
  "G-D": 400,
  "G-C": 600,
};

const TARGET_OPTIONS = ["E", "D", "C"] as const;
type TargetDpe = (typeof TARGET_OPTIONS)[number];

/* ── Helpers ─────────────────────────────────────────────────────────────── */
const fmtEur = (n: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);

/* ── Component ───────────────────────────────────────────────────────────── */
export default function DpeRenovationSimulator({
  surface,
  dpe,
  heatingType,
  insulationLevel,
}: Props) {
  const [targetDpe, setTargetDpe] = useState<TargetDpe>("D");

  /* Visibility gate: only F or G, and only when surface is present */
  if (!surface || !dpe) return null;
  const upperDpe = dpe.toUpperCase();
  if (!["F", "G"].includes(upperDpe)) return null;

  /* Cost calculation */
  const key      = `${upperDpe}-${targetDpe}`;
  const baseCost = BASE_COSTS[key] ?? 300;

  // Normalise insulation: handles both stored values ("Mauvais/Bon") and schema labels ("Faible/Bonne")
  const insulNorm    = (insulationLevel ?? "").toLowerCase();
  const insulIsBad   = insulNorm.includes("mauv") || insulNorm.includes("faib");
  const insulIsGood  = insulNorm.includes("bon")  || insulNorm.includes("excel");
  // Smart default: F/G with no insulation data → assume poor insulation
  const assumeBadInsul = !insulationLevel && ["F", "G"].includes(upperDpe);
  // Smart default: no heating data → assume electric (worst-case cost)
  const effectiveHeating = heatingType || "Électrique";

  let multiplier = 1;
  if (insulIsBad || assumeBadInsul)                    multiplier += 0.2;
  if (insulIsGood)                                     multiplier -= 0.1;
  if (effectiveHeating === "Électrique")               multiplier += 0.1;
  if (effectiveHeating === "Pompe à chaleur")          multiplier -= 0.1;

  const totalCost = Math.round(surface * baseCost * multiplier);
  const perSqm    = Math.round(totalCost / surface);

  return (
    <div className="rounded-2xl bg-white/5 backdrop-blur border border-white/10 p-5 mt-6">

      {/* Title */}
      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">
        Simulation rénovation
      </p>
      <p className="text-sm font-bold text-white mb-4">
        Simuler le coût de rénovation énergétique
      </p>

      {/* Target DPE selector */}
      <div className="flex items-center gap-3 mb-5">
        <span className="text-xs text-gray-400 shrink-0">Classe cible :</span>
        <div className="flex gap-2">
          {TARGET_OPTIONS.map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setTargetDpe(t)}
              className={`w-10 h-10 rounded-xl text-sm font-black border-2 transition-all duration-200 active:scale-95 ${
                targetDpe === t
                  ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20"
                  : "bg-white/[0.04] border-white/10 text-gray-400 hover:border-white/25 hover:text-white"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Result */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${targetDpe}-${totalCost}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="bg-white/[0.04] border border-white/10 rounded-xl px-5 py-4"
        >
          <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">
            Coût estimé
          </p>
          <p className="text-3xl font-black text-white tracking-tight tabular-nums">
            {fmtEur(totalCost)}
          </p>
          <p className="text-sm font-semibold text-blue-400 mt-1 tabular-nums">
            ≈ {fmtEur(perSqm)} / m²
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Isolation, chauffage et fenêtres inclus
          </p>
        </motion.div>
      </AnimatePresence>

    </div>
  );
}
