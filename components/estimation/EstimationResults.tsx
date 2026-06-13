"use client";
import { useEffect, useState } from "react";
import { MapPin, Loader2, AlertCircle, SearchX } from "lucide-react";
import PriceTrendChart from "./PriceTrendChart";
import ComparablesTable from "./ComparablesTable";
import NegotiationAdvisor from "./NegotiationAdvisor";
import EstimationLeadGate from "./EstimationLeadGate";
import type { EstimationQuery, DVFEstimationData } from "./types";

interface EstimationResultsProps {
  query: EstimationQuery;
}

type FetchState =
  | { status: "error"; postalCode: string; city?: string }
  | { status: "success"; data: DVFEstimationData; postalCode: string; city?: string };

const CARD_CLASS = "rounded-2xl bg-white/[0.04] backdrop-blur-sm border border-white/10 p-8 flex flex-col items-center gap-3 text-center";

function LoadingState() {
  return (
    <div className={CARD_CLASS}>
      <Loader2 size={22} className="text-blue-400 animate-spin" />
      <p className="text-sm text-gray-400">Analyse des données DVF en cours…</p>
    </div>
  );
}

function ErrorState() {
  return (
    <div className={CARD_CLASS}>
      <AlertCircle size={22} className="text-red-400" />
      <p className="text-sm text-gray-400">Erreur lors du chargement des données. Veuillez réessayer.</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className={CARD_CLASS}>
      <SearchX size={22} className="text-gray-500" />
      <p className="text-sm text-gray-400">Données en cours d&apos;acquisition pour ce secteur.</p>
    </div>
  );
}

interface ResultsBodyProps {
  query: EstimationQuery;
  hasValidPostalCode: boolean;
  current: FetchState | null;
}

function ResultsBody({ query, hasValidPostalCode, current }: ResultsBodyProps) {
  if (!hasValidPostalCode) return <EmptyState />;
  if (!current) return <LoadingState />;
  if (current.status === "error") return <ErrorState />;

  const { data } = current;
  if (!data.hasData || data.averagePricePerM2 === null) return <EmptyState />;

  const displayCity = data.city ?? query.city;

  return (
    <EstimationLeadGate
      city={query.city}
      postalCode={query.postalCode}
      askingPrice={query.askingPrice}
      surface={query.surface}
    >
      <div className="space-y-5">
        <div className="grid lg:grid-cols-2 gap-5">
          <PriceTrendChart city={displayCity} trend={data.trend} />
          <NegotiationAdvisor
            askingPrice={query.askingPrice}
            surface={query.surface}
            localAvgPerSqm={data.averagePricePerM2}
            city={displayCity}
          />
        </div>
        <ComparablesTable city={displayCity} postalCode={query.postalCode} comparables={data.comparables} />
      </div>
    </EstimationLeadGate>
  );
}

export default function EstimationResults({ query }: EstimationResultsProps) {
  const hasValidPostalCode = /^\d{5}$/.test(query.postalCode);
  const [state, setState] = useState<FetchState | null>(null);

  useEffect(() => {
    if (!hasValidPostalCode) return;

    let cancelled = false;

    const params = new URLSearchParams({ postalCode: query.postalCode });
    if (query.city) params.set("city", query.city);

    fetch(`/api/dvf?${params.toString()}`)
      .then(res => {
        if (!res.ok) throw new Error("DVF request failed");
        return res.json() as Promise<DVFEstimationData>;
      })
      .then(data => {
        if (!cancelled) setState({ status: "success", data, postalCode: query.postalCode, city: query.city });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error", postalCode: query.postalCode, city: query.city });
      });

    return () => {
      cancelled = true;
    };
  }, [hasValidPostalCode, query.postalCode, query.city]);

  // Treat results from a previous query as stale — render the loading state
  // until the in-flight fetch for the current query resolves.
  const current = state && state.postalCode === query.postalCode && state.city === query.city ? state : null;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <MapPin size={15} style={{ color: "var(--c-gold)" }} className="shrink-0" />
        <p className="text-sm" style={{ color: "var(--c-text-muted)" }}>{query.label}</p>
      </div>

      <ResultsBody query={query} hasValidPostalCode={hasValidPostalCode} current={current} />
    </div>
  );
}
