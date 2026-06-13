"use client";
import { useEffect, useMemo, useState } from "react";
import { MapPin, AlertCircle, SearchX, BadgeCheck } from "lucide-react";
import { formatPrice, formatPricePerM2 } from "../../lib/utils/formatters";
import FairScoreBadge from "./FairScoreBadge";
import type { DVFEstimationData } from "../../lib/dvf";

export interface DVFAnalysisWidgetProps {
  /** Total asking price of the listing, in €. */
  listingPrice: number;
  /** Living surface of the listing, in m². */
  listingSurface: number;
  /** Raw city string as stored on the listing, e.g. "Paris 19ème arrondissement". */
  listingCity: string;
  /** Postal code if already known — used as-is when it's a valid 5-digit code. */
  listingPostalCode?: string;
  /** Street address, if known — combined with the postal code for the resolver. */
  listingAddress?: string;
}

type FetchState =
  | { status: "error"; locationQuery: string }
  | { status: "success"; data: DVFEstimationData; locationQuery: string };

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
  listingAddress,
}: DVFAnalysisWidgetProps) {
  const hasSurface = listingSurface > 0;

  // Build the richest possible location string for the resolver.
  // Priority: use postalCode directly if valid, otherwise combine fields.
  const locationQuery = useMemo(() => {
    if (listingPostalCode && /^\d{5}$/.test(listingPostalCode.trim())) {
      return listingPostalCode.trim();
    }
    if (listingAddress && listingPostalCode) {
      return `${listingAddress}, ${listingPostalCode}`;
    }
    if (listingPostalCode) {
      return `${listingCity} ${listingPostalCode}`;
    }
    return listingCity;
  }, [listingPostalCode, listingAddress, listingCity]);

  // TEMPORARY debug logs — keep until location resolution is verified in prod.
  console.log('[DVFAnalysisWidget] Props:', {
    listingPrice,
    listingSurface,
    listingCity,
    listingPostalCode,
    listingAddress,
  });
  console.log('[DVFAnalysisWidget] Location query sent to API:', locationQuery);

  const [state, setState] = useState<FetchState | null>(null);

  useEffect(() => {
    if (!hasSurface || !locationQuery.trim()) return;

    let cancelled = false;

    const run = async () => {
      try {
        const response = await fetch(`/api/dvf?location=${encodeURIComponent(locationQuery)}`);
        if (!response.ok) throw new Error("DVF request failed");

        const json = (await response.json()) as DVFEstimationData;
        console.log('[DVFAnalysisWidget] API Response:', {
          hasData: json.hasData,
          resolvedPostalCode: json.postalCode,
          resolverSource: json.resolverSource,
          confidence: json.confidence,
          transactionCount: json.transactionCount,
          averagePricePerM2: json.averagePricePerM2,
        });

        if (!cancelled) setState({ status: "success", data: json, locationQuery });
      } catch {
        if (!cancelled) setState({ status: "error", locationQuery });
      }
    };

    run();
    return () => { cancelled = true; };
  }, [hasSurface, locationQuery]);

  // Treat results from a previous query as stale — render the loading state
  // until the in-flight fetch for the current location query resolves.
  const current = state && state.locationQuery === locationQuery ? state : null;

  if (!hasSurface) {
    return <FallbackCard icon={<AlertCircle size={22} className="text-gray-500" />} message="Surface manquante pour l'analyse" />;
  }

  if (!locationQuery.trim()) {
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
  const diffBg = difference > 0 ? "bg-red-500/10" : difference < 0 ? "bg-emerald-500/10" : "bg-white/5";

  const totalDifference = Math.round(difference * listingSurface);
  const totalDiffLabel = totalDifference > 0
    ? `Soit ${formatPrice(totalDifference)} au-dessus du prix du marché`
    : totalDifference < 0
    ? `Soit ${formatPrice(Math.abs(totalDifference))} d'économie potentielle`
    : null;

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
        <p className="text-xs text-gray-500">
          Prix moyen DVF pour ce secteur : {formatPricePerM2(dvfAvgPricePerM2)}
        </p>

        <div className={`rounded-xl px-3.5 py-2.5 ${diffBg}`}>
          <p className={`text-xs font-semibold ${diffColor}`}>{diffLabel}</p>
          {totalDiffLabel && (
            <p className={`text-sm font-bold mt-0.5 ${diffColor}`}>{totalDiffLabel}</p>
          )}
        </div>

        {/* Section C — Transaction count */}
        <p className="text-xs text-gray-500">
          Basé sur {new Intl.NumberFormat("fr-FR").format(data.transactionCount)} transactions réelles dans ce secteur
        </p>

        {/* Resolver confidence indicators */}
        {data.confidence === "low" && (
          <p className="text-xs text-amber-500 mt-1">
            ⚠ Analyse basée sur les données départementales (code postal non résolu)
          </p>
        )}
        {data.resolverSource === "geo-api" && (
          <p className="text-xs text-gray-400 mt-1">
            Localisation résolue via API Adresse officielle
          </p>
        )}

        {/* Section D — Data source badge */}
        <span className="inline-flex items-center gap-1.5 text-[9px] font-bold px-2.5 py-1 rounded-full border bg-emerald-500/10 border-emerald-500/20 text-emerald-400 uppercase tracking-wide">
          <BadgeCheck size={11} /> Source : Données DVF officielles — Ministère des Finances
        </span>
      </div>
    </div>
  );
}
