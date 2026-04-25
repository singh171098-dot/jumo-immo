"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, CheckCircle2, AlertCircle, ArrowRight, RotateCcw } from "lucide-react";
import { createProperty, type CreatePropertyResult } from "../app/actions/property";
import UploadLink from "./UploadLink";

/* ── Static config ───────────────────────────────────────────────────────── */
const PROPERTY_TYPES = ["Appartement", "Maison", "Studio", "Terrain", "Villa", "Loft"];

const DPE_CONFIG: { label: string; bg: string; ring: string; text: string }[] = [
  { label: "A", bg: "bg-emerald-500",  ring: "ring-emerald-500",  text: "text-emerald-600"  },
  { label: "B", bg: "bg-lime-500",     ring: "ring-lime-400",     text: "text-lime-600"     },
  { label: "C", bg: "bg-yellow-400",   ring: "ring-yellow-400",   text: "text-yellow-600"   },
  { label: "D", bg: "bg-orange-400",   ring: "ring-orange-400",   text: "text-orange-600"   },
  { label: "E", bg: "bg-orange-500",   ring: "ring-orange-500",   text: "text-orange-700"   },
  { label: "F", bg: "bg-red-500",      ring: "ring-red-500",      text: "text-red-600"      },
  { label: "G", bg: "bg-red-800",      ring: "ring-red-800",      text: "text-red-800"      },
];

const SCORE_COLOR = (s: number) =>
  s >= 80 ? "text-emerald-600" : s >= 65 ? "text-amber-600" : "text-red-500";
const SCORE_LABEL = (s: number) =>
  s >= 80 ? "Prix juste" : s >= 65 ? "Prix du marché" : "À négocier";
const SCORE_BG = (s: number) =>
  s >= 80 ? "bg-emerald-50 border-emerald-200" : s >= 65 ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200";

/* ── Document gate config ────────────────────────────────────────────────── */
type DocKey = "TITRE_PROPRIETE" | "DPE_DOC" | "AMIANTE" | "PLOMB" | "TERMITES" | "MESURAGE_CARREZ";

const DOC_LABELS: Record<DocKey, string> = {
  TITRE_PROPRIETE:  "Titre de propriété",
  DPE_DOC:          "Rapport DPE (fichier)",
  AMIANTE:          "Diagnostic amiante",
  PLOMB:            "Diagnostic plomb (CREP)",
  TERMITES:         "État relatif aux termites",
  MESURAGE_CARREZ:  "Mesurage Loi Carrez",
};

const REQUIRED_ALL:  DocKey[] = ["TITRE_PROPRIETE", "DPE_DOC", "AMIANTE", "PLOMB", "TERMITES"];
const REQUIRED_APPT: DocKey[] = [...REQUIRED_ALL, "MESURAGE_CARREZ"];

const EMPTY_DOCS: Record<DocKey, File | null> = {
  TITRE_PROPRIETE: null,
  DPE_DOC:         null,
  AMIANTE:         null,
  PLOMB:           null,
  TERMITES:        null,
  MESURAGE_CARREZ: null,
};

/* ── Shared input style ──────────────────────────────────────────────────── */
const INPUT =
  "w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800 " +
  "placeholder-slate-400 text-sm font-medium outline-none " +
  "focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 " +
  "hover:border-slate-300 transition-all duration-200";

const LABEL = "block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2";

/* ── Component ───────────────────────────────────────────────────────────── */
export default function PropertyForm() {
  const [selectedType,       setSelectedType]       = useState("Appartement");
  const [selectedDpe,        setSelectedDpe]        = useState("");
  const [selectedInsulation, setSelectedInsulation] = useState("");
  const [selectedHeating,    setSelectedHeating]    = useState("");
  const [loading,            setLoading]            = useState(false);
  const [error,              setError]              = useState<string | null>(null);
  const [result,             setResult]             = useState<CreatePropertyResult | null>(null);
  const [docs,               setDocs]               = useState<Record<DocKey, File | null>>(EMPTY_DOCS);

  const setDoc = (key: DocKey) => (file: File | null) =>
    setDocs(prev => ({ ...prev, [key]: file }));

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!selectedDpe) { setError("Veuillez sélectionner la classe DPE."); return; }

    /* Validate required documents — block submission if any are missing */
    const requiredKeys = selectedType === "Appartement" ? REQUIRED_APPT : REQUIRED_ALL;
    const missingDocs  = requiredKeys.filter(k => !docs[k]);
    if (missingDocs.length > 0) {
      setError(
        `Documents obligatoires manquants : ${missingDocs.map(k => DOC_LABELS[k]).join(", ")}.`
      );
      return;
    }

    setLoading(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    fd.set("type",        selectedType);
    fd.set("dpe",         selectedDpe);
    fd.set("insulation",  selectedInsulation);
    fd.set("heatingType", selectedHeating);

    /* Append document files for server-side validation + storage */
    for (const [key, file] of Object.entries(docs) as [DocKey, File | null][]) {
      if (file) fd.append(`doc_${key}`, file);
    }

    const res = await createProperty(fd);
    setLoading(false);

    if (res.success) {
      setResult(res);
    } else {
      setError(res.error ?? "Une erreur est survenue.");
    }
  }

  /* ── Success state ─────────────────────────────────────────────────────── */
  if (result?.success) {
    const score = result.fairScore!;
    return (
      <div className="bg-white/80 backdrop-blur-xl border border-slate-200 shadow-xl shadow-slate-200/50 rounded-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-[#10B981] to-emerald-400 px-8 py-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-7 h-7 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-white font-black text-xl tracking-tight">Annonce publiée !</p>
            <p className="text-emerald-100 text-sm mt-0.5">Votre bien est visible par tous les acheteurs</p>
          </div>
        </div>

        <div className="p-8 space-y-6">
          <div className={`rounded-2xl border p-5 flex items-center justify-between ${SCORE_BG(score)}`}>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">FairScore™ DVF généré</p>
              <p className={`text-4xl font-black tracking-tighter ${SCORE_COLOR(score)}`}>
                {score}<span className="text-base font-bold text-slate-400">/100</span>
              </p>
              <p className={`text-sm font-semibold mt-1 ${SCORE_COLOR(score)}`}>{SCORE_LABEL(score)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Marché DVF local</p>
              <p className="text-xl font-black text-slate-700">
                {(result.cityAvgPerSqm ?? 0).toLocaleString("fr-FR")} €/m²
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Link
              href={`/annonces/${result.propertyId}`}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-[#1E3A8A] hover:bg-blue-900 text-white font-bold rounded-xl text-sm transition-all hover:shadow-lg hover:shadow-blue-200 active:scale-[.98]"
            >
              Voir l'annonce <ArrowRight className="w-4 h-4" />
            </Link>
            <button
              onClick={() => {
                setResult(null);
                setSelectedDpe("");
                setSelectedType("Appartement");
                setError(null);
                setDocs(EMPTY_DOCS);
              }}
              className="flex items-center justify-center gap-2 px-5 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-sm transition-all active:scale-[.98]"
            >
              <RotateCcw className="w-4 h-4" /> Nouvelle annonce
            </button>
          </div>
        </div>
      </div>
    );
  }

  const requiredKeys    = selectedType === "Appartement" ? REQUIRED_APPT : REQUIRED_ALL;
  const uploadedCount   = requiredKeys.filter(k => !!docs[k]).length;
  const allDocsUploaded = uploadedCount === requiredKeys.length;

  /* ── Form ──────────────────────────────────────────────────────────────── */
  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white/80 backdrop-blur-xl border border-slate-200 shadow-xl shadow-slate-200/50 rounded-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="px-8 py-6 border-b border-slate-100 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-[#1E3A8A]/10 flex items-center justify-center">
          <span className="text-[#1E3A8A] text-lg">🏠</span>
        </div>
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight">Publier une annonce</h2>
          <p className="text-slate-400 text-xs mt-0.5 font-medium">Documents requis · DVF automatique · 0% commission</p>
        </div>
      </div>

      <div className="px-8 py-7 space-y-7">

        {/* Title */}
        <div>
          <label htmlFor="title" className={LABEL}>Titre de l'annonce</label>
          <input
            id="title" name="title" type="text" required
            placeholder="Ex : Appartement haussmannien lumineux avec parking…"
            className={INPUT} disabled={loading}
          />
        </div>

        {/* Type pills */}
        <div>
          <p className={LABEL}>Type de bien</p>
          <div className="flex flex-wrap gap-2">
            {PROPERTY_TYPES.map(t => (
              <button
                key={t} type="button"
                onClick={() => setSelectedType(t)} disabled={loading}
                className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all duration-200 active:scale-[.97] ${
                  selectedType === t
                    ? "bg-[#1E3A8A] border-[#1E3A8A] text-white shadow-md shadow-blue-200"
                    : "bg-white border-slate-200 text-slate-500 hover:border-[#1E3A8A]/50 hover:text-[#1E3A8A]"
                }`}
              >{t}</button>
            ))}
          </div>
          <input type="hidden" name="type" value={selectedType} />
        </div>

        {/* City */}
        <div>
          <label htmlFor="city" className={LABEL}>Ville</label>
          <input
            id="city" name="city" type="text" required
            placeholder="Ex : Lyon, Paris 11e, Bordeaux…"
            className={INPUT} disabled={loading}
          />
        </div>

        {/* Price */}
        <div>
          <label htmlFor="price" className={LABEL}>Prix de vente</label>
          <div className="relative">
            <input
              id="price" name="price" type="number" required
              min={10000} step={1000} placeholder="350 000"
              className={`${INPUT} pr-10`} disabled={loading}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm pointer-events-none">€</span>
          </div>
        </div>

        {/* Surface + Rooms */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="surface" className={LABEL}>Surface</label>
            <div className="relative">
              <input
                id="surface" name="surface" type="number" required
                min={5} step={1} placeholder="75"
                className={`${INPUT} pr-12`} disabled={loading}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs pointer-events-none">m²</span>
            </div>
          </div>
          <div>
            <label htmlFor="rooms" className={LABEL}>Nombre de pièces</label>
            <input
              id="rooms" name="rooms" type="number" required
              min={0} max={20} step={1} placeholder="3"
              className={INPUT} disabled={loading}
            />
          </div>
        </div>

        {/* DPE class selector */}
        <div>
          <p className={LABEL}>Classe énergétique (DPE)</p>
          <div className="flex gap-2 flex-wrap">
            {DPE_CONFIG.map(d => (
              <button
                key={d.label} type="button"
                onClick={() => setSelectedDpe(d.label)} disabled={loading}
                className={`w-11 h-11 rounded-xl font-black text-sm transition-all duration-200 active:scale-[.95] ${
                  selectedDpe === d.label
                    ? `${d.bg} text-white ring-2 ring-offset-2 ${d.ring} shadow-md`
                    : `bg-slate-100 ${d.text} hover:bg-slate-200 border border-slate-200`
                }`}
              >{d.label}</button>
            ))}
          </div>
          <input type="hidden" name="dpe" value={selectedDpe} />
        </div>

        {/* ── Required documents (publication gate) ── */}
        <div className="border-t border-slate-100 pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Documents obligatoires
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Requis avant publication · Conformité loi ALUR
              </p>
            </div>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-lg transition-colors ${
              allDocsUploaded
                ? "bg-emerald-100 text-emerald-700"
                : "bg-orange-100 text-orange-700"
            }`}>
              {uploadedCount} / {requiredKeys.length} téléversés
            </span>
          </div>

          <div className="space-y-3">
            {requiredKeys.map(key => (
              <UploadLink
                key={key}
                role="seller"
                docType={key}
                label={DOC_LABELS[key]}
                required
                value={docs[key]}
                onChange={setDoc(key)}
              />
            ))}
          </div>
        </div>

        {/* ── Seller improvement fields (optional) ── */}
        <div className="border-t border-slate-100 pt-6 space-y-5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Précision de l'estimation (optionnel)
          </p>

          {/* Insulation */}
          <div>
            <p className={LABEL}>État de l'isolation</p>
            <div className="flex gap-2 flex-wrap">
              {(["Mauvais", "Moyen", "Bon", "Excellent"] as const).map(v => (
                <button
                  key={v} type="button" disabled={loading}
                  onClick={() => setSelectedInsulation(selectedInsulation === v ? "" : v)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all duration-200 active:scale-[.97] ${
                    selectedInsulation === v
                      ? "bg-[#1E3A8A] border-[#1E3A8A] text-white shadow-md shadow-blue-200"
                      : "bg-white border-slate-200 text-slate-500 hover:border-[#1E3A8A]/40 hover:text-[#1E3A8A]"
                  }`}
                >{v}</button>
              ))}
            </div>
            <input type="hidden" name="insulation" value={selectedInsulation} />
          </div>

          {/* Heating type */}
          <div>
            <p className={LABEL}>Type de chauffage</p>
            <div className="flex gap-2 flex-wrap">
              {(["Gaz", "Électrique", "Pompe à chaleur", "Fioul", "Bois", "Autre"] as const).map(v => (
                <button
                  key={v} type="button" disabled={loading}
                  onClick={() => setSelectedHeating(selectedHeating === v ? "" : v)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all duration-200 active:scale-[.97] ${
                    selectedHeating === v
                      ? v === "Pompe à chaleur" || v === "Bois"
                        ? "bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-200"
                        : "bg-[#1E3A8A] border-[#1E3A8A] text-white shadow-md shadow-blue-200"
                      : "bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700"
                  }`}
                >{v}</button>
              ))}
            </div>
            <input type="hidden" name="heatingType" value={selectedHeating} />
          </div>

          {/* Renovation year */}
          <div>
            <label htmlFor="renovationYear" className={LABEL}>Dernière année de rénovation</label>
            <input
              id="renovationYear" name="renovationYear" type="number"
              min={1900} max={new Date().getFullYear()} step={1}
              placeholder="Ex : 2018"
              className={INPUT} disabled={loading}
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            {error}
          </div>
        )}
      </div>

      {/* Submit */}
      <div className="px-8 pb-7">
        <button
          type="submit" disabled={loading}
          className="w-full py-4 bg-gradient-to-r from-[#1E3A8A] to-blue-600 hover:from-blue-800 hover:to-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-black rounded-xl text-sm tracking-wide shadow-lg shadow-blue-200 transition-all duration-300 hover:shadow-xl hover:shadow-blue-300 hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2.5"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Publication en cours…</>
          ) : (
            <><span>🚀</span> Publier l'annonce · Gratuit</>
          )}
        </button>
        <p className="text-center text-xs text-slate-400 mt-3 font-medium">
          0% de commission · Données DVF officielles · Documents vérifiés
        </p>
      </div>
    </form>
  );
}
