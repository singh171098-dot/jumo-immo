"use client";
import { useState, useEffect } from "react";
import { calculateFairScore } from "../../lib/fairscore";

/* ── FairScore donut gauge ────────────────────────────────────────────────── */
function FairScoreGauge({ score }: { score: number }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const r = 38;
  const circ = 2 * Math.PI * r;
  const offset = mounted ? circ - (score / 100) * circ : circ;
  const color = score >= 80 ? "#10B981" : score >= 60 ? "#F59E0B" : "#EF4444";

  return (
    <svg width={96} height={96} viewBox="0 0 96 96" aria-label={`FairScore ${score}`}>
      <circle cx={48} cy={48} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={7} />
      <circle
        cx={48} cy={48} r={r} fill="none"
        stroke={color} strokeWidth={7} strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset}
        transform="rotate(-90 48 48)"
        style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.16,1,0.3,1) 0.3s" }}
      />
      <text x={48} y={46} textAnchor="middle" fill="white" fontSize={22} fontWeight={800} fontFamily="system-ui">{score}</text>
      <text x={48} y={61} textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize={8} fontFamily="system-ui" letterSpacing={1.5}>SCORE</text>
    </svg>
  );
}

export interface FairScoreBadgeProps {
  /** Asking price of the listing, in €/m². */
  listingPricePerM2: number;
  /** Local DVF average price per m², or null while it hasn't been resolved yet. */
  dvfAvgPricePerM2: number | null;
}

export default function FairScoreBadge({ listingPricePerM2, dvfAvgPricePerM2 }: FairScoreBadgeProps) {
  const score = dvfAvgPricePerM2 !== null
    ? calculateFairScore(listingPricePerM2, dvfAvgPricePerM2)
    : null;

  const scoreLabel = score === null ? "Score en calcul..."
    : score >= 80 ? "Prix juste"
    : score >= 60 ? "À négocier"
    : "Surévalué";

  const scoreColor = score === null ? "text-gray-500"
    : score >= 80 ? "text-emerald-400"
    : score >= 60 ? "text-amber-400"
    : "text-red-400";

  return (
    <div className="flex items-center justify-between mb-5">
      <div>
        <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Analyse DVF</p>
        <p className="text-2xl font-black text-white">{scoreLabel}</p>
        <p className={`text-xs font-semibold mt-0.5 ${scoreColor}`}>
          {score !== null ? `FairScore™ ${score} / 100` : "En attente des données DVF"}
        </p>
      </div>
      {score !== null
        ? <FairScoreGauge score={score} />
        : (
          <div className="w-24 h-24 rounded-full border-2 border-gray-700 flex items-center justify-center">
            <span className="text-gray-600 text-xs font-bold text-center leading-tight">N/A</span>
          </div>
        )
      }
    </div>
  );
}
