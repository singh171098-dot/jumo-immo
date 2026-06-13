"use client";
import { useState, useEffect, useRef } from "react";
import { MapPin, Loader2, AlertCircle } from "lucide-react";

export interface MapboxGeocodingFeature {
  id: string;
  place_name: string;
  text: string;
  place_type: string[];
  center: [number, number]; // [lng, lat]
  context?: { id: string; text: string }[];
}

interface AddressAutocompleteProps {
  /** Called with the selected feature, or `null` once the selection is cleared. */
  onSelect: (feature: MapboxGeocodingFeature | null) => void;
  placeholder?: string;
}

type Status = "idle" | "loading" | "no-results" | "network-error";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export default function AddressAutocomplete({ onSelect, placeholder }: AddressAutocompleteProps) {
  const [query, setQuery]       = useState("");
  const [results, setResults]   = useState<MapboxGeocodingFeature[]>([]);
  const [status, setStatus]     = useState<Status>("idle");
  const [isOpen, setIsOpen]     = useState(false);
  const [selected, setSelected] = useState<MapboxGeocodingFeature | null>(null);
  const [touched, setTouched]   = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (selected) return; // already have a valid selection — wait for the user to edit it

    const q = query.trim();
    if (q.length < 3) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    setStatus("loading");

    debounceRef.current = setTimeout(async () => {
      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json`
          + `?access_token=${MAPBOX_TOKEN}&country=fr&autocomplete=true&limit=5`
          + `&types=place,postcode,address,locality,district,region`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("network");

        const data = await res.json();
        const features: MapboxGeocodingFeature[] = data.features ?? [];
        setResults(features);
        setStatus(features.length === 0 ? "no-results" : "idle");
        setIsOpen(true);
      } catch {
        setResults([]);
        setStatus("network-error");
        setIsOpen(true);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, selected]);

  function handleChange(value: string) {
    setQuery(value);
    setTouched(true);
    if (selected) {
      setSelected(null);
      onSelect(null);
    }
    if (value.trim().length < 3) {
      setResults([]);
      setStatus("idle");
      setIsOpen(false);
    }
  }

  function handleSelect(feature: MapboxGeocodingFeature) {
    setSelected(feature);
    setQuery(feature.place_name);
    setResults([]);
    setIsOpen(false);
    setStatus("idle");
    onSelect(feature);
  }

  const showSelectHint = touched && !selected && query.trim().length > 0
    && !isOpen && status !== "loading";

  return (
    <div className="relative">
      <div className="relative">
        <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          value={query}
          onChange={e => handleChange(e.target.value)}
          onFocus={() => { setTouched(true); if (results.length > 0) setIsOpen(true); }}
          onBlur={() => setTimeout(() => setIsOpen(false), 150)}
          placeholder={placeholder ?? "Ville, code postal, adresse…"}
          className="w-full bg-white/[0.05] border border-white/10 rounded-xl pl-10 pr-9 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.08] transition"
        />
        {status === "loading" && (
          <Loader2 size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 animate-spin" />
        )}
      </div>

      {/* Suggestions dropdown */}
      {isOpen && results.length > 0 && (
        <div className="absolute z-20 left-0 right-0 mt-2 bg-gray-900/97 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden">
          {results.map(feature => (
            <button
              key={feature.id}
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={() => handleSelect(feature)}
              className="w-full flex items-start gap-2.5 text-left px-3.5 py-2.5 hover:bg-blue-500/10 border-b border-white/[0.05] last:border-b-0 transition"
            >
              <MapPin size={13} className="text-blue-400 shrink-0 mt-0.5" />
              <span className="text-xs text-gray-200 leading-snug">{feature.place_name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Error / hint states */}
      {isOpen && status === "no-results" && (
        <div className="absolute z-20 left-0 right-0 mt-2 bg-gray-900/97 backdrop-blur-xl border border-white/10 rounded-xl px-3.5 py-2.5 flex items-center gap-2">
          <AlertCircle size={13} className="text-amber-400 shrink-0" />
          <span className="text-xs text-gray-300">Aucun lieu trouvé</span>
        </div>
      )}
      {isOpen && status === "network-error" && (
        <div className="absolute z-20 left-0 right-0 mt-2 bg-gray-900/97 backdrop-blur-xl border border-white/10 rounded-xl px-3.5 py-2.5 flex items-center gap-2">
          <AlertCircle size={13} className="text-red-400 shrink-0" />
          <span className="text-xs text-gray-300">Erreur réseau</span>
        </div>
      )}
      {showSelectHint && (
        <p className="mt-1.5 text-[11px] text-amber-400 flex items-center gap-1.5">
          <AlertCircle size={11} className="shrink-0" />
          Sélectionnez un lieu dans la liste
        </p>
      )}
    </div>
  );
}
