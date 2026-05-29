"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink, Loader2, ShieldCheck } from "lucide-react";

interface LeadCaptureModalProps {
  isOpen:      boolean;
  onClose:     () => void;
  propertyId:  string;
  externalUrl: string;
  propertyTitle?: string;
}

interface FormState {
  firstName:   string;
  lastName:    string;
  email:       string;
  postalCode:  string;
  rgpdConsent: boolean;
}

const EMPTY: FormState = {
  firstName: "", lastName: "", email: "", postalCode: "", rgpdConsent: false,
};

export default function LeadCaptureModal({
  isOpen, onClose, propertyId, externalUrl, propertyTitle,
}: LeadCaptureModalProps) {
  const [form,    setForm]    = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  /* Reset form whenever modal opens */
  useEffect(() => {
    if (isOpen) { setForm(EMPTY); setError(null); }
  }, [isOpen]);

  /* Close on Escape */
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  function set(field: keyof FormState, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }));
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.rgpdConsent) {
      setError("Vous devez accepter la politique de confidentialité pour continuer.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/leads", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ ...form, propertyId }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Une erreur est survenue. Veuillez réessayer.");
        return;
      }

      /* Success — open external listing and close modal */
      window.open(externalUrl, "_blank", "noopener,noreferrer");
      onClose();
    } catch {
      setError("Erreur de connexion. Vérifiez votre réseau et réessayez.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            key="overlay"
            className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            key="modal"
            className="fixed inset-0 z-[61] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-md bg-gray-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
              initial={{ scale: 0.95, y: 16 }}
              animate={{ scale: 1,    y: 0  }}
              exit={{    scale: 0.95, y: 16 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              onClick={e => e.stopPropagation()}
            >

              {/* Header */}
              <div className="relative bg-gradient-to-r from-[#1E3A8A] to-blue-600 px-6 pt-6 pb-5">
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-1.5 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition"
                  aria-label="Fermer"
                >
                  <X size={16} />
                </button>
                <div className="flex items-center gap-2 mb-1">
                  <ExternalLink size={15} className="text-blue-200" />
                  <span className="text-blue-200 text-xs font-bold uppercase tracking-widest">
                    Annonce partenaire
                  </span>
                </div>
                <h2 className="text-white text-lg font-black leading-tight">
                  Accéder à l'annonce
                </h2>
                {propertyTitle && (
                  <p className="text-blue-200/70 text-xs mt-1 truncate">{propertyTitle}</p>
                )}
              </div>

              {/* Body */}
              <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

                <p className="text-gray-400 text-xs leading-relaxed">
                  Pour accéder à cette annonce partenaire, veuillez renseigner vos coordonnées.
                  Cela nous permet de vous mettre en relation avec le bon interlocuteur.
                </p>

                {/* Prénom + Nom */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                      Prénom <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      autoComplete="given-name"
                      value={form.firstName}
                      onChange={e => set("firstName", e.target.value)}
                      placeholder="Jean"
                      className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.08] transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                      Nom <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      autoComplete="family-name"
                      value={form.lastName}
                      onChange={e => set("lastName", e.target.value)}
                      placeholder="Dupont"
                      className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.08] transition"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    Adresse e-mail <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={form.email}
                    onChange={e => set("email", e.target.value)}
                    placeholder="jean.dupont@email.fr"
                    className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.08] transition"
                  />
                </div>

                {/* Code Postal */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    Code postal <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    autoComplete="postal-code"
                    inputMode="numeric"
                    maxLength={5}
                    value={form.postalCode}
                    onChange={e => set("postalCode", e.target.value.replace(/\D/g, ""))}
                    placeholder="75001"
                    className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.08] transition"
                  />
                </div>

                {/* RGPD Consent */}
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative mt-0.5 shrink-0">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={form.rgpdConsent}
                      onChange={e => set("rgpdConsent", e.target.checked)}
                    />
                    <div className="w-4 h-4 rounded border border-white/20 bg-white/[0.05] peer-checked:bg-blue-600 peer-checked:border-blue-600 transition flex items-center justify-center">
                      {form.rgpdConsent && (
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 10">
                          <path d="M1 5l3.5 3.5L11 1" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 leading-relaxed group-hover:text-gray-300 transition">
                    J&apos;accepte que mes données soient conservées et transmises à des partenaires
                    pour ma recherche immobilière.{" "}
                    <span className="text-red-400">*</span>
                  </span>
                </label>

                {/* Error */}
                {error && (
                  <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5">
                    {error}
                  </p>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-gradient-to-r from-[#1E3A8A] to-blue-600 hover:from-blue-800 hover:to-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-sm shadow-lg shadow-blue-900/30"
                >
                  {loading ? (
                    <><Loader2 size={15} className="animate-spin" /> Envoi en cours…</>
                  ) : (
                    <><ExternalLink size={15} /> Accéder à l'annonce</>
                  )}
                </button>

                {/* RGPD note */}
                <div className="flex items-center gap-1.5 justify-center">
                  <ShieldCheck size={11} className="text-gray-600 shrink-0" />
                  <p className="text-[10px] text-gray-600 text-center">
                    Données protégées — jamais revendues sans consentement
                  </p>
                </div>

              </form>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
