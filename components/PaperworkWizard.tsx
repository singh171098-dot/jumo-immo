"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, ShieldCheck, KeyRound, Clock, AlertTriangle,
  CheckCircle2, Circle, ChevronRight, Euro, ArrowRight,
  Send, RefreshCcw, User, MapPin, Landmark, CreditCard,
} from "lucide-react";
import { formatPrice } from "../lib/utils/formatters";
import UploadLink from "./UploadLink";

/* ── Props ───────────────────────────────────────────────────────────────── */
interface PaperworkWizardProps {
  askingPrice?: number;
  cityAvgPerSqm?: number;
  surface?: number;
}

/* ── DDT checklist items ─────────────────────────────────────────────────── */
interface DocItem { id: string; label: string; required: boolean; info?: string }

const DDT_DOCS: DocItem[] = [
  { id: "dpe",       label: "Diagnostic de Performance Énergétique (DPE)",       required: true,  info: "Obligatoire depuis 2011" },
  { id: "amiante",   label: "Diagnostic amiante",                                 required: true,  info: "Immeubles avant 1997" },
  { id: "plomb",     label: "Constat de risque d'exposition au plomb (CREP)",      required: true,  info: "Immeubles avant 1949" },
  { id: "termites",  label: "État relatif aux termites",                           required: true,  info: "Zones réglementées" },
  { id: "carrez",    label: "Mesurage Loi Carrez",                                 required: true,  info: "Lots de copropriété" },
  { id: "erp",       label: "État des Risques et Pollutions (ERP)",                required: true,  info: "Obligatoire partout" },
  { id: "elec",      label: "Diagnostic électricité",                              required: false, info: "Installations >15 ans" },
  { id: "gaz",       label: "Diagnostic gaz",                                      required: false, info: "Installations >15 ans" },
  { id: "assainiss", label: "Assainissement non collectif",                         required: false, info: "Si hors réseau public" },
];

/* ── Countdown helpers ───────────────────────────────────────────────────── */
function formatCountdown(ms: number) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return { d, h, m, s, expired: ms <= 0 };
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-12 h-12 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center">
        <span className="text-xl font-black text-white tabular-nums">{String(value).padStart(2, "0")}</span>
      </div>
      <span className="text-[9px] text-gray-500 uppercase tracking-widest mt-1">{label}</span>
    </div>
  );
}

/* ── Style constants ─────────────────────────────────────────────────────── */
const CARD = "rounded-2xl bg-white/[0.04] backdrop-blur-sm border border-white/10 p-5";
const SECTION_TITLE = "text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3";
const DARK_INPUT =
  "w-full bg-white/[0.05] border border-white/10 rounded-xl px-4 py-3 " +
  "text-white font-medium text-sm outline-none " +
  "focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition placeholder-gray-600";

/* ── Steps ───────────────────────────────────────────────────────────────── */
const STEPS = [
  { key: "OFFER",     icon: FileText,    label: "Offre d'achat"  },
  { key: "COMPROMIS", icon: ShieldCheck, label: "Compromis"      },
  { key: "ACTE",      icon: KeyRound,    label: "Acte définitif" },
] as const;
type StepKey = (typeof STEPS)[number]["key"];

const slideVariants = {
  enter:  (dir: number) => ({ opacity: 0, x: dir > 0 ?  48 : -48 }),
  center: { opacity: 1, x: 0 },
  exit:   (dir: number) => ({ opacity: 0, x: dir > 0 ? -48 :  48 }),
};

/* ── Component ───────────────────────────────────────────────────────────── */
export default function PaperworkWizard({
  askingPrice = 0,
  cityAvgPerSqm = 3800,
  surface = 0,
}: PaperworkWizardProps) {

  const [step, setStep]       = useState<StepKey>("OFFER");
  const [stepDir, setStepDir] = useState(1);

  /* ── Step 1: Offer form ── */
  const [buyerName,        setBuyerName]        = useState("");
  const [propertyAddress,  setPropertyAddress]  = useState("");
  const [offerPrice,       setOfferPrice]       = useState(askingPrice ? String(askingPrice) : "");
  const [loanAmount,       setLoanAmount]       = useState("");
  const [offerGenerated,   setOfferGenerated]   = useState(false);
  const [offerRef]  = useState(() => `OA-${Math.random().toString(36).toUpperCase().slice(2, 8)}`);
  const [offerDate] = useState(() =>
    new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
  );
  const [offerExpiry] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 8);
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  });

  /* ── Step 2: SRU + mortgage countdowns ── */
  const [sruMs,       setSruMs]       = useState(10 * 864e5);
  const [sruRunning,  setSruRunning]  = useState(false);
  const [mortMs,      setMortMs]      = useState(11 * 864e5);
  const [mortRunning, setMortRunning] = useState(false);

  useEffect(() => {
    if (!sruRunning) return;
    const id = setInterval(() => setSruMs(p => Math.max(0, p - 1000)), 1000);
    return () => clearInterval(id);
  }, [sruRunning]);

  useEffect(() => {
    if (!mortRunning) return;
    const id = setInterval(() => setMortMs(p => Math.max(0, p - 1000)), 1000);
    return () => clearInterval(id);
  }, [mortRunning]);

  /* ── Step 2: DDT checklist ── */
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const reqDocs = DDT_DOCS.filter(d => d.required);
  const reqDone = reqDocs.filter(d => checked[d.id]).length;

  /* ── Step 2: Buyer proof of funds ── */
  const [proofOfFunds, setProofOfFunds] = useState<File | null>(null);

  /* ── Step 3: Prorata foncière ── */
  const [taxAmount, setTaxAmount] = useState(1400);
  const [signDate,  setSignDate]  = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return d.toISOString().split("T")[0];
  });
  const prorata = useCallback(() => {
    const d   = new Date(signDate);
    const doy = Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86_400_000);
    return Math.round((taxAmount / 365) * (365 - doy));
  }, [taxAmount, signDate]);

  /* ── Step 3: Buyer documents ── */
  const [idDoc,          setIdDoc]          = useState<File | null>(null);
  const [civilStatusDoc, setCivilStatusDoc] = useState<File | null>(null);
  const [ficheEtatCivil, setFicheEtatCivil] = useState<File | null>(null);
  const [notarySent,     setNotarySent]     = useState(false);

  /* ── Derived ── */
  const financingClause = loanAmount
    ? `Sous réserve d'obtention d'un prêt immobilier de ${Number(loanAmount).toLocaleString("fr-FR")} €`
    : "Achat comptant (sans condition de prêt)";

  function handleGenerateOffer() {
    if (!buyerName.trim() || !propertyAddress.trim() || !offerPrice) return;
    setOfferGenerated(true);
  }

  function handleNotaryExport() {
    const dossier = {
      status:      "READY_FOR_NOTARY",
      generatedAt: new Date().toISOString(),
      reference:   offerRef,
      transaction: {
        property: { address: propertyAddress },
        offer: {
          price:         Number(offerPrice),
          priceFormatted: formatPrice(Number(offerPrice)),
          financing:     financingClause,
          expiryDate:    offerExpiry,
          buyer:         { name: buyerName },
        },
      },
      buyerDocuments: {
        proofOfFunds:   proofOfFunds?.name  ?? "non fourni",
        identification: idDoc?.name         ?? "manquant",
        civilStatus:    civilStatusDoc?.name ?? "manquant",
        ficheEtatCivil: ficheEtatCivil?.name ?? "manquant",
      },
      sellerDocuments: {
        note: "Inclus via dossier vendeur : titre de propriété, DPE, amiante, plomb, termites",
      },
    };
    console.log("[Jumo-Immo → Notaire] Dossier de vente complet :");
    console.log(JSON.stringify(dossier, null, 2));
    setNotarySent(true);
  }

  const goTo = (next: StepKey) => {
    const cur = STEPS.findIndex(s => s.key === step);
    const nxt = STEPS.findIndex(s => s.key === next);
    setStepDir(nxt >= cur ? 1 : -1);
    setStep(next);
  };

  const sru     = formatCountdown(sruMs);
  const mort    = formatCountdown(mortMs);
  const stepIdx = STEPS.findIndex(s => s.key === step);

  /* ── Render ── */
  return (
    <div className="rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/10 overflow-hidden">

      {/* Progress bar */}
      <div className="px-6 pt-5 pb-4 border-b border-white/[0.07]">
        <div className="flex items-center gap-0">
          {STEPS.map((s, i) => {
            const Icon   = s.icon;
            const done   = i < stepIdx;
            const active = s.key === step;
            return (
              <div key={s.key} className="flex items-center flex-1 last:flex-none">
                <button
                  onClick={() => goTo(s.key)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200 ${
                    active ? "bg-blue-600/20 border border-blue-500/30"
                    : done  ? "text-emerald-400 hover:bg-white/[0.04]"
                    :         "text-gray-600 hover:bg-white/[0.04]"
                  }`}
                >
                  {done
                    ? <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                    : <Icon size={15} className={active ? "text-blue-400" : "text-gray-500"} />
                  }
                  <span className={`text-xs font-bold hidden sm:block ${
                    active ? "text-blue-400" : done ? "text-emerald-400" : "text-gray-500"
                  }`}>{s.label}</span>
                </button>
                {i < STEPS.length - 1 && <div className="flex-1 h-px mx-1 bg-white/[0.07]" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step content */}
      <div className="overflow-hidden">
        <AnimatePresence custom={stepDir} mode="wait">
          <motion.div
            key={step}
            custom={stepDir}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.28, ease: "easeInOut" }}
            className="px-6 py-5"
          >

            {/* ═══════ STEP 1 — OFFRE D'ACHAT ═══════ */}
            {step === "OFFER" && (
              <div className="space-y-5">
                <div>
                  <p className="text-white font-black text-base mb-0.5">Offre d'achat</p>
                  <p className="text-xs text-gray-400">Rédigez une offre opposable en quelques secondes</p>
                </div>

                {!offerGenerated ? (
                  /* ── Form ── */
                  <div className="space-y-4">
                    <div className={CARD}>
                      <p className={SECTION_TITLE}><User size={11} className="inline mr-1 -mt-px" />Acquéreur</p>
                      <input
                        value={buyerName} onChange={e => setBuyerName(e.target.value)}
                        placeholder="Prénom Nom" className={DARK_INPUT}
                      />
                    </div>

                    <div className={CARD}>
                      <p className={SECTION_TITLE}><MapPin size={11} className="inline mr-1 -mt-px" />Bien immobilier</p>
                      <input
                        value={propertyAddress} onChange={e => setPropertyAddress(e.target.value)}
                        placeholder="Adresse complète du bien" className={DARK_INPUT}
                      />
                    </div>

                    <div className={CARD}>
                      <p className={SECTION_TITLE}><Euro size={11} className="inline mr-1 -mt-px" />Prix proposé</p>
                      <div className="relative mb-3">
                        <input
                          type="number" value={offerPrice} onChange={e => setOfferPrice(e.target.value)}
                          placeholder="Ex : 320 000"
                          className={`${DARK_INPUT} text-lg font-black pr-10`}
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">€</span>
                      </div>
                      {askingPrice > 0 && (
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-white/[0.03] rounded-xl px-3 py-2.5 border border-white/[0.06]">
                            <p className="text-gray-500 mb-0.5">Prix affiché</p>
                            <p className="font-black text-white">{formatPrice(askingPrice)}</p>
                          </div>
                          <div className="bg-white/[0.03] rounded-xl px-3 py-2.5 border border-white/[0.06]">
                            <p className="text-gray-500 mb-0.5">DVF moyen / m²</p>
                            <p className="font-black text-blue-400">{formatPrice(cityAvgPerSqm)}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className={CARD}>
                      <p className={SECTION_TITLE}><CreditCard size={11} className="inline mr-1 -mt-px" />Condition de financement</p>
                      <div className="relative">
                        <input
                          type="number" value={loanAmount} onChange={e => setLoanAmount(e.target.value)}
                          placeholder="Montant du prêt (laisser vide si comptant)"
                          className={`${DARK_INPUT} pr-10`}
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">€</span>
                      </div>
                      <p className="mt-2 text-xs text-blue-300/80 font-medium leading-relaxed">
                        {loanAmount
                          ? `Clause : "${financingClause}"`
                          : "Laissez vide pour un achat comptant"}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                      <Clock size={14} className="text-amber-400 shrink-0" />
                      <p className="text-xs text-amber-300 font-medium">
                        Valable <strong>8 jours</strong> à compter de la réception par le vendeur (art. 1113 Code civil).
                      </p>
                    </div>

                    <button
                      onClick={handleGenerateOffer}
                      disabled={!buyerName.trim() || !propertyAddress.trim() || !offerPrice}
                      className="w-full py-3.5 bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-600 hover:to-blue-500 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-500/20 active:translate-y-0 flex items-center justify-center gap-2"
                    >
                      <FileText size={16} /> Générer l'offre d'achat
                    </button>
                  </div>
                ) : (
                  /* ── Offer preview (PDF-like document card) ── */
                  <div className="space-y-4">
                    <div className="rounded-xl border border-white/15 overflow-hidden">
                      {/* Document header */}
                      <div className="bg-[#1E3A8A]/40 border-b border-white/10 px-5 py-4 flex justify-between items-start">
                        <div>
                          <p className="text-[10px] font-bold text-blue-300 uppercase tracking-widest">Jumo-Immo · Offre d'achat</p>
                          <p className="text-white font-black text-lg mt-0.5">Proposition d'acquisition</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-gray-500">Réf.</p>
                          <p className="text-xs font-black text-gray-300 font-mono">{offerRef}</p>
                        </div>
                      </div>

                      {/* Document body */}
                      <div className="bg-white/[0.03] px-5 py-4 space-y-4">
                        {[
                          { label: "Acquéreur", value: buyerName,         icon: <User  size={12} /> },
                          { label: "Bien visé", value: propertyAddress,   icon: <MapPin size={12} /> },
                        ].map(row => (
                          <div key={row.label} className="flex gap-3">
                            <span className="text-gray-600 mt-0.5 shrink-0">{row.icon}</span>
                            <div>
                              <p className="text-[10px] text-gray-600 uppercase tracking-wider">{row.label}</p>
                              <p className="text-sm font-semibold text-white mt-0.5">{row.value}</p>
                            </div>
                          </div>
                        ))}

                        <div className="flex gap-3">
                          <span className="text-gray-600 mt-1 shrink-0"><Euro size={12} /></span>
                          <div>
                            <p className="text-[10px] text-gray-600 uppercase tracking-wider">Prix proposé</p>
                            <p className="text-2xl font-black text-white tracking-tight mt-0.5">
                              {formatPrice(Number(offerPrice))}
                            </p>
                          </div>
                        </div>

                        <div className="border-t border-white/[0.07] pt-4 space-y-3">
                          <div className="flex gap-3">
                            <span className="text-gray-600 mt-0.5 shrink-0"><Landmark size={12} /></span>
                            <div>
                              <p className="text-[10px] text-gray-600 uppercase tracking-wider">Condition de financement</p>
                              <p className="text-xs text-blue-300 font-medium mt-0.5">{financingClause}</p>
                            </div>
                          </div>
                          <div className="flex gap-3">
                            <span className="text-gray-600 mt-0.5 shrink-0"><Clock size={12} /></span>
                            <div>
                              <p className="text-[10px] text-gray-600 uppercase tracking-wider">Validité</p>
                              <p className="text-xs text-amber-300 font-medium mt-0.5">8 jours · expire le {offerExpiry}</p>
                            </div>
                          </div>
                        </div>

                        <div className="border-t border-white/[0.07] pt-3 flex justify-between items-center">
                          <p className="text-[10px] text-gray-600">Fait le {offerDate}</p>
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-full">
                            ✓ Offre générée
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setOfferGenerated(false)}
                      className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-300 transition"
                    >
                      <RefreshCcw size={12} /> Modifier l'offre
                    </button>
                  </div>
                )}

                <div className="flex justify-end">
                  <button onClick={() => goTo("COMPROMIS")} className="flex items-center gap-1.5 text-xs font-bold text-blue-400 hover:text-blue-300 transition">
                    Passer au compromis <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            )}

            {/* ═══════ STEP 2 — COMPROMIS ═══════ */}
            {step === "COMPROMIS" && (
              <div className="space-y-5">
                <div>
                  <p className="text-white font-black text-base mb-0.5">Compromis de vente</p>
                  <p className="text-xs text-gray-400">Délais légaux, conditions suspensives et documents obligatoires</p>
                </div>

                {/* SRU + mortgage timers */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* SRU */}
                  <div className={`${CARD} flex flex-col gap-3`}>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-orange-400 shrink-0" />
                      <p className="text-xs font-bold text-white">Délai SRU</p>
                      <span className="ml-auto text-[10px] font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full">10 jours</span>
                    </div>
                    <div className="flex gap-2 justify-center">
                      <CountdownUnit value={sru.d} label="J" />
                      <CountdownUnit value={sru.h} label="H" />
                      <CountdownUnit value={sru.m} label="M" />
                      <CountdownUnit value={sru.s} label="S" />
                    </div>
                    {!sruRunning && !sru.expired && (
                      <button onClick={() => setSruRunning(true)} className="w-full py-2 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/30 text-orange-300 font-bold rounded-xl text-xs transition">
                        Démarrer le délai
                      </button>
                    )}
                    {sru.expired && <p className="text-center text-xs font-bold text-red-400">Délai expiré</p>}
                    {sruRunning && !sru.expired && (
                      <div className="w-full bg-white/[0.05] rounded-full h-1.5">
                        <div className="bg-orange-400 h-1.5 rounded-full transition-all duration-1000" style={{ width: `${(sruMs / (10 * 864e5)) * 100}%` }} />
                      </div>
                    )}
                    <p className="text-[10px] text-gray-600 text-center leading-relaxed">
                      Art. L271-1 CCH — Rétractation sans frais ni pénalités
                    </p>
                  </div>

                  {/* Mortgage condition */}
                  <div className={`${CARD} flex flex-col gap-3`}>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                      <p className="text-xs font-bold text-white">Condition hypothécaire</p>
                      <span className="ml-auto text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">11 jours</span>
                    </div>
                    <div className="flex gap-2 justify-center">
                      <CountdownUnit value={mort.d} label="J" />
                      <CountdownUnit value={mort.h} label="H" />
                      <CountdownUnit value={mort.m} label="M" />
                      <CountdownUnit value={mort.s} label="S" />
                    </div>
                    {!mortRunning && !mort.expired && (
                      <button onClick={() => setMortRunning(true)} className="w-full py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-300 font-bold rounded-xl text-xs transition">
                        Démarrer le délai
                      </button>
                    )}
                    {mort.expired && <p className="text-center text-xs font-bold text-emerald-400">Délai confirmé ✓</p>}
                    {mortRunning && !mort.expired && (
                      <div className="w-full bg-white/[0.05] rounded-full h-1.5">
                        <div className="bg-blue-400 h-1.5 rounded-full transition-all duration-1000" style={{ width: `${(mortMs / (11 * 864e5)) * 100}%` }} />
                      </div>
                    )}
                    <p className="text-[10px] text-gray-600 text-center leading-relaxed">
                      Délai minimal pour la condition suspensive de prêt
                    </p>
                  </div>
                </div>

                {/* DDT checklist */}
                <div className={CARD}>
                  <div className="flex items-center justify-between mb-4">
                    <p className={`${SECTION_TITLE} mb-0`}>Dossier Diagnostic Technique (DDT)</p>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                      reqDone === reqDocs.length
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                        : "bg-white/[0.06] text-gray-400 border border-white/10"
                    }`}>{reqDone}/{reqDocs.length} obligatoires</span>
                  </div>

                  {checked.dpe === false && (
                    <div className="flex items-start gap-2 px-3 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl mb-3">
                      <AlertTriangle size={13} className="text-red-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-red-300 font-medium">
                        DPE classé F ou G — un <strong>Audit Énergétique</strong> est obligatoire depuis le 1er avril 2023.
                      </p>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    {DDT_DOCS.map(doc => (
                      <button
                        key={doc.id} type="button"
                        onClick={() => setChecked(c => ({ ...c, [doc.id]: !c[doc.id] }))}
                        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl border text-left transition-all ${
                          checked[doc.id]
                            ? "bg-emerald-500/10 border-emerald-500/20"
                            : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05]"
                        }`}
                      >
                        {checked[doc.id]
                          ? <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                          : <Circle       size={15} className="text-gray-600 shrink-0" />
                        }
                        <span className={`flex-1 text-xs font-medium ${checked[doc.id] ? "text-emerald-300" : "text-gray-300"}`}>
                          {doc.label}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {doc.required
                            ? <span className="text-[9px] font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">Obligatoire</span>
                            : <span className="text-[9px] text-gray-600">Selon cas</span>
                          }
                          {doc.info && <span className="text-[9px] text-gray-600">{doc.info}</span>}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Proof of funds upload */}
                <div className={CARD}>
                  <p className={SECTION_TITLE}><Landmark size={11} className="inline mr-1 -mt-px" />Justificatif de financement</p>
                  <UploadLink
                    role="buyer" docType="proof_of_funds"
                    label="Attestation de financement (optionnel)"
                    required={false}
                    value={proofOfFunds} onChange={setProofOfFunds}
                    dark
                  />
                  <p className="mt-2 text-[10px] text-gray-600">
                    Lettre bancaire, accord de principe ou attestation de fonds propres
                  </p>
                </div>

                <div className="flex justify-between items-center">
                  <button onClick={() => goTo("OFFER")} className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-300 transition">← Retour</button>
                  <button onClick={() => goTo("ACTE")} className="flex items-center gap-1.5 text-xs font-bold text-blue-400 hover:text-blue-300 transition">
                    Acte définitif <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            )}

            {/* ═══════ STEP 3 — ACTE DÉFINITIF ═══════ */}
            {step === "ACTE" && (
              <div className="space-y-5">
                <div>
                  <p className="text-white font-black text-base mb-0.5">Acte authentique de vente</p>
                  <p className="text-xs text-gray-400">Signature chez le notaire · Remise des clés</p>
                </div>

                {/* Prorata foncière */}
                <div className={CARD}>
                  <p className={SECTION_TITLE}><Euro size={12} className="inline mr-1 -mt-0.5" />Prorata taxe foncière</p>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                      <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1.5">Taxe annuelle (€)</label>
                      <input
                        type="number" value={taxAmount} onChange={e => setTaxAmount(Number(e.target.value))}
                        className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2.5 text-white font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1.5">Date de signature</label>
                      <input
                        type="date" value={signDate} onChange={e => setSignDate(e.target.value)}
                        className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2.5 text-white font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition"
                      />
                    </div>
                  </div>
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3.5 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-emerald-300">L'acheteur rembourse au vendeur</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">Prorata à partir de la date de signature</p>
                    </div>
                    <p className="text-2xl font-black text-emerald-400">{formatPrice(prorata())}</p>
                  </div>
                </div>

                {/* Buyer documents */}
                <div className={CARD}>
                  <p className={SECTION_TITLE}><User size={11} className="inline mr-1 -mt-px" />Documents acheteur requis</p>
                  <div className="space-y-3">
                    <UploadLink
                      role="buyer" docType="id" label="Pièce d'identité (recto/verso)"
                      required value={idDoc} onChange={setIdDoc} dark
                    />
                    <UploadLink
                      role="buyer" docType="civil_status" label="Justificatif d'état civil (mariage, PACS ou célibat)"
                      required value={civilStatusDoc} onChange={setCivilStatusDoc} dark
                    />
                    <div>
                      <UploadLink
                        role="buyer" docType="fiche_etat_civil" label="Fiche d'état civil"
                        required value={ficheEtatCivil} onChange={setFicheEtatCivil} dark
                      />
                      <a
                        href="https://www.service-public.fr/particuliers/vosdroits/F1400"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 transition"
                      >
                        <ArrowRight size={10} /> Télécharger sur service-public.fr
                      </a>
                    </div>
                  </div>
                </div>

                {/* Final checklist */}
                <div className={CARD}>
                  <p className={SECTION_TITLE}><ShieldCheck size={12} className="inline mr-1 -mt-0.5" />Checklist finale</p>
                  <div className="space-y-2">
                    {[
                      { label: "Frais de notaire estimés (7–8% du prix)",          done: true },
                      { label: "Attestation d'assurance habitation",                done: reqDone === reqDocs.length },
                      { label: "Justificatif de financement (prêt / fonds propres)", done: !!proofOfFunds },
                      { label: "Pièce d'identité acheteur",                         done: !!idDoc },
                      { label: "État civil acheteur",                               done: !!civilStatusDoc },
                      { label: "Fiche d'état civil",                                done: !!ficheEtatCivil },
                    ].map((item, i) => (
                      <div key={i} className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl border ${
                        item.done ? "bg-emerald-500/10 border-emerald-500/20" : "bg-white/[0.02] border-white/[0.06]"
                      }`}>
                        {item.done
                          ? <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                          : <Circle       size={14} className="text-gray-600 shrink-0" />
                        }
                        <span className={`text-xs font-medium ${item.done ? "text-emerald-300" : "text-gray-400"}`}>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notary export CTA */}
                {!notarySent ? (
                  <button
                    onClick={handleNotaryExport}
                    disabled={!idDoc || !civilStatusDoc || !ficheEtatCivil}
                    className="w-full py-4 bg-gradient-to-r from-[#1E3A8A] to-blue-600 hover:from-blue-800 hover:to-blue-500 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-black rounded-xl text-sm transition-all hover:shadow-lg hover:shadow-blue-500/20 hover:-translate-y-0.5 disabled:translate-y-0 active:translate-y-0 flex items-center justify-center gap-2"
                  >
                    <Send size={16} />
                    {!idDoc || !civilStatusDoc || !ficheEtatCivil
                      ? "Complétez les documents acheteur"
                      : "Envoyer au notaire"
                    }
                  </button>
                ) : (
                  <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-5 py-4 flex items-start gap-3">
                    <CheckCircle2 className="text-emerald-400 w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-emerald-400 font-bold text-sm">Dossier envoyé au notaire</p>
                      <p className="text-emerald-300/70 text-xs mt-0.5">
                        Offre + documents acheteur + diagnostics vendeur transmis.{" "}
                        Réf. : <span className="font-mono font-bold">{offerRef}</span>
                      </p>
                    </div>
                  </div>
                )}

                <button onClick={() => goTo("COMPROMIS")} className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-300 transition">
                  ← Retour au compromis
                </button>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
