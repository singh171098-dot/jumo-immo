"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Clock, AlertTriangle, ShieldCheck } from "lucide-react";

const SRU_DURATION_MS = 10 * 24 * 60 * 60 * 1000;

function splitMs(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return {
    d: Math.floor(s / 86400),
    h: Math.floor((s % 86400) / 3600),
    m: Math.floor((s % 3600) / 60),
    s: s % 60,
    expired: ms <= 0,
  };
}

interface SRUCountdownProps {
  /** ISO date string ("YYYY-MM-DD") — date the compromis was signed */
  startDate: string;
}

type Accent = "green" | "orange" | "red";

const PALETTE: Record<Accent, {
  cardBorder: string; badge: string;
  cellBg: string; cellText: string;
  bar: string; icon: string;
  alertBg: string; alertText: string;
}> = {
  green: {
    cardBorder: "border-white/10",
    badge:      "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
    cellBg:     "bg-emerald-500/10 border-emerald-500/20",
    cellText:   "text-emerald-300",
    bar:        "bg-emerald-500",
    icon:       "text-emerald-400",
    alertBg:    "",
    alertText:  "",
  },
  orange: {
    cardBorder: "border-amber-500/20",
    badge:      "bg-amber-500/10 border-amber-500/20 text-amber-400",
    cellBg:     "bg-amber-500/10 border-amber-500/20",
    cellText:   "text-amber-300",
    bar:        "bg-amber-500",
    icon:       "text-amber-400",
    alertBg:    "bg-amber-500/10 border-amber-500/20",
    alertText:  "text-amber-300",
  },
  red: {
    cardBorder: "border-red-500/20",
    badge:      "bg-red-500/10 border-red-500/20 text-red-400",
    cellBg:     "bg-red-500/10 border-red-500/20",
    cellText:   "text-red-300",
    bar:        "bg-red-500",
    icon:       "text-red-400",
    alertBg:    "bg-red-500/10 border-red-500/20",
    alertText:  "text-red-300",
  },
};

export default function SRUCountdown({ startDate }: SRUCountdownProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const deadline    = new Date(startDate).getTime() + SRU_DURATION_MS;
  const remainingMs = Math.max(0, deadline - now);
  const t           = splitMs(remainingMs);

  /* Bar fills as time elapses (0% at start → 100% at expiry) */
  const elapsedPct = Math.min(100, ((SRU_DURATION_MS - remainingMs) / SRU_DURATION_MS) * 100);

  const isUrgent  = !t.expired && remainingMs < 2 * 24 * 60 * 60 * 1000;
  const isWarning = !t.expired && remainingMs < 5 * 24 * 60 * 60 * 1000;
  const accent: Accent = t.expired || isUrgent ? "red" : isWarning ? "orange" : "green";
  const p = PALETTE[accent];

  const statusLabel = t.expired ? "EXPIRÉ"
    : isUrgent  ? "CRITIQUE"
    : isWarning ? "ATTENTION"
    :             "EN COURS";

  return (
    <div className={`rounded-2xl bg-white/[0.04] backdrop-blur-sm border p-6 space-y-5 transition-colors duration-700 ${p.cardBorder}`}>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 ${p.badge}`}>
            <Clock size={16} className={p.icon} />
          </div>
          <div>
            <p className="text-white font-black text-sm">Délai de rétractation SRU</p>
            <p className="text-gray-500 text-xs">Art. L271-1 CCH · 10 jours après le compromis</p>
          </div>
        </div>
        <span className={`shrink-0 text-[9px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-widest ${p.badge}`}>
          {statusLabel}
        </span>
      </div>

      {t.expired ? (
        /* Expired */
        <div className={`flex items-start gap-3 rounded-xl px-4 py-4 border ${p.alertBg}`}>
          <AlertTriangle size={17} className={`shrink-0 mt-0.5 ${p.icon}`} />
          <div>
            <p className={`font-black text-sm ${p.cellText}`}>Délai de rétractation expiré</p>
            <p className={`text-xs mt-1 leading-relaxed opacity-70 ${p.alertText}`}>
              Le délai SRU est écoulé. Vous êtes légalement engagé dans cette transaction. Consultez votre notaire.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Countdown cells */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { v: t.d, l: "Jours"  },
              { v: t.h, l: "Heures" },
              { v: t.m, l: "Min"    },
              { v: t.s, l: "Sec"    },
            ].map(({ v, l }) => (
              <div key={l} className="flex flex-col items-center gap-1.5">
                <div className={`w-full py-3.5 rounded-2xl border flex items-center justify-center transition-colors duration-700 ${p.cellBg}`}>
                  <span className={`text-3xl font-black tabular-nums ${p.cellText}`}>
                    {String(v).padStart(2, "0")}
                  </span>
                </div>
                <span className="text-[9px] text-gray-600 uppercase tracking-widest font-bold">{l}</span>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div>
            <div className="flex justify-between text-[10px] text-gray-600 mb-2 font-medium">
              <span>Début du délai</span>
              <span>{t.d}j {t.h}h restants</span>
            </div>
            <div className="w-full h-2.5 bg-white/[0.06] rounded-full overflow-hidden">
              <motion.div
                className={`h-2.5 rounded-full ${p.bar}`}
                initial={{ width: "0%" }}
                animate={{ width: `${elapsedPct}%` }}
                transition={{ duration: 1.2, ease: "easeOut" }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-gray-700 mt-1.5">
              <span>
                {new Date(startDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
              </span>
              <span>
                {new Date(deadline).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
              </span>
            </div>
          </div>

          {/* Urgency alerts */}
          {(isUrgent || isWarning) && (
            <div className={`flex items-start gap-2.5 rounded-xl px-4 py-3 border ${p.alertBg}`}>
              <AlertTriangle size={14} className={`shrink-0 mt-0.5 ${p.icon}`} />
              <p className={`text-xs leading-relaxed font-medium ${p.alertText}`}>
                {isUrgent
                  ? "Délai critique — moins de 48h. Envoyez votre rétractation par lettre recommandée (LRAR) immédiatement si vous souhaitez vous désister."
                  : "Moins de 5 jours restants. Vérifiez que vous souhaitez maintenir votre offre avant l'expiration du délai légal."}
              </p>
            </div>
          )}

          {/* Legal reassurance (safe state only) */}
          {!isUrgent && !isWarning && (
            <div className="flex items-center gap-2 text-[11px] text-gray-600">
              <ShieldCheck size={12} className="text-emerald-500 shrink-0" />
              <span>Rétractation sans frais possible par LRAR avant l'échéance</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
