"use client";
import { useState, useTransition } from "react";
import {
  Eye, Heart, TrendingUp, Check, X,
  Star, Zap, FileText, CheckCircle2, MessageSquare, Calendar,
} from "lucide-react";
import DossierJuridique from "../../components/DossierJuridique";
import PropertyForm    from "../../components/PropertyForm";
import PaywallModal    from "../../components/PaywallModal";
import { acceptOffer, refuseOffer } from "../actions/communication";

/* ── Serialized offer type (dates as ISO strings for client boundary) ────── */
export interface SerializedOffer {
  id:               string;
  amount:           number;
  buyerName:        string;
  buyerEmail:       string;
  financingDetails: string | null;
  status:           "PENDING" | "ACCEPTED" | "REJECTED";
  propertyId:       string;
  propertyTitle:    string;
  propertyCity:     string;
  createdAt:        string;
}

/* ── Individual offer card ───────────────────────────────────────────────── */
function OfferCard({ offer }: { offer: SerializedOffer }) {
  const [pending, startTransition] = useTransition();
  /* optimistic local status so UI updates immediately without full reload */
  const [localStatus, setLocalStatus] = useState<SerializedOffer["status"]>(offer.status);

  function handleAccept() {
    startTransition(async () => {
      const res = await acceptOffer(offer.id);
      if (res.success) setLocalStatus("ACCEPTED");
    });
  }

  function handleRefuse() {
    startTransition(async () => {
      const res = await refuseOffer(offer.id);
      if (res.success) setLocalStatus("REJECTED");
    });
  }

  return (
    <div className="p-5 border border-slate-100 bg-white rounded-xl shadow-sm hover:border-blue-200 transition">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-bold text-lg text-slate-900">{offer.buyerName}</h3>
          <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[220px]">{offer.propertyTitle}</p>
          {offer.financingDetails && (
            <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-md inline-block mt-1">
              {offer.financingDetails}
            </span>
          )}
        </div>
        <span className="text-2xl font-black text-[#1E3A8A] shrink-0 ml-3">
          {offer.amount.toLocaleString("fr-FR")} €
        </span>
      </div>

      {localStatus === "PENDING" ? (
        <div className="flex gap-3 mt-5 pt-4 border-t border-slate-100">
          <button
            onClick={handleAccept}
            disabled={pending}
            className="flex-1 bg-[#10B981] hover:bg-emerald-600 disabled:opacity-50 text-white py-2.5 rounded-lg font-bold transition flex justify-center items-center gap-2 shadow-md shadow-emerald-200 active:scale-[.98]"
          >
            <Check className="w-4 h-4" strokeWidth={3} />
            {pending ? "…" : "Accepter"}
          </button>
          <button
            onClick={handleRefuse}
            disabled={pending}
            className="flex-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-600 py-2.5 rounded-lg font-bold transition flex justify-center items-center gap-2 active:scale-[.98]"
          >
            <X className="w-4 h-4" strokeWidth={3} />
            {pending ? "…" : "Refuser"}
          </button>
        </div>
      ) : (
        <div className={`mt-4 pt-4 border-t border-slate-100 text-sm font-bold flex items-center gap-2 ${
          localStatus === "ACCEPTED" ? "text-emerald-600" : "text-red-500"
        }`}>
          {localStatus === "ACCEPTED"
            ? <><CheckCircle2 className="w-4 h-4" /> Offre acceptée</>
            : <><X           className="w-4 h-4" /> Offre refusée</>
          }
        </div>
      )}
    </div>
  );
}

/* ── Main client component ───────────────────────────────────────────────── */
interface Props {
  sellerName: string;
  offers:     SerializedOffer[];
}

export default function EspaceVendeurClient({ sellerName, offers }: Props) {
  const [isPremium,      setIsPremium]      = useState(false);
  const [showPaywall,    setShowPaywall]    = useState(false);
  const [paywallFeature, setPaywallFeature] = useState("");
  const [isBoosted,      setIsBoosted]      = useState(false);

  function openPaywall(feature: string) {
    setPaywallFeature(feature);
    setShowPaywall(true);
  }

  function handleUnlock() {
    setIsPremium(true);
    setShowPaywall(false);
  }

  const pendingOffers   = offers.filter(o => o.status === "PENDING");
  const resolvedOffers  = offers.filter(o => o.status !== "PENDING");

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Bonjour, {sellerName}</h1>
        <p className="text-slate-500 mt-1 font-medium">Voici l'activité de votre annonce aujourd'hui.</p>
      </div>

      {/* ── Premium Status Banner ── */}
      {isPremium ? (
        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 shadow-lg shadow-amber-100/50 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
            <Star className="w-6 h-6 text-amber-500" fill="currentColor" />
          </div>
          <div>
            <p className="font-black text-amber-900 text-base">Compte Premium actif ✓</p>
            <p className="text-amber-700 text-sm mt-0.5">Toutes les fonctionnalités sont déverrouillées</p>
          </div>
          <div className="ml-auto text-right shrink-0">
            <p className="text-xs font-bold text-amber-600 uppercase tracking-widest">Économie réalisée</p>
            <p className="text-2xl font-black text-amber-900">10 000 €</p>
            <p className="text-[10px] text-amber-600">de frais d'agence évités</p>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-slate-50 to-blue-50/50 border border-slate-200 shadow-lg shadow-slate-100/50 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
            <Zap className="w-6 h-6 text-slate-400" />
          </div>
          <div>
            <p className="font-black text-slate-900 text-base">Compte Gratuit</p>
            <p className="text-slate-500 text-sm mt-0.5">
              Publication gratuite · Outils premium disponibles à 19€
            </p>
          </div>
          <button
            onClick={() => openPaywall("Jumo Premium")}
            className="ml-auto shrink-0 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-amber-200 active:scale-[.98]"
          >
            Passer à Premium — 19€
          </button>
        </div>
      )}

      {/* Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200 shadow-lg shadow-slate-200/40 rounded-2xl p-6 flex items-center gap-5 transition hover:-translate-y-1">
          <div className="p-4 bg-blue-50 rounded-xl text-blue-600"><Eye className="w-6 h-6" /></div>
          <div>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Vues (7j)</p>
            <p className="text-3xl font-black text-slate-900">245</p>
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200 shadow-lg shadow-slate-200/40 rounded-2xl p-6 flex items-center gap-5 transition hover:-translate-y-1">
          <div className="p-4 bg-pink-50 rounded-xl text-pink-600"><Heart className="w-6 h-6" /></div>
          <div>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Favoris</p>
            <p className="text-3xl font-black text-slate-900">18</p>
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200 shadow-lg shadow-slate-200/40 rounded-2xl p-6 flex items-center gap-5 transition hover:-translate-y-1">
          <div className="p-4 bg-emerald-50 rounded-xl text-[#10B981]"><TrendingUp className="w-6 h-6" /></div>
          <div>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Valeur DVF</p>
            <p className="text-3xl font-black text-slate-900">340 000 €</p>
          </div>
        </div>
      </div>

      {/* ── Premium Features ── */}
      <div>
        <div className="mb-5">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Outils Premium</h2>
          <p className="text-slate-500 text-sm mt-1 font-medium">
            Sans commission · Paiement unique · Déblocage immédiat
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

          {/* A — Boost Listing */}
          <div className={`bg-white/80 backdrop-blur-xl border rounded-2xl p-6 shadow-lg transition-all ${
            isBoosted ? "border-amber-200 shadow-amber-100/50" : "border-slate-200 shadow-slate-200/40"
          }`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${isBoosted ? "bg-amber-100" : "bg-slate-100"}`}>
              <TrendingUp className={`w-5 h-5 ${isBoosted ? "text-amber-600" : "text-slate-400"}`} />
            </div>
            <h3 className="font-black text-slate-900 mb-1">Boost de visibilité</h3>
            <p className="text-slate-500 text-sm mb-4 leading-relaxed">
              {isBoosted
                ? "Votre annonce est propulsée en tête des résultats pendant 30 jours."
                : "Propulsez votre annonce en haut de la carte et des résultats de recherche."}
            </p>
            {isBoosted ? (
              <div className="flex items-center gap-2 text-amber-600 font-bold text-sm">
                <Star size={15} fill="currentColor" /> Boost actif · 30 jours restants
              </div>
            ) : (
              <button
                onClick={() => { if (!isPremium) openPaywall("Boost de visibilité"); else setIsBoosted(true); }}
                className="w-full py-3 bg-slate-900 hover:bg-slate-700 text-white font-bold rounded-xl text-sm transition-all active:scale-[.98]"
              >
                Activer le Boost
              </button>
            )}
          </div>

          {/* B — Premium Badge */}
          <div className={`bg-white/80 backdrop-blur-xl border rounded-2xl p-6 shadow-lg transition-all ${
            isPremium ? "border-[#1E3A8A]/30 shadow-blue-100/50" : "border-slate-200 shadow-slate-200/40"
          }`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${isPremium ? "bg-blue-50" : "bg-slate-100"}`}>
              <Star className={`w-5 h-5 ${isPremium ? "text-[#1E3A8A]" : "text-slate-400"}`} fill={isPremium ? "currentColor" : "none"} />
            </div>
            <h3 className="font-black text-slate-900 mb-1">Badge Premium</h3>
            <p className="text-slate-500 text-sm mb-4 leading-relaxed">
              {isPremium
                ? "Badge ★ Premium affiché sur votre annonce — crédibilité maximale."
                : "Affichez un badge Premium pour inspirer confiance aux acheteurs."}
            </p>
            {isPremium ? (
              <div className="flex items-center gap-2 text-[#1E3A8A] font-bold text-sm">
                <CheckCircle2 size={15} /> Badge actif sur votre annonce
              </div>
            ) : (
              <button
                onClick={() => openPaywall("Badge Premium")}
                className="w-full py-3 bg-slate-900 hover:bg-slate-700 text-white font-bold rounded-xl text-sm transition-all active:scale-[.98]"
              >
                Activer le badge
              </button>
            )}
          </div>

          {/* C — Instant Notary Pack */}
          <div className={`bg-white/80 backdrop-blur-xl border rounded-2xl p-6 shadow-lg transition-all ${
            isPremium ? "border-emerald-200 shadow-emerald-100/50" : "border-slate-200 shadow-slate-200/40"
          }`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${isPremium ? "bg-emerald-50" : "bg-slate-100"}`}>
              <FileText className={`w-5 h-5 ${isPremium ? "text-emerald-600" : "text-slate-400"}`} />
            </div>
            <h3 className="font-black text-slate-900 mb-1">Pack Notaire Instantané</h3>
            <p className="text-slate-500 text-sm mb-4 leading-relaxed">
              {isPremium
                ? "Envoi automatique du dossier complet au notaire sous 24h."
                : "Fast-track de votre dossier notarial complet sous 24h."}
            </p>
            {isPremium ? (
              <button className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 active:scale-[.98]">
                <FileText size={15} /> Générer le dossier
              </button>
            ) : (
              <button
                onClick={() => openPaywall("Pack Notaire Instantané")}
                className="w-full py-3 bg-slate-900 hover:bg-slate-700 text-white font-bold rounded-xl text-sm transition-all active:scale-[.98]"
              >
                Débloquer
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Split Content: Offers & Legal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* ── Offers (real data) ── */}
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200 shadow-xl shadow-slate-200/50 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-900">Offres d'Achat</h2>
            {pendingOffers.length > 0 && (
              <span className="text-xs font-bold px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full">
                {pendingOffers.length} en attente
              </span>
            )}
          </div>

          {offers.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                <MessageSquare className="w-5 h-5 text-slate-400" />
              </div>
              <p className="text-slate-500 text-sm font-medium">Aucune offre reçue</p>
              <p className="text-slate-400 text-xs mt-1">Les offres des acheteurs apparaîtront ici</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Pending offers first */}
              {pendingOffers.map(offer => (
                <OfferCard key={offer.id} offer={offer} />
              ))}
              {/* Then resolved (collapsed visually) */}
              {resolvedOffers.length > 0 && (
                <>
                  {pendingOffers.length > 0 && (
                    <div className="flex items-center gap-2 pt-1">
                      <div className="flex-1 h-px bg-slate-100" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Traitées
                      </span>
                      <div className="flex-1 h-px bg-slate-100" />
                    </div>
                  )}
                  {resolvedOffers.map(offer => (
                    <OfferCard key={offer.id} offer={offer} />
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        <DossierJuridique />
      </div>

      {/* ── Visit requests summary ── */}
      {offers.length > 0 && (
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200 shadow-lg shadow-slate-200/40 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-1">
            <Calendar className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-slate-900">Activité récente</h2>
          </div>
          <p className="text-slate-400 text-xs ml-8 mb-0">
            {offers.length} offre{offers.length > 1 ? "s" : ""} reçue{offers.length > 1 ? "s" : ""} au total ·{" "}
            {pendingOffers.length} en attente de réponse
          </p>
        </div>
      )}

      {/* Publish a new listing */}
      <div>
        <div className="mb-5">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Publier une annonce</h2>
          <p className="text-slate-500 text-sm mt-1 font-medium">
            FairScore DVF généré automatiquement · Visible immédiatement sur la carte
          </p>
        </div>
        <div className="max-w-2xl">
          <PropertyForm />
        </div>
      </div>

      {/* Paywall */}
      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        featureName={paywallFeature}
        onUnlock={handleUnlock}
      />
    </div>
  );
}
