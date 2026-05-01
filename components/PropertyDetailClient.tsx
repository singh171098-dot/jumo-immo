"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft, MapPin, Maximize2, BedDouble, Bath,
  ChevronLeft, ChevronRight, Zap, Share2, Heart, Phone, FileText, Calendar,
} from "lucide-react";
import { formatPrice } from "../lib/utils/formatters";
import EnergyUpgradeCalc from "./EnergyUpgradeCalc";
import DpeRenovationSimulator from "./DpeRenovationSimulator";
import PaperworkWizard from "./PaperworkWizard";
import ChatPanel from "./ChatPanel";
import VisitBooker from "./VisitBooker";
import NegotiationAssistant from "./NegotiationAssistant";

/* ── Fallback gallery when no images uploaded ─────────────────────────────── */
const FALLBACK_GALLERY = [
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1600&q=80",
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1600&q=80",
  "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?w=1600&q=80",
];

const DPE_BG: Record<string, string> = {
  A: "bg-emerald-500", B: "bg-lime-500",  C: "bg-yellow-400",
  D: "bg-orange-400",  E: "bg-orange-500", F: "bg-red-500", G: "bg-red-700",
};

/* ── FairScore donut gauge ────────────────────────────────────────────────── */
function FairScoreGauge({ score }: { score: number }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const r = 38;
  const circ = 2 * Math.PI * r;
  const offset = mounted ? circ - (score / 100) * circ : circ;
  const color = score >= 80 ? "#10B981" : score >= 60 ? "#F59E0B" : "#EF4444";

  return (
    <svg width={96} height={96} viewBox="0 0 96 96" aria-label={`FairScore ${score}`}>
      <circle cx={48} cy={48} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={7} />
      <circle
        cx={48} cy={48} r={r} fill="none"
        stroke={color} strokeWidth={7} strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset}
        transform="rotate(-90 48 48)"
        style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.16,1,0.3,1) 0.3s" }}
      />
      <text x={48} y={46} textAnchor="middle" fill="white" fontSize={22} fontWeight={800} fontFamily="system-ui">{score}</text>
      <text x={48} y={61} textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize={8} fontFamily="system-ui" letterSpacing={1.5}>SCORE</text>
    </svg>
  );
}

/* ── Props ────────────────────────────────────────────────────────────────── */
export interface PropertyDetailProps {
  id: string;
  title: string;
  description: string;
  price: number;
  originalPrice: number;
  hasOriginalPrice: boolean;
  surface: number;
  rooms: number;
  bedrooms: number | null;
  bathrooms: number | null;
  dpe: string;
  city: string;
  fairScore: number;
  cityAvgPerSqm: number;
  priceDropDate: string;
  sellerName: string;
  images: string[];
  heatingType?: string | null;
  insulationLevel?: string | null;
}

/* ── Animation variants ───────────────────────────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};
const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

/* ── Main component ───────────────────────────────────────────────────────── */
export default function PropertyDetailClient(p: PropertyDetailProps) {
  const gallery = p.images.length > 0 ? p.images : FALLBACK_GALLERY;

  const [activeImg,    setActiveImg]    = useState(0);
  const [saved,        setSaved]        = useState(false);
  const [activePanel,    setActivePanel]    = useState<"chat" | "visit" | null>(null);
  const [suggestedPrice, setSuggestedPrice] = useState<number | undefined>(undefined);
  const wizardRef = useRef<HTMLDivElement>(null);

  /* Derived metrics */
  const pricePerSqm  = Math.round(p.price / p.surface);
  const agencySavings = Math.round(p.price * 0.05);
  const diff = Math.round(((pricePerSqm - p.cityAvgPerSqm) / p.cityAvgPerSqm) * 100);
  const priceDrop = p.hasOriginalPrice
    ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)
    : 0;

  const scoreLabel = p.fairScore >= 80 ? "Prix juste" : p.fairScore >= 60 ? "À négocier" : "Surévalué";
  const scoreColor = p.fairScore >= 80 ? "text-emerald-400" : p.fairScore >= 60 ? "text-amber-400" : "text-red-400";

  const verdictCopy =
    diff > 10  ? `Prix ${diff}% au-dessus du marché DVF — marge de négociation possible.`
    : diff >= 0 ? `Prix aligné avec le marché DVF local (+${diff}%). Bonne opportunité.`
               : `Prix ${Math.abs(diff)}% sous le marché DVF — affaire à saisir rapidement.`;
  const verdictBg   = diff > 10  ? "bg-red-500/10 border border-red-500/20"     : diff >= 0 ? "bg-blue-500/10 border border-blue-500/20"    : "bg-emerald-500/10 border border-emerald-500/20";
  const verdictText = diff > 10  ? "text-red-300"                               : diff >= 0 ? "text-blue-300"                              : "text-emerald-300";

  const dpeBg = DPE_BG[p.dpe] ?? "bg-gray-500";

  const prev = () => setActiveImg(i => (i - 1 + gallery.length) % gallery.length);
  const next = () => setActiveImg(i => (i + 1) % gallery.length);

  /* Metrics list — all string values for simplicity */
  const metrics: { icon: React.ReactNode; label: string; value: string; isDpe?: boolean }[] = [
    { icon: <Maximize2 size={17} />,  label: "Surface",    value: `${p.surface} m²` },
    { icon: <span className="text-base leading-none">⊞</span>, label: "Pièces", value: `${p.rooms} pièces` },
    ...(p.bedrooms  != null ? [{ icon: <BedDouble size={17} />, label: "Chambres",       value: `${p.bedrooms} chambre${p.bedrooms > 1 ? "s" : ""}` }] : []),
    ...(p.bathrooms != null ? [{ icon: <Bath size={17} />,      label: "Salles de bain", value: `${p.bathrooms} sdb` }] : []),
    { icon: <Zap size={17} />,        label: "DPE",         value: `Classe ${p.dpe}`, isDpe: true },
    { icon: <span className="text-sm font-bold leading-none">€</span>, label: "Prix / m²", value: formatPrice(pricePerSqm) },
  ];

  return (
    <main className="min-h-screen bg-gray-950 text-white">

      {/* ════════════════════════════════════════
          HERO — Cinematic image gallery
      ════════════════════════════════════════ */}
      <section className="relative h-[70vh] w-full overflow-hidden bg-gray-900">

        {/* Crossfade images */}
        <AnimatePresence mode="wait">
          <motion.img
            key={activeImg}
            src={gallery[activeImg]}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7 }}
          />
        </AnimatePresence>

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/30 to-gray-950/10 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-gray-950/60 via-transparent to-transparent pointer-events-none" />

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 px-5 py-5 flex items-center justify-between z-10">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-white/70 hover:text-white text-sm font-medium transition bg-black/30 backdrop-blur-sm px-3.5 py-2 rounded-full"
          >
            <ArrowLeft size={15} />
            Retour
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSaved(s => !s)}
              className={`p-2.5 rounded-full backdrop-blur-sm transition ${saved ? "bg-red-500/80 text-white" : "bg-black/30 text-white/70 hover:text-white"}`}
            >
              <Heart size={16} fill={saved ? "currentColor" : "none"} />
            </button>
            <button className="p-2.5 rounded-full bg-black/30 backdrop-blur-sm text-white/70 hover:text-white transition">
              <Share2 size={16} />
            </button>
            <span className={`flex items-center gap-1.5 ${dpeBg} text-white text-xs font-black px-3 py-2 rounded-full`}>
              <Zap size={11} />
              DPE {p.dpe}
            </span>
          </div>
        </div>

        {/* Prev / Next arrows */}
        <button onClick={prev} className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/30 backdrop-blur-sm text-white/70 hover:text-white hover:bg-black/50 transition z-10">
          <ChevronLeft size={22} />
        </button>
        <button onClick={next} className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/30 backdrop-blur-sm text-white/70 hover:text-white hover:bg-black/50 transition z-10">
          <ChevronRight size={22} />
        </button>

        {/* Gallery thumbnail strip */}
        <div className="absolute bottom-24 right-5 flex gap-1.5 z-10">
          {gallery.map((src, i) => (
            <button
              key={i}
              onClick={() => setActiveImg(i)}
              className={`w-14 h-10 rounded-lg overflow-hidden border-2 transition ${i === activeImg ? "border-white" : "border-white/20 hover:border-white/50"}`}
            >
              <img src={src} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>

        {/* Dot indicators */}
        <div className="absolute bottom-14 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
          {gallery.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveImg(i)}
              className={`rounded-full transition-all duration-300 ${i === activeImg ? "w-6 h-2 bg-white" : "w-2 h-2 bg-white/40 hover:bg-white/60"}`}
            />
          ))}
        </div>

        {/* Hero text */}
        <motion.div
          className="absolute bottom-8 left-6 right-6 md:left-12 z-10"
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          <motion.p variants={fadeUp} className="text-emerald-400 text-xs font-bold uppercase tracking-widest mb-3">
            Vente entre particuliers · Sans frais d'agence
          </motion.p>
          <motion.h1 variants={fadeUp} className="text-white text-2xl sm:text-4xl md:text-5xl font-black tracking-tight mb-3 leading-tight max-w-3xl">
            {p.title}
          </motion.h1>
          <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-white/55 text-sm">
            <span className="flex items-center gap-1.5"><MapPin size={13} /> {p.city}</span>
            <span className="flex items-center gap-1.5"><Maximize2 size={13} /> {p.surface} m²</span>
            {p.bedrooms  != null && <span className="flex items-center gap-1.5"><BedDouble size={13} /> {p.bedrooms} chambre{p.bedrooms > 1 ? "s" : ""}</span>}
            {p.bathrooms != null && <span className="flex items-center gap-1.5"><Bath size={13} /> {p.bathrooms} sdb</span>}
          </motion.div>
        </motion.div>

      </section>


      {/* ════════════════════════════════════════
          BODY — Split layout
      ════════════════════════════════════════ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 pb-8 lg:pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8">

          {/* ── LEFT ── */}
          <motion.div className="space-y-5" initial="hidden" animate="visible" variants={stagger}>

            {/* Price card */}
            <motion.div
              variants={fadeUp}
              className="rounded-2xl bg-white/[0.04] backdrop-blur-sm border border-white/10 px-6 py-5 flex items-start justify-between flex-wrap gap-4"
            >
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Prix de vente</p>
                <p className="text-4xl font-black tracking-tighter text-white">{formatPrice(p.price)}</p>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  <span className="text-sm text-gray-400">{formatPrice(pricePerSqm)} / m²</span>
                  {p.hasOriginalPrice && (
                    <>
                      <span className="text-sm text-gray-600 line-through">{formatPrice(p.originalPrice)}</span>
                      <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                        ↓ {priceDrop}%
                      </span>
                    </>
                  )}
                </div>
              </div>
              {p.hasOriginalPrice && (
                <p className="text-xs text-gray-600 self-end">Baisse le {p.priceDropDate}</p>
              )}
            </motion.div>

            {/* Metrics grid */}
            <motion.div
              variants={fadeUp}
              className="rounded-2xl bg-white/[0.04] backdrop-blur-sm border border-white/10 p-6"
            >
              <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-5">Caractéristiques</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {metrics.map((m, i) => (
                  <div key={i} className="flex items-start gap-3 p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <span className="text-gray-500 mt-0.5 shrink-0">{m.icon}</span>
                    <div>
                      <p className="text-[10px] text-gray-600 mb-0.5 uppercase tracking-wide">{m.label}</p>
                      {m.isDpe ? (
                        <span className={`inline-flex items-center gap-1 ${dpeBg} ${p.dpe === "C" ? "text-gray-900" : "text-white"} text-xs font-black px-2 py-0.5 rounded-md`}>
                          {p.dpe}
                        </span>
                      ) : (
                        <p className="text-sm font-bold text-white leading-tight">{m.value}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Description */}
            <motion.div
              variants={fadeUp}
              className="rounded-2xl bg-white/[0.04] backdrop-blur-sm border border-white/10 p-6"
            >
              <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">Description du bien</h2>
              <p className="text-gray-300 leading-relaxed text-sm whitespace-pre-line">{p.description}</p>
            </motion.div>

            {/* Energy Upgrade Calculator */}
            <motion.div variants={fadeUp}>
              <EnergyUpgradeCalc dpe={p.dpe} surface={p.surface} />
            </motion.div>

            {/* DPE Renovation Simulator — personalised if heatingType/insulationLevel available */}
            <motion.div variants={fadeUp}>
              <DpeRenovationSimulator
                dpe={p.dpe}
                surface={p.surface}
                heatingType={p.heatingType}
                insulationLevel={p.insulationLevel}
              />
            </motion.div>

            {/* ── Negotiation Assistant ── */}
            <motion.div variants={fadeUp}>
              <NegotiationAssistant
                askingPrice={p.price}
                surface={p.surface}
                cityAvgPerSqm={p.cityAvgPerSqm}
                city={p.city}
                onPropose={(price) => {
                  setSuggestedPrice(price);
                  wizardRef.current?.scrollIntoView({ behavior: "smooth" });
                }}
              />
            </motion.div>

            {/* Seller mention */}
            <motion.div
              variants={fadeUp}
              className="rounded-2xl bg-white/[0.04] backdrop-blur-sm border border-white/10 px-5 py-4 flex items-center gap-3"
            >
              <div className="w-9 h-9 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-sm font-black shrink-0">
                {p.sellerName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest">Vendu par</p>
                <p className="text-sm font-semibold text-white">{p.sellerName}</p>
              </div>
              <span className="ml-auto text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                Particulier
              </span>
            </motion.div>

          </motion.div>


          {/* ── RIGHT — Sticky action panel ── */}
          <motion.div
            className="lg:sticky lg:top-6 h-fit space-y-4"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.25 }}
          >

            {/* FairScore analysis card */}
            <div className="rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/10 p-6">

              {/* Score gauge row */}
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Analyse DVF</p>
                  <p className="text-2xl font-black text-white">{scoreLabel}</p>
                  <p className={`text-xs font-semibold mt-0.5 ${scoreColor}`}>
                    FairScore™ {p.fairScore} / 100
                  </p>
                </div>
                <FairScoreGauge score={p.fairScore} />
              </div>

              {/* DVF comparison rows */}
              <div className="space-y-3 pt-4 border-t border-white/10">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">Prix demandé / m²</span>
                  <span className="font-bold text-white">{formatPrice(pricePerSqm)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">Marché DVF — {p.city}</span>
                  <span className="font-bold text-blue-400">{formatPrice(p.cityAvgPerSqm)} / m²</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">Écart au marché</span>
                  <span className={`font-bold ${diff > 0 ? "text-red-400" : "text-emerald-400"}`}>
                    {diff > 0 ? `+${diff}%` : `${diff}%`}
                  </span>
                </div>

                {/* Verdict */}
                <div className={`rounded-xl px-3.5 py-3 text-xs font-medium leading-relaxed ${verdictBg} ${verdictText}`}>
                  {verdictCopy}
                </div>
              </div>
            </div>

            {/* Agency savings banner */}
            <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-500 p-5">
              <p className="text-emerald-100 text-[10px] font-bold uppercase tracking-widest mb-2">
                Sans frais d'agence
              </p>
              <p className="text-white/75 text-sm font-medium">Vous économisez</p>
              <p className="text-3xl font-black tracking-tighter text-white my-1">{formatPrice(agencySavings)}</p>
              <p className="text-emerald-100 text-xs">
                soit 5% du prix de vente, grâce à Jumo-Immo.
              </p>
            </div>

            {/* CTAs — desktop only (mobile uses fixed bottom bar) */}
            <div className="hidden lg:flex flex-col gap-3">
              <button
                onClick={() => setActivePanel("chat")}
                className="w-full py-4 bg-[#2563EB] hover:bg-blue-500 active:scale-[.98] text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 text-sm"
              >
                <Phone size={17} />
                Contacter le vendeur
              </button>
              <button
                onClick={() => setActivePanel("visit")}
                className="w-full py-4 bg-white/[0.06] hover:bg-white/10 active:scale-[.98] text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 text-sm border border-white/10"
              >
                <Calendar size={17} />
                Réserver une visite
              </button>
              <button
                onClick={() => wizardRef.current?.scrollIntoView({ behavior: "smooth" })}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 active:scale-[.98] text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 text-sm"
              >
                <FileText size={17} />
                Faire une offre
              </button>
            </div>

          </motion.div>
        </div>
      </div>

      {/* Scroll anchor for "Faire une offre" */}
      <div ref={wizardRef} />

      {/* ════════════════════════════════════════
          PAPERWORK WIZARD — full width
      ════════════════════════════════════════ */}
      <motion.div
        className="max-w-7xl mx-auto px-4 sm:px-6 pb-28 lg:pb-16"
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.55, ease: "easeOut" }}
      >
        <div className="mb-5">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Guide d'acquisition</p>
          <h2 className="text-xl font-black text-white tracking-tight">Démarches d'achat</h2>
          <p className="text-gray-400 text-sm mt-0.5">Délais légaux, documents obligatoires et calcul prorata</p>
        </div>
        <div className="max-w-2xl">
          <PaperworkWizard
            askingPrice={p.price}
            cityAvgPerSqm={p.cityAvgPerSqm}
            surface={p.surface}
            suggestedOfferPrice={suggestedPrice}
          />
        </div>
      </motion.div>

      {/* ════════════════════════════════════════
          MOBILE FIXED BOTTOM BAR
      ════════════════════════════════════════ */}
      <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-gray-950/95 backdrop-blur-xl border-t border-white/10 px-4 py-3 flex gap-3">
        <button
          onClick={() => setActivePanel("chat")}
          className="flex-1 py-3.5 bg-[#2563EB] hover:bg-blue-500 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
        >
          <Phone size={16} />
          Contacter
        </button>
        <button
          onClick={() => setActivePanel("visit")}
          className="px-4 py-3.5 bg-white/[0.06] hover:bg-white/10 text-white rounded-xl transition-colors flex items-center justify-center border border-white/10"
          aria-label="Réserver une visite"
        >
          <Calendar size={16} />
        </button>
        <button
          onClick={() => wizardRef.current?.scrollIntoView({ behavior: "smooth" })}
          className="flex-1 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
        >
          <FileText size={16} />
          Faire une offre
        </button>
      </div>

      <ChatPanel
        propertyId={p.id}
        sellerName={p.sellerName}
        propertyTitle={p.title}
        isOpen={activePanel === "chat"}
        onClose={() => setActivePanel(null)}
      />
      <VisitBooker
        propertyId={p.id}
        propertyTitle={p.title}
        isOpen={activePanel === "visit"}
        onClose={() => setActivePanel(null)}
      />

    </main>
  );
}
