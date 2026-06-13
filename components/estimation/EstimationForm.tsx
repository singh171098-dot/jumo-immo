"use client";
import { useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import AddressAutocomplete, { type MapboxGeocodingFeature } from "./AddressAutocomplete";
import { extractLocationInfo, type EstimationQuery } from "./types";

interface EstimationFormProps {
  onSubmit: (query: EstimationQuery) => void;
}

export default function EstimationForm({ onSubmit }: EstimationFormProps) {
  const [feature, setFeature]         = useState<MapboxGeocodingFeature | null>(null);
  const [surface, setSurface]         = useState("");
  const [askingPrice, setAskingPrice] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!feature) return;

    const { city, postalCode } = extractLocationInfo(feature);
    onSubmit({
      label: feature.place_name,
      city,
      postalCode,
      lat: feature.center[1],
      lng: feature.center[0],
      surface: surface ? Number(surface) : undefined,
      askingPrice: askingPrice ? Number(askingPrice) : undefined,
    });
  }

  return (
    <div
      style={{ pointerEvents: "auto" }}
      className="rounded-2xl bg-white/[0.08] backdrop-blur-xl border border-white/15 shadow-2xl p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <Sparkles size={14} style={{ color: "var(--c-gold)" }} className="shrink-0" />
        <p style={{ fontFamily: "var(--font-body)" }} className="text-white text-sm font-bold">
          Estimez votre bien gratuitement
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-2.5">
        <AddressAutocomplete onSelect={setFeature} placeholder="Adresse, ville ou code postal" />

        <div className="grid grid-cols-2 gap-2.5">
          <input
            type="number" min="1" inputMode="numeric"
            placeholder="Surface (m²)"
            value={surface}
            onChange={e => setSurface(e.target.value)}
            className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.08] transition"
          />
          <input
            type="number" min="1" inputMode="numeric"
            placeholder="Prix souhaité (€)"
            value={askingPrice}
            onChange={e => setAskingPrice(e.target.value)}
            className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.08] transition"
          />
        </div>

        <button
          type="submit"
          disabled={!feature}
          className="w-full py-3 bg-gradient-to-r from-[#1E3A8A] to-blue-600 hover:from-blue-800 hover:to-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-sm shadow-lg shadow-blue-900/30"
        >
          Estimer mon bien <ArrowRight size={15} />
        </button>
      </form>
    </div>
  );
}
