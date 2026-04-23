"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ── DPE scale (worst → best) ─────────────────────────────────────────────── */
const DPE_ORDER = ["G", "F", "E", "D", "C", "B", "A"] as const;
type DpeClass = (typeof DPE_ORDER)[number];

const DPE_STYLE: Record<DpeClass, { bg: string; text: string; border: string; label: string }> = {
  G: { bg: "bg-red-800",     text: "text-red-400",    border: "border-red-700",    label: "Très énergivore"   },
  F: { bg: "bg-red-500",     text: "text-red-400",    border: "border-red-500",    label: "Énergivore"        },
  E: { bg: "bg-orange-500",  text: "text-orange-400", border: "border-orange-500", label: "Peu performant"    },
  D: { bg: "bg-orange-400",  text: "text-orange-400", border: "border-orange-400", label: "Assez performant"  },
  C: { bg: "bg-yellow-400",  text: "text-yellow-400", border: "border-yellow-400", label: "Performant"        },
  B: { bg: "bg-lime-500",    text: "text-lime-400",   border: "border-lime-500",   label: "Très performant"   },
  A: { bg: "bg-emerald-500", text: "text-emerald-400",border: "border-emerald-500",label: "Exceptionnel"      },
};

/* ── Renovation cost table (realistic French market 2024) ────────────────── */
interface UpgradeStep {
  from: DpeClass; to: DpeClass;
  minPerSqm: number; maxPerSqm: number;
  label: string;
  aidPct: number; // avg MaPrimeRénov % for this step
}

const STEPS: UpgradeStep[] = [
  { from:"G", to:"F", minPerSqm: 60,  maxPerSqm: 100, label: "Isolation combles & planchers bas",        aidPct: 50 },
  { from:"F", to:"E", minPerSqm: 80,  maxPerSqm: 130, label: "Isolation murs ext. + remplacement fenêtres", aidPct: 45 },
  { from:"E", to:"D", minPerSqm: 100, maxPerSqm: 170, label: "Système de chauffage performant",            aidPct: 35 },
  { from:"D", to:"C", minPerSqm: 130, maxPerSqm: 220, label: "Rénovation énergétique globale",             aidPct: 30 },
  { from:"C", to:"B", minPerSqm: 170, maxPerSqm: 300, label: "PAC air/eau + isolation thermique renforcée",aidPct: 25 },
  { from:"B", to:"A", minPerSqm: 250, maxPerSqm: 450, label: "Rénovation complète BBC/passif",             aidPct: 20 },
];

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

/* ── Component ───────────────────────────────────────────────────────────── */
export default function EnergyUpgradeCalc({ dpe, surface }: { dpe: string; surface: number }) {
  const currentDpe = dpe.toUpperCase() as DpeClass;
  const currentIdx = DPE_ORDER.indexOf(currentDpe);

  const [target, setTarget] = useState<DpeClass | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Only useful when improvement is possible
  if (currentIdx <= 0 || !DPE_ORDER.includes(currentDpe)) return null;

  const availableTargets = DPE_ORDER.slice(currentIdx + 1) as DpeClass[];

  const activeSteps: UpgradeStep[] = target
    ? STEPS.filter(s => {
        const fi = DPE_ORDER.indexOf(s.from);
        const ti = DPE_ORDER.indexOf(s.to);
        const tIdx = DPE_ORDER.indexOf(target);
        return fi >= currentIdx && ti <= tIdx;
      })
    : [];

  const rawMin = activeSteps.reduce((s, st) => s + st.minPerSqm * surface, 0);
  const rawMax = activeSteps.reduce((s, st) => s + st.maxPerSqm * surface, 0);
  const avgAid = activeSteps.length
    ? activeSteps.reduce((s, st) => s + st.aidPct, 0) / activeSteps.length / 100
    : 0;
  const netMin = Math.round(rawMin * (1 - avgAid));
  const netMax = Math.round(rawMax * (1 - avgAid));

  const cur = DPE_STYLE[currentDpe];

  return (
    <div className="rounded-2xl bg-white/[0.04] backdrop-blur-sm border border-white/10 overflow-hidden">

      {/* Header ── */}
      <div className="px-6 pt-5 pb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Calculateur énergétique</p>
          <p className="text-sm font-bold text-white leading-tight">Estimation des travaux de rénovation</p>
          <p className="text-xs text-gray-500 mt-0.5">Données MaPrimeRénov 2024 · {surface} m²</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className={`w-9 h-9 rounded-xl ${cur.bg} flex items-center justify-center text-white font-black text-sm shrink-0`}>
            {currentDpe}
          </div>
          <div>
            <p className="text-[10px] text-gray-500">Actuel</p>
            <p className={`text-xs font-bold leading-tight ${cur.text}`}>{cur.label}</p>
          </div>
        </div>
      </div>

      {/* Target selector ── */}
      <div className="px-6 pb-4">
        <p className="text-xs text-gray-500 mb-2.5">Sélectionner la classe cible :</p>
        <div className="flex gap-2 flex-wrap">
          {availableTargets.map(t => {
            const s = DPE_STYLE[t];
            const active = target === t;
            return (
              <button
                key={t}
                onClick={() => setTarget(active ? null : t)}
                className={`flex flex-col items-center w-11 pt-2 pb-1.5 rounded-xl border-2 transition-all duration-200 active:scale-95 ${
                  active
                    ? `${s.bg} border-transparent shadow-lg`
                    : `bg-white/[0.03] ${s.border} border-opacity-30 hover:border-opacity-70`
                }`}
              >
                <span className={`text-sm font-black ${active ? "text-white" : s.text}`}>{t}</span>
                <span className={`text-[8px] leading-tight text-center mt-0.5 ${active ? "text-white/60" : "text-gray-600"}`}>
                  {s.label.split(" ")[0]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Results ── */}
      <AnimatePresence mode="wait">
        {target && activeSteps.length > 0 && (
          <motion.div
            key={target}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/[0.07] px-6 py-5 space-y-2.5">

              {activeSteps.map((step, i) => (
                <motion.div
                  key={`${step.from}${step.to}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.25 }}
                  className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05]"
                >
                  <div className="flex items-center gap-1 shrink-0 font-black text-xs">
                    <span className={DPE_STYLE[step.from].text}>{step.from}</span>
                    <span className="text-gray-600">→</span>
                    <span className={DPE_STYLE[step.to].text}>{step.to}</span>
                  </div>
                  <p className="flex-1 text-xs text-gray-300 font-medium min-w-0 truncate">{step.label}</p>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-white whitespace-nowrap">
                      {fmt(step.minPerSqm * surface)} – {fmt(step.maxPerSqm * surface)}
                    </p>
                    <p className="text-[10px] text-gray-600">{step.minPerSqm}–{step.maxPerSqm} €/m²</p>
                  </div>
                </motion.div>
              ))}

              {/* Total row ── */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: activeSteps.length * 0.06 + 0.05 }}
                className="border-t border-white/10 pt-3 space-y-1.5"
              >
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">Coût brut estimé</span>
                  <span className="font-bold text-white">{fmt(rawMin)} – {fmt(rawMax)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-sm font-bold text-emerald-400">Après aides</span>
                    <span className="text-[10px] text-gray-500">(MaPrimeRénov ~{Math.round(avgAid * 100)}%)</span>
                  </div>
                  <span className="text-lg font-black text-emerald-400">{fmt(netMin)} – {fmt(netMax)}</span>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: activeSteps.length * 0.06 + 0.1 }}
                className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3.5 py-3"
              >
                <p className="text-xs text-emerald-300 font-medium leading-relaxed">
                  💡 Aides cumulables : MaPrimeRénov, CEE, Éco-PTZ (jusqu'à 50 000 €), TVA 5,5%.
                  Simulation indicative — devis professionnel recommandé.
                </p>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!target && (
        <div className="px-6 pb-5">
          <p className="text-xs text-gray-600 text-center italic">Sélectionnez une classe cible pour estimer les travaux</p>
        </div>
      )}
    </div>
  );
}
