"use client";

import { useState, useMemo } from "react";

/* ── Props ───────────────────────────────────────────────────────────────── */
interface Props {
  price: number;
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */
const fmtEur = (n: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);

/* ── Component ───────────────────────────────────────────────────────────── */
export default function MortgageSimulator({ price }: Props) {
  /* Default apport = 10 % of price, rounded to nearest 1 000 € */
  const [apport, setApport] = useState(() => Math.round(price * 0.1 / 1_000) * 1_000);
  const [taux,   setTaux]   = useState(3.8);
  const [duree,  setDuree]  = useState(25);

  const { mensualite, montantEmprunte, totalRepaid, interestPaid } = useMemo(() => {
    const P = Math.max(0, price - apport);
    const n = duree * 12;

    let raw: number;
    if (P === 0) {
      raw = 0;
    } else if (taux === 0) {
      raw = P / n;
    } else {
      const r = taux / 100 / 12;
      raw = (P * r) / (1 - Math.pow(1 + r, -n));
    }

    const totalRaw = Math.round(raw * n);
    return {
      mensualite:      Math.round(raw),
      montantEmprunte: Math.round(P),
      totalRepaid:     totalRaw,
      interestPaid:    Math.max(0, totalRaw - Math.round(P)),
    };
  }, [price, apport, taux, duree]);

  const apportPct = price > 0 ? Math.round((apport / price) * 100) : 0;
  const maxApport = Math.round(price * 0.5);

  /* ── Render ─────────────────────────────────────────────────────────────── */
  return (
    <div className="rounded-2xl bg-white/[0.04] backdrop-blur-sm border border-white/10 overflow-hidden">

      {/* Header */}
      <div className="px-6 pt-5 pb-4 border-b border-white/[0.07]">
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">
          Financement
        </p>
        <p className="text-sm font-bold text-white">Simulateur de Crédit Immobilier</p>
        <p className="text-xs text-gray-500 mt-0.5">
          Prix de vente {fmtEur(price)} · Estimation indicative
        </p>
      </div>

      {/* Monthly payment — big display */}
      <div className="px-6 py-6 text-center border-b border-white/[0.07]">
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">
          Mensualité estimée
        </p>
        <p className="text-5xl font-black text-white tabular-nums tracking-tighter leading-none">
          {fmtEur(mensualite)}
        </p>
        <p className="text-sm text-blue-400 font-semibold mt-2">/ mois</p>
      </div>

      {/* Sliders */}
      <div className="px-6 py-5 space-y-6 border-b border-white/[0.07]">

        {/* Apport */}
        <div>
          <div className="flex justify-between items-baseline mb-2.5">
            <label className="text-xs font-semibold text-gray-400">Apport personnel</label>
            <div className="text-right leading-tight">
              <span className="text-sm font-black text-white tabular-nums">{fmtEur(apport)}</span>
              <span className="text-[10px] text-gray-500 ml-1.5">{apportPct}%</span>
            </div>
          </div>
          <input
            type="range" min={0} max={maxApport} step={1_000} value={apport}
            onChange={e => setApport(Number(e.target.value))}
            className="w-full h-1.5 rounded-full accent-blue-500 cursor-pointer bg-white/10"
          />
          <div className="flex justify-between text-[10px] text-gray-600 mt-1.5">
            <span>0 €</span>
            <span>{fmtEur(maxApport)}</span>
          </div>
        </div>

        {/* Taux */}
        <div>
          <div className="flex justify-between items-baseline mb-2.5">
            <label className="text-xs font-semibold text-gray-400">Taux d'intérêt</label>
            <span className="text-sm font-black text-white tabular-nums">{taux.toFixed(1)} %</span>
          </div>
          <input
            type="range" min={1} max={8} step={0.1} value={taux}
            onChange={e => setTaux(Number(e.target.value))}
            className="w-full h-1.5 rounded-full accent-blue-500 cursor-pointer bg-white/10"
          />
          <div className="flex justify-between text-[10px] text-gray-600 mt-1.5">
            <span>1 %</span>
            <span>8 %</span>
          </div>
        </div>

        {/* Durée */}
        <div>
          <div className="flex justify-between items-baseline mb-2.5">
            <label className="text-xs font-semibold text-gray-400">Durée du prêt</label>
            <span className="text-sm font-black text-white tabular-nums">{duree} ans</span>
          </div>
          <input
            type="range" min={5} max={30} step={1} value={duree}
            onChange={e => setDuree(Number(e.target.value))}
            className="w-full h-1.5 rounded-full accent-blue-500 cursor-pointer bg-white/10"
          />
          <div className="flex justify-between text-[10px] text-gray-600 mt-1.5">
            <span>5 ans</span>
            <span>30 ans</span>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="px-6 py-4 space-y-2.5">
        {(
          [
            { label: "Capital emprunté",  value: fmtEur(montantEmprunte), cls: "text-white"     },
            { label: "Total remboursé",   value: fmtEur(totalRepaid),     cls: "text-white"     },
            { label: "Intérêts payés",    value: fmtEur(interestPaid),    cls: "text-amber-400" },
          ] as const
        ).map(row => (
          <div key={row.label} className="flex justify-between items-center text-sm">
            <span className="text-gray-400">{row.label}</span>
            <span className={`font-bold tabular-nums ${row.cls}`}>{row.value}</span>
          </div>
        ))}
        <p className="text-[10px] text-gray-600 pt-1 leading-relaxed">
          Simulation indicative · Taux hors assurance · Mensualité constante (amortissable)
        </p>
      </div>

    </div>
  );
}
