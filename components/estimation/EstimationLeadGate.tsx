"use client";
import { useState } from "react";
import { Loader2, Mail, Lock, CheckCircle2, AlertCircle, RotateCcw } from "lucide-react";

type Step = "FORM" | "SENDING_OTP" | "VERIFY" | "VERIFIED" | "ERROR";

interface EstimationLeadGateProps {
  city: string;
  postalCode: string;
  askingPrice?: number;
  surface?: number;
  children: React.ReactNode;
}

const inputClass = "w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.08] transition";
const buttonClass = "w-full py-3 bg-gradient-to-r from-[#1E3A8A] to-blue-600 hover:from-blue-800 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-sm shadow-lg shadow-blue-900/30";

export default function EstimationLeadGate({
  city, postalCode, askingPrice, surface, children,
}: EstimationLeadGateProps) {
  const [step, setStep]         = useState<Step>("FORM");
  const [firstName, setFirstName] = useState("");
  const [email, setEmail]       = useState("");
  const [leadCity, setLeadCity] = useState(city);
  const [otp, setOtp]           = useState("");
  const [error, setError]       = useState<string | null>(null);
  const [info, setInfo]         = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);

  async function sendOtp() {
    setStep("SENDING_OTP");
    setError(null);
    setInfo(null);
    try {
      const res = await fetch("/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Erreur d'envoi. Vérifiez votre email.");
        setStep("ERROR");
        return;
      }
      setOtp("");
      setStep("VERIFY");
    } catch {
      setError("Erreur d'envoi. Vérifiez votre email.");
      setStep("ERROR");
    }
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !email.trim() || !leadCity.trim()) return;
    void sendOtp();
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length !== 6 || loading) return;

    setLoading(true);
    setError(null);
    setInfo(null);

    try {
      const res = await fetch("/api/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: otp }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        await fetch("/api/estimation-leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ firstName, email, city: leadCity, postalCode: postalCode || undefined, askingPrice, surface }),
        });
        setStep("VERIFIED");
        return;
      }

      setOtp("");
      if (data.error === "expired") {
        setError("Code expiré. Renvoyer un nouveau code.");
      } else if (data.error === "too_many_attempts") {
        setInfo("Trop de tentatives. Nouveau code envoyé.");
      } else {
        setError("Code incorrect. Veuillez réessayer.");
      }
    } catch {
      setError("Erreur réseau. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  }

  function resetToForm() {
    setStep("FORM");
    setOtp("");
    setError(null);
    setInfo(null);
  }

  /* ── Unlocked ── */
  if (step === "VERIFIED") {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 px-5 py-4 flex items-center gap-3">
          <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
          <p className="text-sm text-emerald-300">
            Merci {firstName} ! Votre analyse complète est débloquée ci-dessous.
          </p>
        </div>
        {children}
      </div>
    );
  }

  /* ── Locked — blurred preview + gate card ── */
  return (
    <div className="relative rounded-2xl overflow-hidden">
      <div aria-hidden className="pointer-events-none select-none blur-sm opacity-40">
        {children}
      </div>

      <div className="absolute inset-0 flex items-center justify-center p-4 bg-gray-950/75">
        <div className="w-full max-w-sm bg-gray-900 border border-white/10 rounded-2xl shadow-2xl p-5">

          {step === "FORM" && (
            <form onSubmit={handleFormSubmit} className="space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Lock size={14} className="text-blue-400" />
                <p className="text-white font-bold text-sm">Débloquez l&apos;analyse complète</p>
              </div>
              <p className="text-gray-400 text-xs leading-relaxed">
                Recevez un code de vérification par e-mail pour accéder gratuitement à la tendance des prix,
                aux transactions comparables et à l&apos;avis de négociation.
              </p>
              <input
                type="text" required placeholder="Prénom" autoComplete="given-name"
                value={firstName} onChange={e => setFirstName(e.target.value)}
                className={inputClass}
              />
              <input
                type="email" required placeholder="Adresse e-mail" autoComplete="email"
                value={email} onChange={e => setEmail(e.target.value)}
                className={inputClass}
              />
              <input
                type="text" required placeholder="Ville" autoComplete="address-level2"
                value={leadCity} onChange={e => setLeadCity(e.target.value)}
                className={inputClass}
              />
              <button type="submit" className={buttonClass}>
                Recevoir mon code
              </button>
            </form>
          )}

          {step === "SENDING_OTP" && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <Loader2 size={24} className="text-blue-400 animate-spin" />
              <p className="text-sm text-gray-300">Envoi du code de vérification à {email}…</p>
            </div>
          )}

          {step === "VERIFY" && (
            <form onSubmit={handleVerify} className="space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Mail size={14} className="text-blue-400" />
                <p className="text-white font-bold text-sm">Code envoyé !</p>
              </div>
              <p className="text-gray-400 text-xs leading-relaxed">
                Saisissez le code à 6 chiffres envoyé à {email}.
              </p>
              <input
                type="text" inputMode="numeric" maxLength={6} autoFocus
                placeholder="••••••"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className={`${inputClass} text-center text-xl tracking-[0.4em]`}
              />
              {error && (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5">
                  {error}
                </p>
              )}
              {info && (
                <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2.5">
                  {info}
                </p>
              )}
              <button type="submit" disabled={otp.length !== 6 || loading} className={buttonClass}>
                {loading ? <><Loader2 size={15} className="animate-spin" /> Vérification…</> : "Vérifier"}
              </button>
              {error === "Code expiré. Renvoyer un nouveau code." && (
                <button type="button" onClick={() => void sendOtp()} className="w-full text-xs text-blue-400 hover:text-blue-300 flex items-center justify-center gap-1.5">
                  <RotateCcw size={12} /> Renvoyer un nouveau code
                </button>
              )}
              <button type="button" onClick={resetToForm} className="w-full text-[11px] text-gray-500 hover:text-gray-400 underline">
                Modifier mes informations
              </button>
            </form>
          )}

          {step === "ERROR" && (
            <div className="space-y-3 text-center py-2">
              <AlertCircle size={24} className="text-red-400 mx-auto" />
              <p className="text-sm text-red-300">{error}</p>
              <button onClick={() => void sendOtp()} className={buttonClass}>
                <RotateCcw size={14} /> Réessayer
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
