"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Plus, MapPin, Euro, Maximize2, LayoutGrid, Star, ChevronDown } from "lucide-react";

/* ── Types ────────────────────────────────────────────────────────────────── */
export interface BuyerCriteriaData {
  targetCities:  string[];
  maxPrice:      number;
  minSurface:    number;
  minRooms:      number;
  propertyTypes: string[];
  wantsBalcony:  boolean;
  wantsParking:  boolean;
}

interface Props {
  existingCriteria?: BuyerCriteriaData | null;
  onClose:    () => void;
  onSaved:    (data: BuyerCriteriaData) => void;
}

/* ── Zod schema ───────────────────────────────────────────────────────────── */
const schema = z.object({
  targetCities:  z.array(z.string()).min(1, "Ajoutez au moins une ville"),
  maxPrice:      z.number().min(50000, "Budget minimum 50 000 €"),
  minSurface:    z.number().min(9,     "Surface minimum 9 m²"),
  minRooms:      z.number().min(1,     "Au moins 1 pièce"),
  propertyTypes: z.array(z.string()),
  wantsBalcony:  z.boolean(),
  wantsParking:  z.boolean(),
});
type FormValues = z.infer<typeof schema>;

/* ── Constants ────────────────────────────────────────────────────────────── */
const PROPERTY_TYPES = ["Appartement", "Maison", "Terrain", "Immeuble"] as const;

/* ── Component ────────────────────────────────────────────────────────────── */
export default function BuyerCriteriaModal({ existingCriteria, onClose, onSaved }: Props) {
  const [cityInput,  setCityInput]  = useState("");
  const [isLoading,  setIsLoading]  = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<FormValues, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      targetCities:  existingCriteria?.targetCities  ?? [],
      maxPrice:      existingCriteria?.maxPrice      ?? (undefined as unknown as number),
      minSurface:    existingCriteria?.minSurface    ?? (undefined as unknown as number),
      minRooms:      existingCriteria?.minRooms      ?? (undefined as unknown as number),
      propertyTypes: existingCriteria?.propertyTypes ?? [],
      wantsBalcony:  existingCriteria?.wantsBalcony  ?? false,
      wantsParking:  existingCriteria?.wantsParking  ?? false,
    },
  });

  const { register, handleSubmit, setValue, watch, formState: { errors } } = form;

  const cities      = watch("targetCities");
  const types       = watch("propertyTypes");
  const balcony     = watch("wantsBalcony");
  const parking     = watch("wantsParking");

  /* City chips helpers */
  function addCity() {
    const trimmed = cityInput.trim();
    if (!trimmed || cities.includes(trimmed)) return;
    setValue("targetCities", [...cities, trimmed], { shouldValidate: true });
    setCityInput("");
  }
  function removeCity(idx: number) {
    setValue("targetCities", cities.filter((_, i) => i !== idx), { shouldValidate: true });
  }

  /* Property type toggle */
  function toggleType(t: string) {
    setValue("propertyTypes",
      types.includes(t) ? types.filter(x => x !== t) : [...types, t],
      { shouldValidate: true },
    );
  }

  /* Submit */
  async function onSubmit(data: FormValues) {
    setIsLoading(true);
    setServerError(null);
    try {
      const res = await fetch("/api/buyer-criteria", {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        setServerError(err?.error ?? "Une erreur est survenue.");
        return;
      }
      const saved: BuyerCriteriaData = await res.json();
      onSaved(saved);
    } catch {
      setServerError("Erreur réseau, veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    /* Overlay */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Modal card */}
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto bg-gray-900 border border-white/10 rounded-2xl shadow-2xl">

        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-gray-900 border-b border-white/[0.08]">
          <div>
            <p className="text-[10px] text-emerald-400 uppercase tracking-widest font-bold mb-0.5">
              Projet d'achat
            </p>
            <h2 className="text-lg font-black text-white">Mes critères de recherche</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-500 hover:text-white hover:bg-white/[0.06] transition"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-7">

          {/* ── Localisation ── */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <MapPin size={15} className="text-blue-400 shrink-0" />
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Localisation</h3>
            </div>

            {/* City chips */}
            {cities.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {cities.map((city, i) => (
                  <span
                    key={i}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-bold rounded-full"
                  >
                    {city}
                    <button
                      type="button"
                      onClick={() => removeCity(i)}
                      className="hover:text-red-400 transition ml-0.5"
                    >
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Add city */}
            <div className="flex gap-2">
              <input
                value={cityInput}
                onChange={e => setCityInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCity(); } }}
                placeholder="Ex : Créteil, Lyon, Bordeaux…"
                className="flex-1 bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 outline-none focus:border-blue-500/40 focus:ring-2 focus:ring-blue-500/20 transition"
              />
              <button
                type="button"
                onClick={addCity}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-bold rounded-xl hover:bg-blue-500/20 transition"
              >
                <Plus size={14} /> Ajouter
              </button>
            </div>
            {errors.targetCities && (
              <p className="text-red-400 text-xs mt-1.5">{errors.targetCities.message}</p>
            )}
          </section>

          {/* ── Budget ── */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Euro size={15} className="text-amber-400 shrink-0" />
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Budget maximum</h3>
            </div>
            <div className="relative">
              <input
                type="number"
                placeholder="400 000"
                {...register("maxPrice", { valueAsNumber: true })}
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 pr-10 text-white text-sm placeholder-gray-600 outline-none focus:border-amber-500/40 focus:ring-2 focus:ring-amber-500/20 transition [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-bold">€</span>
            </div>
            {errors.maxPrice && (
              <p className="text-red-400 text-xs mt-1.5">{errors.maxPrice.message}</p>
            )}
          </section>

          {/* ── Surface & Rooms ── */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Maximize2 size={15} className="text-purple-400 shrink-0" />
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Superficie & pièces</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-gray-600 uppercase tracking-widest font-bold block mb-1.5">
                  Surface minimum
                </label>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="50"
                    {...register("minSurface", { valueAsNumber: true })}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 pr-10 text-white text-sm placeholder-gray-600 outline-none focus:border-purple-500/40 focus:ring-2 focus:ring-purple-500/20 transition [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-bold">m²</span>
                </div>
                {errors.minSurface && (
                  <p className="text-red-400 text-xs mt-1">{errors.minSurface.message}</p>
                )}
              </div>
              <div>
                <label className="text-[10px] text-gray-600 uppercase tracking-widest font-bold block mb-1.5">
                  Pièces minimum
                </label>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="3"
                    {...register("minRooms", { valueAsNumber: true })}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 pr-16 text-white text-sm placeholder-gray-600 outline-none focus:border-purple-500/40 focus:ring-2 focus:ring-purple-500/20 transition [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-bold">pièces</span>
                </div>
                {errors.minRooms && (
                  <p className="text-red-400 text-xs mt-1">{errors.minRooms.message}</p>
                )}
              </div>
            </div>
          </section>

          {/* ── Property types ── */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <LayoutGrid size={15} className="text-emerald-400 shrink-0" />
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Type de bien</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {PROPERTY_TYPES.map(t => {
                const active = types.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleType(t)}
                    className={[
                      "px-4 py-2 rounded-xl text-sm font-bold transition-all border",
                      active
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                        : "bg-white/[0.03] border-white/[0.08] text-gray-500 hover:text-gray-300 hover:border-white/20",
                    ].join(" ")}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-gray-700 mt-2">Laissez vide pour tous les types.</p>
          </section>

          {/* ── Preferences ── */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Star size={15} className="text-amber-400 shrink-0" />
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Préférences</h3>
            </div>
            <div className="space-y-2">
              {[
                { key: "wantsBalcony" as const, label: "Balcon ou terrasse souhaité(e)", value: balcony },
                { key: "wantsParking" as const, label: "Parking ou garage souhaité",     value: parking },
              ].map(({ key, label, value }) => (
                <label
                  key={key}
                  className={[
                    "flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all select-none",
                    value
                      ? "bg-emerald-500/[0.07] border-emerald-500/20"
                      : "bg-white/[0.02] border-white/[0.06] hover:border-white/20",
                  ].join(" ")}
                >
                  <div className={[
                    "w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all",
                    value ? "bg-emerald-500 border-emerald-500" : "border-gray-600 bg-transparent",
                  ].join(" ")}>
                    {value && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <span className={`text-sm font-medium ${value ? "text-emerald-300" : "text-gray-400"}`}>
                    {label}
                  </span>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={value}
                    onChange={e => setValue(key, e.target.checked)}
                  />
                </label>
              ))}
            </div>
          </section>

          {/* ── Error ── */}
          {serverError && (
            <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              {serverError}
            </p>
          )}

          {/* ── Submit ── */}
          <div className="flex gap-3 pt-2 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl text-sm font-bold text-gray-500 bg-white/[0.03] border border-white/[0.08] hover:text-gray-300 hover:border-white/20 transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-2 flex-grow-[2] py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[#1E3A8A] to-blue-500 hover:from-blue-900 hover:to-blue-400 disabled:opacity-50 transition-all shadow-lg shadow-blue-900/30"
            >
              {isLoading ? "Enregistrement…" : "Enregistrer mon projet"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
