"use client";
import { useState } from "react";
import { X, Star, Zap, FileText, TrendingUp, CheckCircle2 } from "lucide-react";

interface PaywallModalProps {
  isOpen:      boolean;
  onClose:     () => void;
  featureName: string;
  onUnlock:    () => void;
  price?:      string;
}

type PayState = "idle" | "loading" | "done";

export default function PaywallModal({
  isOpen,
  onClose,
  featureName,
  onUnlock,
  price = "19€",
}: PaywallModalProps) {
  const [payState, setPayState] = useState<PayState>("idle");

  async function handlePay() {
    setPayState("loading");
    await new Promise(r => setTimeout(r, 1500));
    setPayState("done");
    await new Promise(r => setTimeout(r, 700));
    onUnlock();
    setPayState("idle");
  }

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60]"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none">
        <div className="w-full max-w-md bg-gray-950 border border-white/10 rounded-3xl shadow-2xl overflow-hidden pointer-events-auto">

          {/* Close */}
          <div className="flex justify-end px-5 pt-5">
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-white/[0.06] text-gray-500 hover:text-white transition"
            >
              <X size={18} />
            </button>
          </div>

          {/* Header */}
          <div className="px-7 pb-2 text-center -mt-2">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
              <Star className="w-7 h-7 text-amber-400" fill="currentColor" />
            </div>
            <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-2">
              Fonctionnalité Premium
            </p>
            <h2 className="text-2xl font-black text-white tracking-tight">{featureName}</h2>
          </div>

          {/* Value proposition */}
          <div className="mx-6 mt-5 bg-gradient-to-br from-blue-600/15 to-emerald-600/10 border border-white/10 rounded-2xl p-5 text-center">
            <p className="text-white/50 text-xs font-medium mb-1">
              Les vendeurs économisent en moyenne
            </p>
            <p className="text-4xl font-black text-emerald-400 tracking-tighter">10 000 €</p>
            <p className="text-white/50 text-xs font-medium mt-1">
              de frais d'agence grâce à Jumo-Immo
            </p>
          </div>

          {/* Feature list */}
          <div className="px-6 pt-5 space-y-2.5">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">
              Inclus dans Jumo Premium
            </p>
            {[
              { icon: TrendingUp, label: "Boost de visibilité · top du classement et de la carte" },
              { icon: Star,       label: "Badge Premium visible sur votre annonce" },
              { icon: FileText,   label: "Pack Notaire Instantané · dossier transmis en 24h" },
              { icon: Zap,        label: "Statistiques avancées et alertes acheteurs en temps réel" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                  <Icon size={13} className="text-blue-400" />
                </div>
                <p className="text-sm text-gray-300 font-medium leading-snug">{label}</p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="px-6 pt-6 pb-7 space-y-3">
            <button
              onClick={handlePay}
              disabled={payState !== "idle"}
              className={[
                "w-full py-4 rounded-2xl font-black text-sm text-white transition-all",
                "flex items-center justify-center gap-2 shadow-lg",
                "disabled:cursor-not-allowed",
                payState === "done"
                  ? "bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-emerald-500/30"
                  : "bg-gradient-to-br from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 shadow-amber-500/30",
              ].join(" ")}
            >
              {payState === "loading" && (
                <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              )}
              {payState === "done"   && <CheckCircle2 size={16} />}
              {payState === "idle"   && <Star size={16} fill="currentColor" />}

              {payState === "loading" && "Traitement en cours…"}
              {payState === "done"    && "Premium activé !"}
              {payState === "idle"    && `Passer à Premium — ${price}`}
            </button>

            <button
              onClick={onClose}
              className="w-full py-2.5 text-gray-600 hover:text-gray-400 text-sm font-medium transition"
            >
              Non merci, continuer sans premium
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
