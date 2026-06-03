"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Home, FileText, ShieldCheck, KeyRound,
  CheckCircle2, Circle, ChevronRight, Calendar,
  Heart, MapPin, Maximize2, Target, Pencil, Sparkles,
  TrendingUp, Zap, Hammer, MessageSquare, Building2, Clock,
  LayoutDashboard, LogOut, BarChart2,
} from "lucide-react";
import { signOut } from "next-auth/react";
import SRUCountdown from "../../components/SRUCountdown";
import BuyerCriteriaModal from "../../components/BuyerCriteriaModal";
import type { BuyerCriteriaData } from "../../components/BuyerCriteriaModal";
import TravauxModal from "../../components/TravauxModal";
import ChatPanel from "../../components/ChatPanel";

/* ── Tab type ─────────────────────────────────────────────────────────────── */
type Tab = "dashboard" | "bien-cible" | "offres" | "visites" | "messagerie" | "documents" | "favoris";

const NAV: { id: Tab; icon: React.ReactNode; label: string }[] = [
  { id: "dashboard",  icon: <LayoutDashboard size={17} />, label: "Tableau de bord" },
  { id: "bien-cible", icon: <Target          size={17} />, label: "Mon bien cible"  },
  { id: "offres",     icon: <FileText        size={17} />, label: "Mes offres"      },
  { id: "visites",    icon: <Calendar        size={17} />, label: "Mes visites"     },
  { id: "messagerie", icon: <MessageSquare   size={17} />, label: "Messagerie"      },
  { id: "documents",  icon: <ShieldCheck     size={17} />, label: "Documents"       },
  { id: "favoris",    icon: <Heart           size={17} />, label: "Mes favoris"     },
];

/* ── Exported types ───────────────────────────────────────────────────────── */

export interface BuyerConversation {
  propertyId:    string;
  propertyTitle: string;
  propertyCover: string;
  propertyCity:  string;
  otherUserId:   string;
  otherUserName: string;
  lastMessage:   string;
  lastActivity:  string;
  unreadCount:   number;
}

export interface SerializedBuyerCriteria {
  targetCities:  string[];
  maxPrice:      number | null;
  minSurface:    number | null;
  minRooms:      number | null;
  propertyTypes: string[];
  wantsBalcony:  boolean;
  wantsParking:  boolean;
}

export interface SavedProperty {
  id:            string;
  title:         string;
  price:         number;
  surface:       number;
  rooms:         number;
  city:          string;
  images:        string[];
  fairScore:     number;
  cityAvgPerSqm: number;
  dpe:           string;
  status:        string;
}

export interface RecommendedProperty extends SavedProperty {
  matchScore: number;
}

/* ── Animation variants ───────────────────────────────────────────────────── */
const fadeUp = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" as const } },
};
const stagger = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.07 } },
};

/* ── Transaction steps ────────────────────────────────────────────────────── */
const STEPS = [
  { icon: FileText,    label: "Offre d'achat",   desc: "Envoyée · Réponse sous 48h", key: "offer"     },
  { icon: ShieldCheck, label: "Compromis",        desc: "Délai SRU 10 jours",         key: "compromis" },
  { icon: KeyRound,    label: "Acte authentique", desc: "Signature notaire",           key: "acte"      },
] as const;

const OFFER = {
  title:     "Appartement 3 pièces · Paris 11e",
  price:     "418 000 €",
  validity:  "8 jours",
  fairScore: "82 / 100",
  seller:    "Thomas Lefèvre",
  status:    "En attente vendeur",
};

const DOCS = [
  "Pièce d'identité",
  "Justificatif d'état civil",
  "Fiche d'état civil",
  "Preuve de financement",
];

/* ── FairScore helpers ────────────────────────────────────────────────────── */
function fairScoreInfo(score: number) {
  if (score >= 80) return { label: "Excellente affaire", color: "text-emerald-400", barColor: "bg-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/20" };
  if (score >= 60) return { label: "Prix du marché",     color: "text-blue-400",    barColor: "bg-blue-500",    bg: "bg-blue-500/10 border-blue-400/20"       };
  return               { label: "Surévalué",            color: "text-red-400",     barColor: "bg-red-500",     bg: "bg-red-500/10 border-red-500/20"         };
}

/* ── Placeholder for unimplemented sections ───────────────────────────────── */
function Placeholder({ icon: Icon, title, subtitle }: {
  icon:     React.ComponentType<{ size?: number; className?: string }>;
  title:    string;
  subtitle: string;
}) {
  return (
    <div className="rounded-2xl bg-white/[0.04] backdrop-blur-sm border border-white/10 p-14 text-center">
      <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto mb-5">
        <Icon size={28} className="text-gray-600" />
      </div>
      <p className="text-white font-black text-lg mb-2">{title}</p>
      <p className="text-gray-500 text-sm max-w-xs mx-auto leading-relaxed">
        {subtitle}
      </p>
      <p className="text-gray-700 text-xs mt-4">
        Cette fonctionnalité sera bientôt disponible dans votre espace Jumo Immo.
      </p>
    </div>
  );
}

/* ── Saved property card ──────────────────────────────────────────────────── */
function SavedPropertyCard({ p }: { p: SavedProperty }) {
  const cover = p.images[0] ?? "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=70";
  const info  = fairScoreInfo(p.fairScore);

  return (
    <Link
      href={`/annonces/${p.id}`}
      className="group block rounded-2xl bg-white/[0.04] border border-white/10 overflow-hidden hover:border-white/20 transition-all duration-300 hover:-translate-y-1"
    >
      <div className="relative h-40 overflow-hidden bg-gray-900">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={cover} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <span className={`absolute top-3 right-3 text-[10px] font-bold px-2.5 py-1 rounded-full border backdrop-blur-sm ${info.bg} ${info.color}`}>
          {info.label}
        </span>
      </div>
      <div className="p-4">
        <p className="text-white font-bold text-sm leading-snug line-clamp-2 mb-1">{p.title}</p>
        <p className="flex items-center gap-1 text-gray-500 text-xs mb-3"><MapPin size={11} /> {p.city}</p>
        <div className="flex items-center gap-3 text-[10px] text-gray-600 mb-3">
          <span className="flex items-center gap-1"><Maximize2 size={10} /> {p.surface} m²</span>
          <span>{p.rooms} pièces</span>
          <span>DPE {p.dpe}</span>
        </div>
        <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
          <p className="text-white font-black text-base">{p.price.toLocaleString("fr-FR")} €</p>
          <p className="text-gray-600 text-[10px]">{Math.round(p.price / p.surface).toLocaleString("fr-FR")} €/m²</p>
        </div>
        <div className="mt-3">
          <div className="flex justify-between text-[10px] text-gray-700 mb-1">
            <span>FairScore™</span>
            <span className={info.color}>{p.fairScore} / 100</span>
          </div>
          <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
            <div className={`h-full ${info.barColor} rounded-full`} style={{ width: `${p.fairScore}%` }} />
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ── Recommendation card ──────────────────────────────────────────────────── */
function RecommendationCard({ p, index }: { p: RecommendedProperty; index: number }) {
  const cover = p.images[0] ?? "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=70";
  const info  = fairScoreInfo(p.fairScore);

  const matchColor =
    p.matchScore >= 80 ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
    : p.matchScore >= 60 ? "text-blue-400 bg-blue-500/10 border-blue-400/20"
    : "text-amber-400 bg-amber-500/10 border-amber-500/20";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.4, ease: "easeOut" }}
    >
      <Link
        href={`/annonces/${p.id}`}
        className="group block rounded-2xl bg-white/[0.04] border border-white/10 overflow-hidden hover:border-emerald-500/30 hover:bg-white/[0.06] transition-all duration-300 hover:-translate-y-1"
      >
        <div className="relative h-36 overflow-hidden bg-gray-900">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cover} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          <span className={`absolute top-2.5 right-2.5 text-[10px] font-bold px-2 py-1 rounded-full border backdrop-blur-sm ${info.bg} ${info.color}`}>
            {info.label}
          </span>
          <div className="absolute bottom-0 left-0 right-0 px-3 py-2 bg-gradient-to-t from-gray-950/90 to-transparent flex items-center gap-1.5">
            <Zap size={9} className="text-emerald-400 shrink-0" />
            <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider">Recommandé pour vous</span>
          </div>
        </div>
        <div className="p-4">
          <p className="text-white font-bold text-sm leading-snug line-clamp-1 mb-1">{p.title}</p>
          <p className="flex items-center gap-1 text-gray-500 text-xs mb-2.5"><MapPin size={10} /> {p.city}</p>
          <div className="flex items-center gap-3 text-[10px] text-gray-600 mb-2.5">
            <span className="flex items-center gap-1"><Maximize2 size={10} /> {p.surface} m²</span>
            <span>{p.rooms} pièces</span>
            <span>DPE {p.dpe}</span>
          </div>
          <div className="flex items-center justify-between pt-2.5 border-t border-white/[0.06]">
            <p className="text-white font-black text-sm">{p.price.toLocaleString("fr-FR")} €</p>
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${matchColor}`}>
              {p.matchScore}% match
            </span>
          </div>
          <div className="mt-2.5">
            <div className="flex justify-between text-[10px] text-gray-700 mb-1">
              <span>FairScore™</span>
              <span className={info.color}>{p.fairScore} / 100</span>
            </div>
            <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
              <div className={`h-full ${info.barColor} rounded-full`} style={{ width: `${p.fairScore}%` }} />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

/* ── Main component ───────────────────────────────────────────────────────── */
export default function EspaceAcheteurClient({
  userName,
  userEmail,
  userId,
  savedProperties,
  initialCriteria,
  recommendedProperties,
  inbox,
}: {
  userName:              string;
  userEmail:             string;
  userId:                string;
  savedProperties:       SavedProperty[];
  initialCriteria:       SerializedBuyerCriteria | null;
  recommendedProperties: RecommendedProperty[];
  inbox:                 BuyerConversation[];
}) {
  const [activeTab,     setActiveTab]     = useState<Tab>("dashboard");
  const [compromisDate, setCompromisDate] = useState("");
  const [modalOpen,     setModalOpen]     = useState(false);
  const [travauxOpen,   setTravauxOpen]   = useState(false);
  const [activeChatKey, setActiveChatKey] = useState<string | null>(null);
  const [criteria,      setCriteria]      = useState<BuyerCriteriaData | null>(
    initialCriteria && initialCriteria.maxPrice !== null
      ? (initialCriteria as BuyerCriteriaData)
      : null,
  );

  const currentStep    = compromisDate ? 1 : 0;
  const total          = savedProperties.length;
  const excellent      = savedProperties.filter(p => p.fairScore >= 80).length;
  const fairMkt        = savedProperties.filter(p => p.fairScore >= 60 && p.fairScore < 80).length;
  const overprice      = savedProperties.filter(p => p.fairScore < 60).length;
  const avgScore       = total > 0 ? Math.round(savedProperties.reduce((s, p) => s + p.fairScore, 0) / total) : 0;
  const avgPricePerSqm = total > 0 ? Math.round(savedProperties.reduce((s, p) => s + p.price / p.surface, 0) / total) : 0;
  const totalUnread    = inbox.reduce((n, c) => n + c.unreadCount, 0);

  const activeConv = activeChatKey
    ? inbox.find(c => `${c.propertyId}__${c.otherUserId}` === activeChatKey) ?? null
    : null;

  /* ── Tab content renderer ── */
  function renderTab() {
    switch (activeTab) {

      /* ─── DASHBOARD ─────────────────────────────────────────────────────── */
      case "dashboard":
        return (
          <motion.div className="space-y-6" initial="hidden" animate="visible" variants={stagger}>

            {/* Quick stats bar */}
            <motion.div variants={fadeUp} className="grid grid-cols-3 gap-4">
              {[
                { label: "Biens favoris",   value: String(total),        color: "text-blue-400",    accent: "bg-blue-500/10 border-blue-500/20",    onClick: () => setActiveTab("favoris")    },
                { label: "Messages",        value: String(inbox.length), color: "text-emerald-400", accent: "bg-emerald-500/10 border-emerald-500/20", onClick: () => setActiveTab("messagerie") },
                { label: "Messages non lus", value: String(totalUnread),  color: "text-amber-400",   accent: "bg-amber-500/10 border-amber-500/20",   onClick: () => setActiveTab("messagerie") },
              ].map(item => (
                <button
                  key={item.label}
                  onClick={item.onClick}
                  className={`rounded-2xl border p-4 text-left hover:opacity-80 transition ${item.accent}`}
                >
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">{item.label}</p>
                  <p className={`text-3xl font-black ${item.color}`}>{item.value}</p>
                </button>
              ))}
            </motion.div>

            {/* Active offer summary */}
            <motion.div variants={fadeUp} className="rounded-2xl bg-white/[0.04] backdrop-blur-sm border border-white/10 p-6 shadow-xl shadow-black/20">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                  <Home size={20} className="text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-0.5">Offre en cours</p>
                  <p className="text-white font-black text-base leading-tight">{OFFER.title}</p>
                </div>
                <span className="shrink-0 text-xs font-bold px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full">
                  {OFFER.status}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 pt-5 border-t border-white/[0.06]">
                {[
                  { label: "Prix proposé", value: OFFER.price     },
                  { label: "Validité",     value: OFFER.validity  },
                  { label: "FairScore™",   value: OFFER.fairScore },
                ].map(item => (
                  <div key={item.label}>
                    <p className="text-[10px] text-gray-600 uppercase tracking-widest font-bold mb-1">{item.label}</p>
                    <p className="text-xl font-black text-white">{item.value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-white/[0.06] flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-[10px] font-black shrink-0">
                  {OFFER.seller.charAt(0)}
                </div>
                <p className="text-gray-500 text-xs">
                  Vendeur : <span className="text-gray-300 font-semibold">{OFFER.seller}</span>
                </p>
                <button
                  onClick={() => setActiveTab("offres")}
                  className="ml-auto text-[10px] font-bold text-blue-400 hover:underline"
                >
                  Voir les détails →
                </button>
              </div>
            </motion.div>

            {/* Recommendations preview (up to 3) */}
            {recommendedProperties.length > 0 && (
              <motion.div variants={fadeUp} className="rounded-2xl bg-white/[0.04] backdrop-blur-sm border border-white/10 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                      <Sparkles size={15} className="text-emerald-400" />
                    </div>
                    <p className="text-white font-black text-sm">Opportunités recommandées</p>
                  </div>
                  <button onClick={() => setActiveTab("bien-cible")} className="text-[10px] font-bold text-emerald-400 hover:underline">
                    Tout voir →
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {recommendedProperties.slice(0, 3).map((p, i) => <RecommendationCard key={p.id} p={p} index={i} />)}
                </div>
              </motion.div>
            )}

            {/* Market insights */}
            <motion.div variants={fadeUp} className="rounded-2xl bg-white/[0.04] backdrop-blur-sm border border-white/10 p-6">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-5">Insights marché</p>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Prix moyen au m²",          value: total > 0 ? `${avgPricePerSqm.toLocaleString("fr-FR")} €` : "—", sub: total > 0 ? "Moyenne de vos favoris" : "Sauvegardez des biens", color: "text-blue-400"    },
                  { label: "Évolution du marché local",  value: "+2,3 %",   sub: "Sur 12 mois glissants", color: "text-emerald-400" },
                  { label: "Annonces suivies",           value: String(total), sub: total === 1 ? "bien sauvegardé" : "biens sauvegardés", color: "text-amber-400" },
                ].map(item => (
                  <div key={item.label} className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
                    <p className="text-[10px] text-gray-600 uppercase tracking-widest font-bold mb-2 leading-snug">{item.label}</p>
                    <p className={`text-2xl font-black ${item.color}`}>{item.value}</p>
                    <p className="text-[10px] text-gray-700 mt-1">{item.sub}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Travaux CTA */}
            <motion.div variants={fadeUp}>
              <div className="rounded-2xl bg-gradient-to-r from-amber-500/[0.08] to-orange-500/[0.05] border border-amber-500/20 p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                  <Hammer size={20} className="text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-0.5">Services Jumo Immo</p>
                  <p className="text-white font-black text-base leading-tight">Besoin de travaux ?</p>
                  <p className="text-gray-500 text-xs mt-0.5">Obtenez des devis de professionnels qualifiés directement via la plateforme.</p>
                </div>
                <button
                  onClick={() => setTravauxOpen(true)}
                  className="shrink-0 flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-amber-900/30 active:scale-[.98]"
                >
                  Demander un devis <ChevronRight size={14} />
                </button>
              </div>
            </motion.div>

            {/* CTA */}
            <motion.div variants={fadeUp} className="text-center pb-6">
              <p className="text-sm text-gray-600 mb-3">Gérez l'offre, les documents et l'acte via l'assistant complet</p>
              <Link href="/" className="inline-flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-[#1E3A8A] to-blue-600 hover:from-blue-800 hover:to-blue-500 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-blue-900/40 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0">
                <Calendar size={16} /> Accéder à l'assistant d'achat <ChevronRight size={15} />
              </Link>
            </motion.div>
          </motion.div>
        );

      /* ─── MON BIEN CIBLE ─────────────────────────────────────────────────── */
      case "bien-cible":
        return (
          <motion.div className="space-y-6" initial="hidden" animate="visible" variants={stagger}>

            {/* Criteria banner */}
            <motion.div variants={fadeUp}>
              {criteria ? (
                <div className="rounded-2xl bg-gradient-to-r from-blue-500/[0.08] to-emerald-500/[0.06] border border-blue-500/20 p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                        <Target size={20} className="text-blue-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Recherche active</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        </div>
                        <p className="text-white font-black text-base leading-tight mb-2">
                          {criteria.propertyTypes.length > 0 ? criteria.propertyTypes.join(" · ") : "Tous types de bien"}
                        </p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
                          {criteria.targetCities.length > 0 && (
                            <span className="flex items-center gap-1">
                              <MapPin size={10} className="text-blue-400" />
                              {criteria.targetCities.slice(0, 3).join(", ")}
                              {criteria.targetCities.length > 3 && ` +${criteria.targetCities.length - 3}`}
                            </span>
                          )}
                          <span>Budget max : {criteria.maxPrice.toLocaleString("fr-FR")} €</span>
                          <span>Surface min : {criteria.minSurface} m²</span>
                          {criteria.minRooms > 1 && <span>{criteria.minRooms}+ pièces</span>}
                          {criteria.wantsBalcony && <span>Balcon</span>}
                          {criteria.wantsParking && <span>Parking</span>}
                        </div>
                      </div>
                    </div>
                    <button onClick={() => setModalOpen(true)} className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-bold hover:bg-blue-500/20 transition">
                      <Pencil size={13} /> Modifier
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl bg-gradient-to-br from-blue-500/[0.07] via-transparent to-emerald-500/[0.05] border border-white/10 p-6 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-4">
                    <Target size={26} className="text-blue-400" />
                  </div>
                  <h2 className="text-xl font-black text-white mb-2">Définissez votre projet d'achat</h2>
                  <p className="text-gray-500 text-sm mb-5 max-w-md mx-auto leading-relaxed">
                    Laissez notre moteur d'analyse identifier les meilleures opportunités selon vos critères.
                  </p>
                  <button onClick={() => setModalOpen(true)} className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#1E3A8A] to-blue-500 hover:from-blue-900 hover:to-blue-400 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-blue-900/30 hover:-translate-y-0.5">
                    <Sparkles size={15} /> Lancer ma simulation
                  </button>
                </div>
              )}
            </motion.div>

            {/* Full recommendations */}
            <motion.div variants={fadeUp} className="rounded-2xl bg-white/[0.04] backdrop-blur-sm border border-white/10 p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <Sparkles size={15} className="text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-white font-black text-sm">Opportunités recommandées</p>
                    <p className="text-[10px] text-gray-600">
                      {criteria
                        ? recommendedProperties.length > 0
                          ? `${recommendedProperties.length} bien${recommendedProperties.length > 1 ? "s" : ""} · Classés par FairScore`
                          : "Critères actifs · Aucune correspondance disponible"
                        : "Définissez vos critères pour activer le matching"}
                    </p>
                  </div>
                </div>
                {criteria && (
                  <span className={["text-[10px] font-bold px-2.5 py-1 rounded-full border", recommendedProperties.length > 0 ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20 animate-pulse" : "text-gray-500 bg-white/[0.04] border-white/[0.08]"].join(" ")}>
                    {recommendedProperties.length > 0 ? "Actif" : "0 résultat"}
                  </span>
                )}
              </div>

              {!criteria && (
                <div className="text-center py-8 border border-dashed border-white/[0.08] rounded-xl">
                  <TrendingUp size={28} className="text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-600 text-sm font-medium mb-1">Aucune recommandation disponible</p>
                  <p className="text-gray-700 text-xs mb-4">Définissez votre projet pour débloquer les opportunités personnalisées.</p>
                  <button onClick={() => setModalOpen(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl text-sm font-bold hover:bg-blue-500/20 transition">
                    <Target size={13} /> Définir mes critères
                  </button>
                </div>
              )}

              {criteria && recommendedProperties.length === 0 && (
                <div className="text-center py-8 border border-dashed border-white/[0.08] rounded-xl">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
                    <Sparkles size={20} className="text-amber-400" />
                  </div>
                  <p className="text-white font-black text-sm mb-2">Aucune opportunité disponible actuellement</p>
                  <p className="text-gray-500 text-xs max-w-xs mx-auto leading-relaxed mb-5">
                    Aucun bien ne correspond exactement à vos critères pour le moment.
                  </p>
                  <button onClick={() => setModalOpen(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl text-sm font-bold hover:bg-blue-500/20 transition">
                    <Pencil size={13} /> Modifier mes critères
                  </button>
                </div>
              )}

              {criteria && recommendedProperties.length > 0 && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {recommendedProperties.map((p, i) => <RecommendationCard key={p.id} p={p} index={i} />)}
                  </div>
                  <p className="text-[10px] text-gray-700 text-center mt-4 pt-3 border-t border-white/[0.06]">
                    Classés par FairScore™ · Prix · Surface · Analyse DVF Jumo Immo
                  </p>
                </>
              )}
            </motion.div>
          </motion.div>
        );

      /* ─── MES OFFRES ──────────────────────────────────────────────────────── */
      case "offres":
        return (
          <motion.div className="space-y-6" initial="hidden" animate="visible" variants={stagger}>

            {/* Offer summary */}
            <motion.div variants={fadeUp} className="rounded-2xl bg-white/[0.04] backdrop-blur-sm border border-white/10 p-6 shadow-xl shadow-black/20">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                  <Home size={20} className="text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-0.5">Offre en cours</p>
                  <p className="text-white font-black text-base leading-tight">{OFFER.title}</p>
                </div>
                <span className="shrink-0 text-xs font-bold px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full">{OFFER.status}</span>
              </div>
              <div className="grid grid-cols-3 gap-4 pt-5 border-t border-white/[0.06]">
                {[{ label: "Prix proposé", value: OFFER.price }, { label: "Validité", value: OFFER.validity }, { label: "FairScore™", value: OFFER.fairScore }].map(item => (
                  <div key={item.label}>
                    <p className="text-[10px] text-gray-600 uppercase tracking-widest font-bold mb-1">{item.label}</p>
                    <p className="text-xl font-black text-white">{item.value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-white/[0.06] flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-[10px] font-black shrink-0">
                  {OFFER.seller.charAt(0)}
                </div>
                <p className="text-gray-500 text-xs">Vendeur : <span className="text-gray-300 font-semibold">{OFFER.seller}</span></p>
              </div>
            </motion.div>

            {/* Transaction timeline stepper */}
            <motion.div variants={fadeUp} className="rounded-2xl bg-white/[0.04] backdrop-blur-sm border border-white/10 p-6">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-6">Parcours d'acquisition</p>
              <div className="hidden sm:flex items-start gap-0">
                {STEPS.map((step, i) => {
                  const Icon = step.icon;
                  const isDone = i < currentStep;
                  const isActive = i === currentStep;
                  const isLast = i === STEPS.length - 1;
                  return (
                    <div key={step.key} className="flex items-start flex-1">
                      <div className="flex flex-col items-center flex-shrink-0" style={{ minWidth: 0, width: "100%" }}>
                        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: i * 0.12, duration: 0.35 }}
                          className={["w-12 h-12 rounded-2xl flex items-center justify-center border-2 mb-3 transition-all duration-500", isDone ? "bg-emerald-500/15 border-emerald-500/40" : isActive ? "bg-blue-500/15 border-blue-500/40 shadow-lg shadow-blue-500/20" : "bg-white/[0.03] border-white/[0.08]"].join(" ")}
                        >
                          {isDone ? <CheckCircle2 size={22} className="text-emerald-400" /> : <Icon size={20} className={isActive ? "text-blue-400" : "text-gray-600"} />}
                        </motion.div>
                        <p className={`text-xs font-black text-center leading-snug px-2 ${isDone ? "text-emerald-400" : isActive ? "text-white" : "text-gray-600"}`}>{step.label}</p>
                        <p className={`text-[10px] text-center mt-0.5 px-2 leading-snug ${isDone ? "text-emerald-600" : isActive ? "text-gray-400" : "text-gray-700"}`}>{step.desc}</p>
                        {isActive && <span className="mt-2 text-[9px] font-bold px-2.5 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full animate-pulse">En cours</span>}
                        {isDone && <span className="mt-2 text-[9px] font-bold px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full">Fait ✓</span>}
                      </div>
                      {!isLast && (
                        <div className="flex-1 flex items-start pt-6 px-1">
                          <div className="w-full h-px bg-white/[0.08] relative overflow-hidden">
                            {isDone && <motion.div className="absolute inset-y-0 left-0 bg-emerald-500/40" initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ duration: 0.6, delay: 0.3 }} />}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {/* Mobile */}
              <div className="sm:hidden space-y-3">
                {STEPS.map((step, i) => {
                  const Icon = step.icon;
                  const isDone = i < currentStep;
                  const isActive = i === currentStep;
                  return (
                    <div key={step.key} className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${isDone ? "bg-emerald-500/10 border-emerald-500/20" : isActive ? "bg-blue-500/10 border-blue-500/20" : "bg-white/[0.02] border-white/[0.06]"}`}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isDone ? "bg-emerald-500/15" : isActive ? "bg-blue-500/15" : "bg-white/[0.04]"}`}>
                        {isDone ? <CheckCircle2 size={18} className="text-emerald-400" /> : <Icon size={18} className={isActive ? "text-blue-400" : "text-gray-600"} />}
                      </div>
                      <div className="flex-1">
                        <p className={`font-bold text-sm ${isDone ? "text-emerald-400" : isActive ? "text-white" : "text-gray-600"}`}>{step.label}</p>
                        <p className={`text-xs mt-0.5 ${isDone ? "text-emerald-600" : isActive ? "text-gray-400" : "text-gray-700"}`}>{step.desc}</p>
                      </div>
                      {isActive && <span className="text-[9px] font-bold px-2 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full animate-pulse shrink-0">En cours</span>}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        );

      /* ─── MES VISITES ─────────────────────────────────────────────────────── */
      case "visites":
        return (
          <motion.div className="space-y-6" initial="hidden" animate="visible" variants={stagger}>
            {/* SRU countdown */}
            <motion.div variants={fadeUp} className="rounded-2xl bg-white/[0.04] backdrop-blur-sm border border-white/10 px-6 py-5">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Date de signature du compromis</label>
              <input
                type="date"
                value={compromisDate}
                max={new Date().toISOString().split("T")[0]}
                onChange={e => setCompromisDate(e.target.value)}
                className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-4 py-3 text-white font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/40 transition placeholder-gray-600 [color-scheme:dark]"
              />
              {!compromisDate && <p className="text-[10px] text-gray-700 mt-2">Renseignez la date pour démarrer le chronomètre légal SRU.</p>}
            </motion.div>
            {compromisDate && (
              <motion.div variants={fadeUp}>
                <SRUCountdown startDate={compromisDate} />
              </motion.div>
            )}
            <motion.div variants={fadeUp}>
              <Placeholder icon={Calendar} title="Gestion des visites" subtitle="Planifiez et suivez vos visites directement depuis votre espace acheteur." />
            </motion.div>
          </motion.div>
        );

      /* ─── MESSAGERIE ──────────────────────────────────────────────────────── */
      case "messagerie":
        return (
          <motion.div className="space-y-4" initial="hidden" animate="visible" variants={stagger}>
            <motion.div variants={fadeUp} className="rounded-2xl bg-white/[0.04] backdrop-blur-sm border border-white/10 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                    <MessageSquare size={15} className="text-blue-400" />
                  </div>
                  <div>
                    <p className="text-white font-black text-sm">Messagerie</p>
                    <p className="text-[10px] text-gray-600">Vos conversations avec les vendeurs</p>
                  </div>
                </div>
                {totalUnread > 0 && (
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full border text-blue-400 bg-blue-500/10 border-blue-500/20 animate-pulse">
                    {totalUnread} non lu{totalUnread > 1 ? "s" : ""}
                  </span>
                )}
              </div>
              {inbox.length === 0 ? (
                <div className="text-center py-10">
                  <MessageSquare size={28} className="text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-600 text-sm font-medium">Aucune conversation</p>
                  <p className="text-gray-700 text-xs mt-1">Contactez un vendeur depuis une annonce pour démarrer.</p>
                  <Link href="/" className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl text-sm font-bold hover:bg-blue-500/20 transition">
                    Voir les annonces <ChevronRight size={14} />
                  </Link>
                </div>
              ) : (
                <div>
                  {inbox.map(conv => {
                    const key = `${conv.propertyId}__${conv.otherUserId}`;
                    const diff = Date.now() - new Date(conv.lastActivity).getTime();
                    const mins = Math.floor(diff / 60000);
                    const relTime = mins < 60 ? `il y a ${mins || 1} min` : mins < 1440 ? `il y a ${Math.floor(mins / 60)} h` : `il y a ${Math.floor(mins / 1440)} j`;
                    return (
                      <button key={key} onClick={() => setActiveChatKey(key)}
                        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/[0.04] transition border-b border-white/[0.06] last:border-0 text-left"
                      >
                        <div className="w-11 h-11 rounded-xl overflow-hidden bg-white/[0.05] shrink-0">
                          {conv.propertyCover
                            ? <img src={conv.propertyCover} alt="" className="w-full h-full object-cover" />
                            : <Building2 size={18} className="text-gray-600 m-3" />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="text-sm font-bold text-white truncate">{conv.otherUserName}</p>
                            {conv.unreadCount > 0 && (
                              <span className="shrink-0 w-4 h-4 rounded-full bg-blue-500 text-white text-[9px] font-black flex items-center justify-center">
                                {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-gray-500 truncate">{conv.propertyTitle}</p>
                          <p className="text-xs text-gray-600 truncate mt-0.5">{conv.lastMessage}</p>
                        </div>
                        <div className="shrink-0 flex flex-col items-end gap-1">
                          <p className="text-[10px] text-gray-700 whitespace-nowrap">{relTime}</p>
                          <ChevronRight size={12} className="text-gray-700" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              {inbox.length > 0 && (
                <div className="px-6 py-3 border-t border-white/[0.06] flex items-center gap-2 text-[10px] text-gray-700">
                  <Clock size={10} /> Mis à jour à chaque ouverture de conversation
                </div>
              )}
            </motion.div>
          </motion.div>
        );

      /* ─── DOCUMENTS ───────────────────────────────────────────────────────── */
      case "documents":
        return (
          <motion.div className="space-y-6" initial="hidden" animate="visible" variants={stagger}>
            <motion.div variants={fadeUp} className="rounded-2xl bg-white/[0.04] backdrop-blur-sm border border-white/10 p-6">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">Documents acheteur</p>
              <div className="space-y-2">
                {DOCS.map((label, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <Circle size={14} className="text-gray-700 shrink-0" />
                    <span className="text-sm text-gray-500 font-medium flex-1">{label}</span>
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">À téléverser</span>
                  </div>
                ))}
              </div>
            </motion.div>
            <motion.div variants={fadeUp}>
              <Placeholder icon={FileText} title="Gestion documentaire" subtitle="Centralisez tous vos documents légaux et financiers pour l'acte de vente." />
            </motion.div>
          </motion.div>
        );

      /* ─── MES FAVORIS ─────────────────────────────────────────────────────── */
      case "favoris":
        return (
          <motion.div className="space-y-6" initial="hidden" animate="visible" variants={stagger}>

            {/* FairScore Analytics */}
            <motion.div variants={fadeUp} className="rounded-2xl bg-white/[0.04] backdrop-blur-sm border border-white/10 p-6">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-5">FairScore™ Analytics</p>
              {total === 0 ? (
                <p className="text-gray-600 text-sm text-center py-4">Sauvegardez des biens depuis les annonces pour voir vos analytics.</p>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4 mb-5">
                    <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
                      <p className="text-[10px] text-gray-600 uppercase tracking-widest font-bold mb-2">FairScore moyen des favoris</p>
                      <p className="text-3xl font-black text-white">{avgScore} <span className="text-base font-bold text-gray-600">/ 100</span></p>
                    </div>
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4">
                      <p className="text-[10px] text-gray-600 uppercase tracking-widest font-bold mb-2">Excellentes affaires détectées</p>
                      <p className="text-3xl font-black text-emerald-400">{excellent}</p>
                      <p className="text-[10px] text-emerald-700 mt-1">{excellent === 1 ? "bien sous le marché DVF" : "biens sous le marché DVF"}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-700 uppercase tracking-widest font-bold mb-3">Répartition des favoris</p>
                    <div className="space-y-2">
                      {[
                        { label: "Excellente affaire", count: excellent, color: "bg-emerald-500" },
                        { label: "Prix du marché",     count: fairMkt,   color: "bg-blue-500"    },
                        { label: "Surévalué",          count: overprice, color: "bg-red-500"     },
                      ].map(row => (
                        <div key={row.label} className="flex items-center gap-3">
                          <span className="text-xs text-gray-500 font-medium w-36 shrink-0">{row.label}</span>
                          <div className="flex-1 h-2 bg-white/[0.05] rounded-full overflow-hidden">
                            <div className={`h-full ${row.color} rounded-full transition-all duration-700`} style={{ width: total > 0 ? `${(row.count / total) * 100}%` : "0%" }} />
                          </div>
                          <span className="text-xs font-black text-gray-400 w-4 text-right shrink-0">{row.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </motion.div>

            {/* Favorites grid */}
            <motion.div variants={fadeUp} className="rounded-2xl bg-white/[0.04] backdrop-blur-sm border border-white/10 p-6">
              <div className="flex items-center gap-3 mb-5">
                <Heart size={16} className="text-red-400 fill-red-400" />
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Mes biens favoris</p>
                {total > 0 && (
                  <span className="ml-auto text-[10px] font-bold text-gray-600 bg-white/[0.04] border border-white/[0.08] px-2.5 py-1 rounded-full">
                    {total} bien{total > 1 ? "s" : ""}
                  </span>
                )}
              </div>
              {total === 0 ? (
                <div className="text-center py-10">
                  <Heart size={32} className="text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-600 text-sm font-medium">Aucun bien sauvegardé pour l'instant.</p>
                  <p className="text-gray-700 text-xs mt-1">Cliquez sur le cœur ❤ sur une annonce pour l'ajouter ici.</p>
                  <Link href="/" className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl text-sm font-bold hover:bg-blue-500/20 transition">
                    Explorer les annonces <ChevronRight size={14} />
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {savedProperties.map(p => <SavedPropertyCard key={p.id} p={p} />)}
                </div>
              )}
            </motion.div>
          </motion.div>
        );

      default:
        return null;
    }
  }

  /* ── Render ── */
  return (
    <>
      {/* ── Modals ── */}
      {modalOpen && (
        <BuyerCriteriaModal
          existingCriteria={criteria}
          onClose={() => setModalOpen(false)}
          onSaved={data => { setCriteria(data); setModalOpen(false); }}
        />
      )}
      <TravauxModal isOpen={travauxOpen} onClose={() => setTravauxOpen(false)} userName={userName} userEmail={userEmail} />
      {activeConv && (
        <ChatPanel
          propertyId={activeConv.propertyId}
          otherUserId={activeConv.otherUserId}
          otherUserName={activeConv.otherUserName}
          propertyTitle={activeConv.propertyTitle}
          currentUserId={userId}
          currentUserName={userName}
          isOpen={!!activeChatKey}
          onClose={() => setActiveChatKey(null)}
        />
      )}

      <div className="min-h-screen flex bg-gray-950 font-sans">

        {/* ── Sidebar ── */}
        <aside className="w-64 bg-gray-900/80 backdrop-blur-xl border-r border-white/[0.08] flex flex-col fixed h-full z-20 shadow-2xl">

          {/* Logo */}
          <div className="px-5 py-5 border-b border-white/[0.06]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Jumo-Immo" className="h-9 w-auto" style={{ mixBlendMode: "screen" }} />
            <p className="text-[10px] text-emerald-400/80 mt-2.5 uppercase tracking-widest font-bold">Espace Acheteur</p>
          </div>

          {/* Nav */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {NAV.map(({ id, icon, label }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={[
                  "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all text-left",
                  activeTab === id
                    ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-sm"
                    : "text-gray-500 hover:text-white hover:bg-white/[0.05] border border-transparent",
                ].join(" ")}
              >
                <span className={activeTab === id ? "text-emerald-400" : "text-gray-600"}>
                  {icon}
                </span>
                {label}
                {id === "messagerie" && totalUnread > 0 && (
                  <span className="ml-auto w-5 h-5 rounded-full bg-blue-500 text-white text-[9px] font-black flex items-center justify-center">
                    {totalUnread > 9 ? "9+" : totalUnread}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-white/[0.06] space-y-3">
            <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3">
              <p className="text-[10px] text-emerald-400/70 font-bold uppercase tracking-widest">Protection légale</p>
              <p className="text-xs text-gray-400 font-medium mt-1 leading-snug">Droits garantis par la loi SRU et la loi ALUR</p>
            </div>
            <button
              onClick={() => signOut({ redirectTo: "/" })}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all text-gray-500 hover:text-red-400 hover:bg-red-500/[0.08] border border-transparent"
            >
              <LogOut size={17} className="text-gray-600" />
              Déconnexion
            </button>
          </div>
        </aside>

        {/* ── Main content ── */}
        <main className="flex-1 ml-64 min-h-screen">
          <div className="p-8">

            {/* Page header — always visible */}
            <div className="mb-6">
              <h1 className="text-3xl font-black text-white tracking-tight">Bonjour, {userName}</h1>
              <p className="text-gray-500 mt-1 font-medium text-sm">
                {NAV.find(n => n.id === activeTab)?.label ?? "Tableau de bord"} · Protection légale garantie
              </p>
            </div>

            {/* Tab content with AnimatePresence for smooth transitions */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                {renderTab()}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </>
  );
}
