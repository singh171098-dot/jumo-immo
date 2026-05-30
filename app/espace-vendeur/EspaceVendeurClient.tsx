"use client";
import { useState, useTransition } from "react";
import { signOut } from "next-auth/react";
import {
  Eye, TrendingUp, Check, X,
  Star, Zap, FileText, CheckCircle2, MessageSquare, Calendar,
  LayoutDashboard, Home, Inbox, LogOut, Hammer, ChevronRight,
} from "lucide-react";
import DossierJuridique from "../../components/DossierJuridique";
import PropertyForm    from "../../components/PropertyForm";
import TravauxModal    from "../../components/TravauxModal";
import { acceptOffer, refuseOffer } from "../actions/communication";

/* ── Types ───────────────────────────────────────────────────────────────── */
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

type Tab = "dashboard" | "annonce" | "dossier" | "offres";

/* ── Individual offer card (unchanged) ───────────────────────────────────── */
function OfferCard({ offer }: { offer: SerializedOffer }) {
  const [pending, startTransition] = useTransition();
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
  sellerName:    string;
  sellerEmail:   string;
  offers:        SerializedOffer[];
  totalViews:    number;
  visitCount:    number;
  messageCount:  number;
}

const NAV: { tab: Tab; icon: React.ReactNode; label: string }[] = [
  { tab: "dashboard", icon: <LayoutDashboard className="w-5 h-5" />, label: "Tableau de bord"  },
  { tab: "annonce",   icon: <Home            className="w-5 h-5" />, label: "Mon Annonce"      },
  { tab: "dossier",   icon: <FileText        className="w-5 h-5" />, label: "Dossier Juridique" },
  { tab: "offres",    icon: <Inbox           className="w-5 h-5" />, label: "Offres reçues"    },
];

export default function EspaceVendeurClient({ sellerName, sellerEmail, offers, totalViews, visitCount, messageCount }: Props) {
  const [isBoosted,    setIsBoosted]    = useState(false);
  const [activeTab,    setActiveTab]    = useState<Tab>("dashboard");
  const [travauxOpen,  setTravauxOpen]  = useState(false);

  const pendingOffers  = offers.filter(o => o.status === "PENDING");
  const resolvedOffers = offers.filter(o => o.status !== "PENDING");

  return (
    <>
    <TravauxModal
      isOpen={travauxOpen}
      onClose={() => setTravauxOpen(false)}
      userName={sellerName}
      userEmail={sellerEmail}
    />
    <div className="min-h-screen flex bg-slate-50 font-sans">

      {/* ── Royal Blue Sidebar ── */}
      <aside className="w-64 bg-[#1E3A8A] text-white flex flex-col fixed h-full shadow-2xl z-20">
        <div className="px-5 py-4 border-b border-blue-800/50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Jumo-Immo" className="h-9 w-auto" style={{ mixBlendMode: "screen" }} />
          <p className="text-blue-200 text-[10px] mt-2 uppercase tracking-widest font-bold">Espace Vendeur</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {NAV.map(({ tab, icon, label }) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition text-left ${
                activeTab === tab
                  ? "bg-white/10 text-white shadow-inner"
                  : "text-blue-200 hover:bg-white/5 hover:text-white"
              }`}
            >
              {icon} {label}
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-blue-800/50">
          <button
            onClick={() => signOut({ redirectTo: "/" })}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition text-left text-blue-300/70 hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut className="w-5 h-5" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 ml-64 p-8">
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

          {/* Header — always visible */}
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Bonjour, {sellerName}</h1>
            <p className="text-slate-500 mt-1 font-medium">Voici l'activité de votre annonce aujourd'hui.</p>
          </div>

          {/* ══════════════ DASHBOARD TAB ══════════════ */}
          {activeTab === "dashboard" && (
            <>
              {/* Platform Banner */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-[#1E3A8A]/20 shadow-lg shadow-blue-100/50 rounded-2xl p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                  <Zap className="w-6 h-6 text-[#1E3A8A]" />
                </div>
                <div>
                  <p className="font-black text-[#1E3A8A] text-base">Jumo-Immo · 100% Gratuit</p>
                  <p className="text-blue-700 text-sm mt-0.5">
                    Publication gratuite · Outils professionnels inclus · 0% de commission
                  </p>
                </div>
                <div className="ml-auto text-right shrink-0">
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-widest">Économie réalisée</p>
                  <p className="text-2xl font-black text-[#1E3A8A]">10 000 €</p>
                  <p className="text-[10px] text-blue-600">de frais d'agence évités</p>
                </div>
              </div>

              {/* Analytics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white/80 backdrop-blur-xl border border-slate-200 shadow-lg shadow-slate-200/40 rounded-2xl p-6 flex items-center gap-5 transition hover:-translate-y-1">
                  <div className="p-4 bg-blue-50 rounded-xl text-blue-600"><Eye className="w-6 h-6" /></div>
                  <div>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Vues totales</p>
                    <p className="text-3xl font-black text-slate-900">{totalViews.toLocaleString("fr-FR")}</p>
                  </div>
                </div>
                <div className="bg-white/80 backdrop-blur-xl border border-slate-200 shadow-lg shadow-slate-200/40 rounded-2xl p-6 flex items-center gap-5 transition hover:-translate-y-1">
                  <div className="p-4 bg-pink-50 rounded-xl text-pink-600"><MessageSquare className="w-6 h-6" /></div>
                  <div>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Messages</p>
                    <p className="text-3xl font-black text-slate-900">{messageCount}</p>
                  </div>
                </div>
                <div className="bg-white/80 backdrop-blur-xl border border-slate-200 shadow-lg shadow-slate-200/40 rounded-2xl p-6 flex items-center gap-5 transition hover:-translate-y-1">
                  <div className="p-4 bg-emerald-50 rounded-xl text-[#10B981]"><Calendar className="w-6 h-6" /></div>
                  <div>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Visites</p>
                    <p className="text-3xl font-black text-slate-900">{visitCount}</p>
                  </div>
                </div>
              </div>

              {/* ── Performance & Engagement ── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Performance */}
                <div className="bg-white/80 backdrop-blur-xl border border-slate-200 shadow-lg shadow-slate-200/40 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                      <TrendingUp className="w-5 h-5 text-[#1E3A8A]" />
                    </div>
                    <div>
                      <p className="font-black text-slate-900 text-base leading-tight">Performance</p>
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">7 derniers jours</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {[
                      { label: "Vues de l'annonce",     value: totalViews.toLocaleString("fr-FR"), badge: "Total cumulé",    badgeColor: "text-emerald-700 bg-emerald-100" },
                      { label: "Demandes reçues",        value: String(messageCount),               badge: "Messages reçus",  badgeColor: "text-blue-700 bg-blue-100"       },
                      { label: "Visites programmées",    value: String(visitCount),                 badge: "Sur site",        badgeColor: "text-purple-700 bg-purple-100"   },
                      { label: "Offres reçues",          value: String(offers.length),              badge: offers.length > 0 ? `${pendingOffers.length} en attente` : "Aucune en attente", badgeColor: offers.length > 0 ? "text-amber-700 bg-amber-100" : "text-slate-500 bg-slate-100" },
                    ].map(row => (
                      <div key={row.label} className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
                        <span className="text-sm text-slate-600 font-medium">{row.label}</span>
                        <div className="flex items-center gap-2.5">
                          <span className="text-lg font-black text-slate-900">{row.value}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${row.badgeColor}`}>
                            {row.badge}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Engagement */}
                <div className="bg-white/80 backdrop-blur-xl border border-slate-200 shadow-lg shadow-slate-200/40 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                      <MessageSquare className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-black text-slate-900 text-base leading-tight">Engagement</p>
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Comportement acheteurs</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {[
                      { label: "Clics sur les photos",     value: "89 %", bar: 89, color: "bg-blue-500"    },
                      { label: "Taux de contact",           value: "4,9 %", bar: 5,  color: "bg-emerald-500" },
                    ].map(row => (
                      <div key={row.label}>
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-sm text-slate-600 font-medium">{row.label}</span>
                          <span className="text-sm font-black text-slate-900">{row.value}</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${row.color} rounded-full transition-all duration-700`}
                            style={{ width: `${row.bar}%` }}
                          />
                        </div>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-sm text-slate-600 font-medium">Délai moyen avant contact</span>
                      <div className="text-right">
                        <span className="text-lg font-black text-slate-900">18h</span>
                        <p className="text-[10px] text-slate-400">après consultation</p>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Avantages Jumo-Immo */}
              <div>
                <div className="mb-5">
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Vos avantages Jumo-Immo</h2>
                  <p className="text-slate-500 text-sm mt-1 font-medium">
                    Sans commission · Outils professionnels inclus · 100% gratuit
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

                  {/* A — Boost Listing */}
                  <div className={`bg-white/80 backdrop-blur-xl border rounded-2xl p-6 shadow-lg transition-all ${
                    isBoosted ? "border-amber-200 shadow-amber-100/50" : "border-slate-200 shadow-slate-200/40"
                  }`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${isBoosted ? "bg-amber-100" : "bg-blue-50"}`}>
                      <TrendingUp className={`w-5 h-5 ${isBoosted ? "text-amber-600" : "text-[#1E3A8A]"}`} />
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
                        onClick={() => setIsBoosted(true)}
                        className="w-full py-3 bg-[#1E3A8A] hover:bg-blue-900 text-white font-bold rounded-xl text-sm transition-all active:scale-[.98]"
                      >
                        Activer le Boost
                      </button>
                    )}
                  </div>

                  {/* B — Vendeur certifié */}
                  <div className="bg-white/80 backdrop-blur-xl border border-[#1E3A8A]/20 shadow-lg shadow-blue-100/30 rounded-2xl p-6">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
                      <CheckCircle2 className="w-5 h-5 text-[#1E3A8A]" />
                    </div>
                    <h3 className="font-black text-slate-900 mb-1">Vendeur certifié</h3>
                    <p className="text-slate-500 text-sm mb-4 leading-relaxed">
                      Badge ✓ Particulier affiché sur votre annonce — crédibilité maximale auprès des acheteurs.
                    </p>
                    <div className="flex items-center gap-2 text-[#1E3A8A] font-bold text-sm">
                      <CheckCircle2 size={15} /> Actif sur votre annonce
                    </div>
                  </div>

                  {/* C — Pack Notaire */}
                  <div className="bg-white/80 backdrop-blur-xl border border-emerald-200 shadow-lg shadow-emerald-100/30 rounded-2xl p-6">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mb-4">
                      <FileText className="w-5 h-5 text-emerald-600" />
                    </div>
                    <h3 className="font-black text-slate-900 mb-1">Pack Notaire Instantané</h3>
                    <p className="text-slate-500 text-sm mb-4 leading-relaxed">
                      Envoi automatique du dossier complet au notaire sous 24h.
                    </p>
                    <button className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 active:scale-[.98]">
                      <FileText size={15} /> Générer le dossier
                    </button>
                  </div>

                </div>
              </div>

              {/* ── Travaux CTA ── */}
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 shadow-lg shadow-amber-100/50 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                  <Hammer className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-amber-900 text-base">Besoin de travaux avant la vente ?</p>
                  <p className="text-amber-700 text-sm mt-0.5">
                    Valorisez votre bien avec des professionnels qualifiés · Devis via Jumo
                  </p>
                </div>
                <button
                  onClick={() => setTravauxOpen(true)}
                  className="shrink-0 flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-amber-200 active:scale-[.98]"
                >
                  Demander un devis <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </>
          )}

          {/* ══════════════ ANNONCE TAB ══════════════ */}
          {activeTab === "annonce" && (
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
          )}

          {/* ══════════════ DOSSIER TAB ══════════════ */}
          {activeTab === "dossier" && <DossierJuridique />}

          {/* ══════════════ OFFRES TAB ══════════════ */}
          {activeTab === "offres" && (
            <div className="space-y-6">
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
                  <div className="text-center text-slate-400 py-10 font-medium">
                    Aucune offre pour le moment.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingOffers.map(offer => (
                      <OfferCard key={offer.id} offer={offer} />
                    ))}
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
            </div>
          )}

        </div>
      </main>
    </div>
    </>
  );
}
