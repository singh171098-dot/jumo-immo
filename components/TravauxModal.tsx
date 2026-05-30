"use client";
import { useState } from "react";
import {
  X, Hammer, Camera, User, Mail, Phone,
  ChevronRight, CheckCircle2, AlertCircle, ImagePlus,
} from "lucide-react";
import { CldUploadWidget } from "next-cloudinary";

/* ── Work-type catalogue — extend this array to add future categories ──────── */
const WORK_TYPES = [
  "Électricité",
  "Carrelage",
  "Peinture",
  "Plomberie",
  "Cuisine",
  "Salle de bain",
  "Isolation",
  "Rénovation complète",
] as const;
type WorkType = (typeof WORK_TYPES)[number];

const CLOUDINARY_PRESET = "jumo_immo";

/* ── Props ─────────────────────────────────────────────────────────────────── */
interface Props {
  isOpen:     boolean;
  onClose:    () => void;
  userName?:  string;
  userEmail?: string;
}

type FormStatus = "idle" | "submitting" | "success" | "error";

/* ── Shared input class ─────────────────────────────────────────────────────── */
const inputCls =
  "w-full bg-white/[0.04] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder-gray-600 outline-none focus:border-amber-500/40 focus:ring-2 focus:ring-amber-500/20 transition";

/* ── Component ─────────────────────────────────────────────────────────────── */
export default function TravauxModal({ isOpen, onClose, userName, userEmail }: Props) {
  const [workType,     setWorkType]     = useState<WorkType | "">("");
  const [description,  setDescription]  = useState("");
  const [photoUrls,    setPhotoUrls]    = useState<string[]>([]);
  const [name,         setName]         = useState(userName  ?? "");
  const [email,        setEmail]        = useState(userEmail ?? "");
  const [phone,        setPhone]        = useState("");
  const [status,       setStatus]       = useState<FormStatus>("idle");
  const [errorMsg,     setErrorMsg]     = useState<string | null>(null);

  function handleClose() {
    if (status === "submitting") return;
    onClose();
  }

  function removePhoto(url: string) {
    setPhotoUrls(prev => prev.filter(u => u !== url));
  }

  function clearError() {
    if (errorMsg) setErrorMsg(null);
    if (status === "error") setStatus("idle");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!workType) {
      setErrorMsg("Sélectionnez un type de travaux.");
      return;
    }
    if (description.trim().length < 10) {
      setErrorMsg("La description est trop courte (minimum 10 caractères).");
      return;
    }
    if (!name.trim()) {
      setErrorMsg("Le nom est requis.");
      return;
    }
    if (!email.trim()) {
      setErrorMsg("L'email est requis.");
      return;
    }

    setStatus("submitting");
    setErrorMsg(null);

    try {
      const res = await fetch("/api/travaux", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          workType,
          description: description.trim(),
          photoUrls,
          name:  name.trim(),
          email: email.trim(),
          phone: phone.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg =
          data?.error?.formErrors?.[0] ??
          (typeof data?.error === "string" ? data.error : null) ??
          "Une erreur est survenue. Veuillez réessayer.";
        setErrorMsg(msg);
        setStatus("error");
        return;
      }

      setStatus("success");
    } catch {
      setErrorMsg("Erreur réseau. Vérifiez votre connexion et réessayez.");
      setStatus("error");
    }
  }

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop — sits below the panel */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[79]"
        onClick={handleClose}
      />

      {/* Panel wrapper */}
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 pointer-events-none">
        <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-gray-950 border border-white/10 rounded-2xl shadow-2xl shadow-black/70 pointer-events-auto">

          {/* ── Sticky header ── */}
          <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-gray-950 border-b border-white/[0.08]">
            <div>
              <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-0.5">
                Services Jumo Immo
              </p>
              <h2 className="text-lg font-black text-white">Demande de devis travaux</h2>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-xl text-gray-500 hover:text-white hover:bg-white/[0.06] transition"
            >
              <X size={18} />
            </button>
          </div>

          {/* ══════════════ SUCCESS STATE ══════════════ */}
          {status === "success" ? (
            <div className="flex flex-col items-center justify-center gap-5 px-8 py-14 text-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 size={32} className="text-emerald-400" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white mb-3">Demande envoyée !</h3>
                <p className="text-gray-400 text-sm leading-relaxed max-w-sm">
                  Votre demande a bien été envoyée.<br />
                  Notre équipe reviendra vers vous rapidement avec une estimation ou une mise en relation.
                </p>
              </div>
              <button
                onClick={onClose}
                className="mt-2 px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm transition-all active:scale-[.98]"
              >
                Fermer
              </button>
            </div>

          ) : (
            /* ══════════════ FORM STATE ══════════════ */
            <form onSubmit={handleSubmit} className="p-6 space-y-7">

              {/* ── Type de travaux ── */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Hammer size={14} className="text-amber-400 shrink-0" />
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                    Type de travaux
                  </h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {WORK_TYPES.map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => { setWorkType(t); clearError(); }}
                      className={[
                        "px-3 py-2.5 rounded-xl text-xs font-bold transition-all border text-center",
                        workType === t
                          ? "bg-amber-500/15 border-amber-500/30 text-amber-300"
                          : "bg-white/[0.03] border-white/[0.08] text-gray-500 hover:text-gray-300 hover:border-white/20",
                      ].join(" ")}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </section>

              {/* ── Description ── */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                    Décrivez votre projet
                  </h3>
                </div>
                <textarea
                  rows={4}
                  value={description}
                  onChange={e => { setDescription(e.target.value); clearError(); }}
                  placeholder="Ex. : Repeindre un appartement de 75 m², murs et plafonds, deux couleurs…"
                  className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 outline-none focus:border-amber-500/40 focus:ring-2 focus:ring-amber-500/20 transition resize-none"
                />
                <p className="text-[10px] text-gray-700 mt-1.5 leading-relaxed">
                  Expliquez les travaux souhaités, les contraintes éventuelles et toute information utile pour établir un devis.
                </p>
              </section>

              {/* ── Photos ── */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Camera size={14} className="text-blue-400 shrink-0" />
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                    Photos
                  </h3>
                  <span className="ml-auto text-[10px] text-gray-700">
                    {photoUrls.length} / 10
                  </span>
                </div>

                {/* Photo previews */}
                {photoUrls.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-3">
                    {photoUrls.map(url => (
                      <div
                        key={url}
                        className="relative group aspect-square rounded-xl overflow-hidden bg-gray-900 border border-white/10"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removePhoto(url)}
                          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/70 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition hover:bg-red-600"
                        >
                          <X size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Cloudinary upload — same preset as PropertyForm */}
                {photoUrls.length < 10 && (
                  <CldUploadWidget
                    uploadPreset={CLOUDINARY_PRESET}
                    options={{
                      multiple:             true,
                      maxFiles:             10 - photoUrls.length,
                      resourceType:         "image",
                      clientAllowedFormats: ["jpg", "jpeg", "png", "webp", "heic"],
                      maxFileSize:          15_000_000,
                      sources:              ["local", "camera", "url"],
                    }}
                    onSuccess={result => {
                      const url = (result?.info as { secure_url?: string })?.secure_url;
                      if (url) setPhotoUrls(prev => prev.length < 10 ? [...prev, url] : prev);
                    }}
                  >
                    {({ open }) => (
                      <button
                        type="button"
                        onClick={() => open()}
                        disabled={status === "submitting"}
                        className="w-full flex items-center justify-center gap-2.5 py-4 border-2 border-dashed border-white/10 hover:border-blue-500/30 hover:bg-blue-500/[0.03] rounded-xl text-gray-600 hover:text-blue-400 text-sm font-semibold transition-all disabled:opacity-50"
                      >
                        <ImagePlus size={16} />
                        {photoUrls.length === 0
                          ? "Ajouter des photos (optionnel)"
                          : "Ajouter d'autres photos"}
                      </button>
                    )}
                  </CldUploadWidget>
                )}
              </section>

              {/* ── Coordonnées ── */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <User size={14} className="text-emerald-400 shrink-0" />
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                    Vos coordonnées
                  </h3>
                </div>
                <div className="space-y-3">
                  <div className="relative">
                    <User size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600" />
                    <input
                      type="text"
                      placeholder="Nom complet"
                      value={name}
                      onChange={e => { setName(e.target.value); clearError(); }}
                      className={inputCls}
                    />
                  </div>
                  <div className="relative">
                    <Mail size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600" />
                    <input
                      type="email"
                      placeholder="Email"
                      value={email}
                      onChange={e => { setEmail(e.target.value); clearError(); }}
                      className={inputCls}
                    />
                  </div>
                  <div className="relative">
                    <Phone size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600" />
                    <input
                      type="tel"
                      placeholder="Téléphone (optionnel)"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>
              </section>

              {/* ── Error ── */}
              {errorMsg && (
                <div className="flex items-start gap-3 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <AlertCircle size={15} className="text-red-400 shrink-0 mt-0.5" />
                  <p className="text-red-400 text-sm font-medium">{errorMsg}</p>
                </div>
              )}

              {/* ── Submit / Cancel ── */}
              <div className="flex gap-3 pt-2 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-gray-500 bg-white/[0.03] border border-white/[0.08] hover:text-gray-300 hover:border-white/20 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={status === "submitting"}
                  className="flex-[2] py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 transition-all shadow-lg shadow-amber-900/20 flex items-center justify-center gap-2 active:scale-[.98]"
                >
                  {status === "submitting" ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Envoi en cours…
                    </>
                  ) : (
                    <>Envoyer ma demande <ChevronRight size={15} /></>
                  )}
                </button>
              </div>

            </form>
          )}
        </div>
      </div>
    </>
  );
}
