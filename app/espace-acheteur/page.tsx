"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Home, FileText, ShieldCheck, KeyRound,
  CheckCircle2, Circle, ChevronRight, Calendar,
} from "lucide-react";
import SRUCountdown from "../../components/SRUCountdown";

/* ── Animation variants ───────────────────────────────────────────────────── */
const fadeUp = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" as const } },
};
const stagger = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.09 } },
};

/* ── Transaction steps ────────────────────────────────────────────────────── */
const STEPS = [
  {
    icon: FileText,
    label: "Offre d'achat",
    desc:  "Envoyée · Réponde sous 48h",
    key:   "offer",
  },
  {
    icon: ShieldCheck,
    label: "Compromis",
    desc:  "Délai SRU 10 jours",
    key:   "compromis",
  },
  {
    icon: KeyRound,
    label: "Acte authentique",
    desc:  "Signature notaire",
    key:   "acte",
  },
] as const;

/* ── Offer details (mock) ─────────────────────────────────────────────────── */
const OFFER = {
  title:     "Appartement 3 pièces · Paris 11e",
  price:     "418 000 €",
  validity:  "8 jours",
  fairScore: "82 / 100",
  seller:    "Thomas Lefèvre",
  status:    "En attente vendeur",
};

/* ── Documents ────────────────────────────────────────────────────────────── */
const DOCS = [
  "Pièce d'identité",
  "Justificatif d'état civil",
  "Fiche d'état civil",
  "Preuve de financement",
];

/* ── Page ─────────────────────────────────────────────────────────────────── */
export default function EspaceAcheteur() {
  const [compromisDate, setCompromisDate] = useState("");

  /* Active step derived from whether a compromis date has been entered */
  const currentStep = compromisDate ? 1 : 0;

  return (
    <motion.div
      className="max-w-4xl mx-auto space-y-6"
      initial="hidden"
      animate="visible"
      variants={stagger}
    >

      {/* ── Header ── */}
      <motion.div variants={fadeUp}>
        <h1 className="text-3xl font-black text-white tracking-tight">Bonjour, Marie</h1>
        <p className="text-gray-500 mt-1 font-medium text-sm">
          Suivi de votre acquisition · Protection légale garantie
        </p>
      </motion.div>

      {/* ══════════════════════════════════
          ACTIVE OFFER SUMMARY CARD
      ══════════════════════════════════ */}
      <motion.div
        variants={fadeUp}
        className="rounded-2xl bg-white/[0.04] backdrop-blur-sm border border-white/10 p-6 shadow-xl shadow-black/20"
      >
        <div className="flex items-center gap-4 mb-5">
          <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
            <Home size={20} className="text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-0.5">
              Offre en cours
            </p>
            <p className="text-white font-black text-base leading-tight">{OFFER.title}</p>
          </div>
          <span className="shrink-0 text-xs font-bold px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full">
            {OFFER.status}
          </span>
        </div>

        {/* Metrics row */}
        <div className="grid grid-cols-3 gap-4 pt-5 border-t border-white/[0.06]">
          {[
            { label: "Prix proposé", value: OFFER.price     },
            { label: "Validité",     value: OFFER.validity  },
            { label: "FairScore™",   value: OFFER.fairScore },
          ].map(item => (
            <div key={item.label}>
              <p className="text-[10px] text-gray-600 uppercase tracking-widest font-bold mb-1">
                {item.label}
              </p>
              <p className="text-xl font-black text-white">{item.value}</p>
            </div>
          ))}
        </div>

        {/* Seller row */}
        <div className="mt-4 pt-4 border-t border-white/[0.06] flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-[10px] font-black shrink-0">
            {OFFER.seller.charAt(0)}
          </div>
          <p className="text-gray-500 text-xs">
            Vendeur : <span className="text-gray-300 font-semibold">{OFFER.seller}</span>
          </p>
        </div>
      </motion.div>

      {/* ══════════════════════════════════
          TRANSACTION TIMELINE — stepper
      ══════════════════════════════════ */}
      <motion.div
        variants={fadeUp}
        className="rounded-2xl bg-white/[0.04] backdrop-blur-sm border border-white/10 p-6"
      >
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-6">
          Parcours d'acquisition
        </p>

        {/* Desktop horizontal stepper */}
        <div className="hidden sm:flex items-start gap-0">
          {STEPS.map((step, i) => {
            const Icon    = step.icon;
            const isDone  = i < currentStep;
            const isActive = i === currentStep;
            const isLast  = i === STEPS.length - 1;

            return (
              <div key={step.key} className="flex items-start flex-1">
                {/* Step node + content */}
                <div className="flex flex-col items-center flex-shrink-0" style={{ minWidth: 0, width: "100%" }}>
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: i * 0.12, duration: 0.35 }}
                    className={[
                      "w-12 h-12 rounded-2xl flex items-center justify-center border-2 mb-3 transition-all duration-500",
                      isDone   ? "bg-emerald-500/15 border-emerald-500/40"
                      : isActive ? "bg-blue-500/15 border-blue-500/40 shadow-lg shadow-blue-500/20"
                      :            "bg-white/[0.03] border-white/[0.08]",
                    ].join(" ")}
                  >
                    {isDone
                      ? <CheckCircle2 size={22} className="text-emerald-400" />
                      : <Icon size={20} className={isActive ? "text-blue-400" : "text-gray-600"} />
                    }
                  </motion.div>

                  <p className={`text-xs font-black text-center leading-snug px-2 ${
                    isDone ? "text-emerald-400" : isActive ? "text-white" : "text-gray-600"
                  }`}>
                    {step.label}
                  </p>
                  <p className={`text-[10px] text-center mt-0.5 px-2 leading-snug ${
                    isDone ? "text-emerald-600" : isActive ? "text-gray-400" : "text-gray-700"
                  }`}>
                    {step.desc}
                  </p>

                  {isActive && (
                    <span className="mt-2 text-[9px] font-bold px-2.5 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full animate-pulse">
                      En cours
                    </span>
                  )}
                  {isDone && (
                    <span className="mt-2 text-[9px] font-bold px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full">
                      Fait ✓
                    </span>
                  )}
                </div>

                {/* Connector line */}
                {!isLast && (
                  <div className="flex-1 flex items-start pt-6 px-1">
                    <div className="w-full h-px bg-white/[0.08] relative overflow-hidden">
                      {isDone && (
                        <motion.div
                          className="absolute inset-y-0 left-0 bg-emerald-500/40"
                          initial={{ width: "0%" }}
                          animate={{ width: "100%" }}
                          transition={{ duration: 0.6, delay: 0.3 }}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Mobile vertical stepper */}
        <div className="sm:hidden space-y-3">
          {STEPS.map((step, i) => {
            const Icon     = step.icon;
            const isDone   = i < currentStep;
            const isActive = i === currentStep;
            return (
              <div key={step.key} className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                isDone   ? "bg-emerald-500/10 border-emerald-500/20"
                : isActive ? "bg-blue-500/10 border-blue-500/20"
                :            "bg-white/[0.02] border-white/[0.06]"
              }`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  isDone ? "bg-emerald-500/15" : isActive ? "bg-blue-500/15" : "bg-white/[0.04]"
                }`}>
                  {isDone
                    ? <CheckCircle2 size={18} className="text-emerald-400" />
                    : <Icon size={18} className={isActive ? "text-blue-400" : "text-gray-600"} />
                  }
                </div>
                <div className="flex-1">
                  <p className={`font-bold text-sm ${
                    isDone ? "text-emerald-400" : isActive ? "text-white" : "text-gray-600"
                  }`}>{step.label}</p>
                  <p className={`text-xs mt-0.5 ${
                    isDone ? "text-emerald-600" : isActive ? "text-gray-400" : "text-gray-700"
                  }`}>{step.desc}</p>
                </div>
                {isActive && (
                  <span className="text-[9px] font-bold px-2 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full animate-pulse shrink-0">
                    En cours
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* ══════════════════════════════════
          SRU COUNTDOWN
      ══════════════════════════════════ */}
      <motion.div variants={fadeUp} className="space-y-4">

        {/* Date input card */}
        <div className="rounded-2xl bg-white/[0.04] backdrop-blur-sm border border-white/10 px-6 py-5">
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">
            Date de signature du compromis
          </label>
          <input
            type="date"
            value={compromisDate}
            max={new Date().toISOString().split("T")[0]}
            onChange={e => setCompromisDate(e.target.value)}
            className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-4 py-3 text-white font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/40 transition placeholder-gray-600 [color-scheme:dark]"
          />
          {!compromisDate && (
            <p className="text-[10px] text-gray-700 mt-2">
              Renseignez la date pour démarrer le chronomètre légal SRU.
            </p>
          )}
        </div>

        {/* Live countdown — only shown once date is set */}
        {compromisDate && <SRUCountdown startDate={compromisDate} />}
      </motion.div>

      {/* ══════════════════════════════════
          DOCUMENTS
      ══════════════════════════════════ */}
      <motion.div
        variants={fadeUp}
        className="rounded-2xl bg-white/[0.04] backdrop-blur-sm border border-white/10 p-6"
      >
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">
          Documents acheteur
        </p>
        <div className="space-y-2">
          {DOCS.map((label, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.06]"
            >
              <Circle size={14} className="text-gray-700 shrink-0" />
              <span className="text-sm text-gray-500 font-medium flex-1">{label}</span>
              <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                À téléverser
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ══════════════════════════════════
          CTA — full assistant
      ══════════════════════════════════ */}
      <motion.div variants={fadeUp} className="text-center pb-6">
        <p className="text-sm text-gray-600 mb-3">
          Gérez l'offre, les documents et l'acte via l'assistant complet
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-[#1E3A8A] to-blue-600 hover:from-blue-800 hover:to-blue-500 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-blue-900/40 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
        >
          <Calendar size={16} />
          Accéder à l'assistant d'achat
          <ChevronRight size={15} />
        </Link>
      </motion.div>

    </motion.div>
  );
}
