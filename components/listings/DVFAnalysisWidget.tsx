"use client";
import { useEffect, useMemo, useState } from "react";
import { MapPin, AlertCircle, SearchX, BadgeCheck } from "lucide-react";
import { extractPostalCode } from "../../lib/utils/postalCode";
import { formatPricePerM2 } from "../../lib/utils/formatters";
import FairScoreBadge from "./FairScoreBadge";
import type { DVFEstimationData } from "../../lib/dvf";

export interface DVFAnalysisWidgetProps {
  /** Total asking price of the listing, in €. */
  listingPrice: number;
  /** Living surface of the listing, in m². */
  listingSurface: number;
  /** Raw city string as stored on the listing, e.g. "Paris 19ème". */
  listingCity: string;
  /** Postal code if already known — used as-is when it's a valid 5-digit code. */
  listingPostalCode?: string;
}

type FetchState =
  | { status: "error"; postalCode: string }
  | { status: "success"; data: DVFEstimationData; postalCode: string };

const CARD_CLASS = "rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/10 p-6";

function FallbackCard({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <div className={`${CARD_CLASS} flex flex-col items-center gap-2.5 py-8 text-center`}>
      {icon}
      <p className="text-sm text-gray-400">{message}</p>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className={CARD_CLASS}>
      <div className="space-y-3 animate-pulse">
        <div className="h-5 bg-white/10 rounded w-2/3" />
        <div className="h-5 bg-white/10 rounded w-full" />
        <div className="h-5 bg-white/10 rounded w-1/2" />
      </div>
    </div>
  );
}

export default function DVFAnalysisWidget({
  listingPrice,
  listingSurface,
  listingCity,
  listingPostalCode,
}: DVFAnalysisWidgetProps) {
  const hasSurface = listingSurface > 0;

  const resolvedPostalCode = useMemo(() => {
    if (listingPostalCode && /^\d{5}$/.test(listingPostalCode)) return listingPostalCode;
    return extractPostalCode(listingCity);
  }, [listingPostalCode, listingCity]);

  const [state, setState] = useState<FetchState | null>(null);

  useEffect(() => {
    if (!hasSurface || !resolvedPostalCode) return;

    let cancelled = false;

    fetch(`/api/dvf?postalCode=${resolvedPostalCode}`)
      .then(res => {
        if (!res.ok) throw new Error("DVF request failed");
        return res.json() as Promise<DVFEstimationData>;
      })
      .then(data => {
        if (!cancelled) setState({ status: "success", data, postalCode: resolvedPostalCode });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error", postalCode: resolvedPostalCode });
      });

    return () => { cancelled = true; };
  }, [hasSurface, resolvedPostalCode]);

  // Treat results from a previous postal code as stale — render the loading
  // state until the in-flight fetch for the current postal code resolves.
  const current = state && state.postalCode === resolvedPostalCode ? state : null;

  if (!hasSurface) {
    return <FallbackCard icon={<AlertCircle size={22} className="text-gray-500" />} message="Surface manquante pour l'analyse" />;
  }

  if (!resolvedPostalCode) {
    return <FallbackCard icon={<MapPin size={22} className="text-gray-500" />} message="Localisation insuffisante pour l'analyse DVF" />;
  }

  if (!current) {
    return <SkeletonCard />;
  }

  if (current.status === "error") {
    return <FallbackCard icon={<AlertCircle size={22} className="text-red-400" />} message="Analyse temporairement indisponible" />;
  }

  const { data } = current;
  if (!data.hasData || data.averagePricePerM2 === null) {
    return <FallbackCard icon={<SearchX size={22} className="text-gray-500" />} message="Données en cours d'acquisition pour ce secteur" />;
  }

  const listingPricePerM2 = Math.round(listingPrice / listingSurface);
  const dvfAvgPricePerM2 = data.averagePricePerM2;
  const difference = listingPricePerM2 - dvfAvgPricePerM2;
  const percentDiff = Math.round((difference / dvfAvgPricePerM2) * 100);

  const verdict = percentDiff > 10
    ? { bg: "bg-red-500/10 border border-red-500/20", text: "text-red-300", label: `Au-dessus du marché +${percentDiff}%` }
    : percentDiff >= -5
    ? { bg: "bg-amber-500/10 border border-amber-500/20", text: "text-amber-300", label: "Dans la moyenne du marché" }
    : { bg: "bg-emerald-500/10 border border-emerald-500/20", text: "text-emerald-300", label: `Bonne affaire −${Math.abs(percentDiff)}%` };

  const diffLabel = difference > 0
    ? `+${formatPricePerM2(difference)} au-dessus du marché`
    : difference < 0
    ? `−${formatPricePerM2(Math.abs(difference))} en dessous du marché`
    : "Aligné avec le marché";
  const diffColor = difference > 0 ? "text-red-400" : difference < 0 ? "text-emerald-400" : "text-gray-400";

  return (
    <div className={CARD_CLASS}>
      <FairScoreBadge listingPricePerM2={listingPricePerM2} dvfAvgPricePerM2={dvfAvgPricePerM2} />

      <div className="space-y-3 pt-4 border-t border-white/10">
        {/* Section A — Market verdict */}
        <div className={`rounded-xl px-3.5 py-3 text-xs font-bold ${verdict.bg} ${verdict.text}`}>
          {verdict.label}
        </div>

        {/* Section B — Price comparison */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Ce bien</p>
            <p className="text-lg font-bold text-white">{formatPricePerM2(listingPricePerM2)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Moyenne DVF locale</p>
            <p className="text-lg font-bold text-blue-400">{formatPricePerM2(dvfAvgPricePerM2)}</p>
          </div>
        </div>
        <p className={`text-xs font-semibold ${diffColor}`}>{diffLabel}</p>

        {/* Section C — Transaction count */}
        <p className="text-xs text-gray-500">
          Basé sur {new Intl.NumberFormat("fr-FR").format(data.transactionCount)} transactions réelles dans ce secteur
        </p>

        {/* Section D — Data source badge */}
        <span className="inline-flex items-center gap-1.5 text-[9px] font-bold px-2.5 py-1 rounded-full border bg-emerald-500/10 border-emerald-500/20 text-emerald-400 uppercase tracking-wide">
          <BadgeCheck size={11} /> Source : Données DVF officielles — Ministère des Finances
        </span>
      </div>
    </div>
  );
}
