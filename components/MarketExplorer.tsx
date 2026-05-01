"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, TrendingUp, TrendingDown, Building2, Home } from "lucide-react";

/* ── Types ───────────────────────────────────────────────────────────────── */
interface MarketData {
  city: string;
  apartmentPricePerSqm: number;
  housePricePerSqm: number;
  yearlyTrend: number;
  rentPerSqm: number;
}

/* ── Deterministic mock data ─────────────────────────────────────────────── */
const MAJOR_CITIES = [
  "lyon", "marseille", "bordeaux", "nice", "toulouse", "nantes",
  "montpellier", "strasbourg", "lille", "rennes", "grenoble",
  "dijon", "toulon", "aix-en-provence", "reims",
];

function charCodeSum(s: string): number {
  return Array.from(s).reduce((acc, c) => acc + c.charCodeAt(0), 0);
}

function fetchMarketData(city: string): MarketData {
  const key = city
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();

  const sum = charCodeSum(key);

  // Deterministic pseudo-random in [0, 1] using distinct seeds
  const t = (seed: number) => (Math.sin(sum * seed + key.length * 17) + 1) / 2;

  // Tier detection
  const isParis  = key.includes("paris");
  const isMajor  = !isParis && MAJOR_CITIES.some(m => key.includes(m));
  const isMedium = !isParis && !isMajor && key.replace(/\s/g, "").length >= 7;

  type Range = [number, number];
  let aptRange:   Range;
  let houseRange: Range;
  let rentRange:  Range;

  if (isParis) {
    aptRange   = [9_000, 11_000];
    houseRange = [8_500, 10_500];
    rentRange  = [30, 38];
  } else if (isMajor) {
    aptRange   = [4_200, 6_800];
    houseRange = [3_000,  5_200];
    rentRange  = [15, 26];
  } else if (isMedium) {
    aptRange   = [2_500,  4_200];
    houseRange = [2_000,  3_600];
    rentRange  = [11, 18];
  } else {
    aptRange   = [1_400,  2_800];
    houseRange = [1_100,  2_400];
    rentRange  = [8, 14];
  }

  const lerp = (r: Range, seed: number) =>
    Math.round(r[0] + t(seed) * (r[1] - r[0]));

  // Trend: [-3 %, +6 %]
  const yearlyTrend = Math.round((-3 + t(234.5) * 9) * 10) / 10;

  return {
    city:                 city.trim(),
    apartmentPricePerSqm: lerp(aptRange,   127.1),
    housePricePerSqm:     lerp(houseRange, 311.7),
    yearlyTrend,
    rentPerSqm:           lerp(rentRange,  513.9),
  };
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */
const fmtPrice = (n: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency", currency: "EUR", maximumFractionDigits: 0,
  }).format(n);

// Normalisation ceilings for bar chart
const APT_MAX   = 15_000;
const HOUSE_MAX = 12_000;
const RENT_MAX  = 40;

/* ── Component ───────────────────────────────────────────────────────────── */
export default function MarketExplorer() {
  const [query, setQuery] = useState("");
  const [data,  setData]  = useState<MarketData | null>(null);

  function handleSearch() {
    const q = query.trim();
    if (!q) return;
    setData(fetchMarketData(q));
  }

  return (
    <div className="space-y-8">

      {/* ── Search bar ── */}
      <div className="flex items-center gap-3 bg-white/[0.05] backdrop-blur-xl border border-white/10 rounded-2xl px-5 py-4 focus-within:border-blue-500/50 transition-colors duration-200">
        <Search size={20} className="text-gray-500 shrink-0" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") handleSearch(); }}
          placeholder="Rechercher une ville (Paris, Lyon, Bordeaux...)"
          className="flex-1 bg-transparent text-white placeholder-gray-500 text-base font-medium outline-none"
        />
        <button
          onClick={handleSearch}
          disabled={!query.trim()}
          className="shrink-0 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-colors duration-200"
        >
          Analyser
        </button>
      </div>

      {/* ── Results ── */}
      <AnimatePresence mode="wait">
        {data && (
          <motion.div
            key={data.city}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.38, ease: "easeOut" }}
            className="space-y-6"
          >
            {/* City header */}
            <div className="text-center pt-2">
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                {data.city}
              </h2>
              <p className="text-gray-400 text-sm mt-1.5">
                Analyse du marché immobilier · Données estimées DVF
              </p>
            </div>

            {/* KPI cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

              {/* Appartement */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.06 }}
                className="rounded-2xl bg-white/[0.05] backdrop-blur-xl border border-white/10 p-5"
              >
                <div className="flex items-center gap-2 mb-4">
                  <Building2 size={14} className="text-blue-400 shrink-0" />
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                    Appartement
                  </p>
                </div>
                <p className="text-[10px] text-gray-500 mb-1">Prix moyen au m²</p>
                <p className="text-2xl font-black text-white tabular-nums tracking-tight">
                  {fmtPrice(data.apartmentPricePerSqm)}
                </p>
              </motion.div>

              {/* Maison */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="rounded-2xl bg-white/[0.05] backdrop-blur-xl border border-white/10 p-5"
              >
                <div className="flex items-center gap-2 mb-4">
                  <Home size={14} className="text-emerald-400 shrink-0" />
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                    Maison
                  </p>
                </div>
                <p className="text-[10px] text-gray-500 mb-1">Prix moyen au m²</p>
                <p className="text-2xl font-black text-white tabular-nums tracking-tight">
                  {fmtPrice(data.housePricePerSqm)}
                </p>
              </motion.div>

              {/* Tendance */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.14 }}
                className={`rounded-2xl backdrop-blur-xl border p-5 ${
                  data.yearlyTrend >= 0
                    ? "bg-emerald-500/10 border-emerald-500/20"
                    : "bg-red-500/10 border-red-500/20"
                }`}
              >
                <div className="flex items-center gap-2 mb-4">
                  {data.yearlyTrend >= 0
                    ? <TrendingUp  size={14} className="text-emerald-400 shrink-0" />
                    : <TrendingDown size={14} className="text-red-400    shrink-0" />
                  }
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                    Tendance
                  </p>
                </div>
                <p className="text-[10px] text-gray-500 mb-1">Évolution 1 an</p>
                <p className={`text-2xl font-black tabular-nums tracking-tight ${
                  data.yearlyTrend >= 0 ? "text-emerald-400" : "text-red-400"
                }`}>
                  {data.yearlyTrend >= 0 ? "+" : ""}{data.yearlyTrend.toFixed(1)} %
                </p>
              </motion.div>
            </div>

            {/* Visual comparison bars */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 }}
              className="rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/10 p-6 space-y-5"
            >
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                Comparaison visuelle
              </p>

              {(
                [
                  {
                    label: "Appartement",
                    value: data.apartmentPricePerSqm,
                    display: fmtPrice(data.apartmentPricePerSqm),
                    unit: "€ / m²",
                    max: APT_MAX,
                    bar: "bg-blue-500",
                  },
                  {
                    label: "Maison",
                    value: data.housePricePerSqm,
                    display: fmtPrice(data.housePricePerSqm),
                    unit: "€ / m²",
                    max: HOUSE_MAX,
                    bar: "bg-emerald-500",
                  },
                  {
                    label: "Loyer moyen",
                    value: data.rentPerSqm,
                    display: String(data.rentPerSqm),
                    unit: "€ / m² / mois",
                    max: RENT_MAX,
                    bar: "bg-amber-400",
                  },
                ] as const
              ).map((row, i) => (
                <div key={row.label}>
                  <div className="flex justify-between items-baseline mb-2">
                    <span className="text-xs font-semibold text-gray-400">{row.label}</span>
                    <span className="text-sm font-black text-white tabular-nums">
                      {row.display}{" "}
                      <span className="text-[10px] text-gray-500 font-normal">{row.unit}</span>
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-white/[0.07] overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${row.bar}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, Math.round((row.value / row.max) * 100))}%` }}
                      transition={{ duration: 0.65, delay: 0.28 + i * 0.1, ease: "easeOut" }}
                    />
                  </div>
                </div>
              ))}
            </motion.div>

            <p className="text-center text-[10px] text-gray-600 leading-relaxed">
              Simulation indicative · Données estimées issues des transactions notariales (DVF) ·
              Non contractuel
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state hint */}
      {!data && (
        <p className="text-center text-sm text-gray-600 py-4">
          Entrez le nom d'une ville pour obtenir une analyse de marché instantanée.
        </p>
      )}
    </div>
  );
}
