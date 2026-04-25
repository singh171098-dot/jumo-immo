"use client";
import { useState } from "react";
import {
  Bot, TrendingUp, TrendingDown, Minus,
  Sparkles, Copy, CheckCircle2, ArrowRight,
} from "lucide-react";
import { calculatePropertyMetrics } from "../lib/utils/pricingLogic";
import { formatPrice } from "../lib/utils/formatters";

/* ── Props ───────────────────────────────────────────────────────────────── */
interface NegotiationAssistantProps {
  askingPrice:  number;
  surface:      number;
  cityAvgPerSqm: number;
  city:         string;
  /** Called when buyer clicks "Proposer ce prix" — parent scrolls to wizard */
  onPropose?:   (suggestedPrice: number) => void;
}

/* ── Component ───────────────────────────────────────────────────────────── */
export default function NegotiationAssistant({
  askingPrice,
  surface,
  cityAvgPerSqm,
  city,
  onPropose,
}: NegotiationAssistantProps) {
  const [copied, setCopied] = useState(false);

  /* Reuse existing DVF logic */
  const { pricePerSqm, differenceFromMarket, rating } =
    calculatePropertyMetrics(askingPrice, surface, cityAvgPerSqm);

  const dvfFairValue = Math.round(cityAvgPerSqm * surface);

  /* ── Compute negotiation parameters for each case ── */
  let suggestedPrice:   number;
  let discountPercent:  number;
  let confidenceLabel:  string;
  let headline:         string;
  let advice:           string;

  if (rating === "SURÉVALUÉ") {
    // Bring offer toward DVF fair value — cap discount at 12%, floor at 5%
    discountPercent = Math.min(12, Math.max(5, Math.round(differenceFromMarket * 0.7)));
    suggestedPrice  = Math.round(askingPrice * (1 - discountPercent / 100));
    confidenceLabel = "Modérée";
    headline = `Ce bien est surévalué de ${differenceFromMarket}% par rapport au marché DVF`;
    advice   = `Les transactions DVF récentes à ${city} établissent la valeur réelle à ${formatPrice(dvfFairValue)}. Une négociation de ${discountPercent}% est objectivement justifiée par les données officielles.`;
  } else if (rating === "PRIX DU MARCHÉ") {
    discountPercent = differenceFromMarket > 5 ? 3 : 2;
    suggestedPrice  = Math.round(askingPrice * (1 - discountPercent / 100));
    confidenceLabel = "Élevée";
    headline = `Prix aligné avec le marché DVF (${differenceFromMarket > 0 ? "+" : ""}${differenceFromMarket}%)`;
    advice   = `Ce bien est correctement valorisé selon les données DVF de ${city}. Une marge de négociation de ${discountPercent}% reste habituelle dans les ventes entre particuliers.`;
  } else {
    // EXCELLENTE AFFAIRE — offer near asking to secure it
    discountPercent = 1;
    suggestedPrice  = Math.round(askingPrice * 0.99);
    confidenceLabel = "Très élevée";
    headline = `Opportunité rare — ${Math.abs(differenceFromMarket)}% sous la valeur DVF du secteur`;
    advice   = `Ce prix est inférieur aux ventes DVF récentes à ${city}. Agissez rapidement : une offre proche du prix affiché maximise vos chances de succès face à d'autres acquéreurs.`;
  }

  const savings = askingPrice - suggestedPrice;

  const negotiationMessage =
    `Compte tenu des données DVF officielles pour ${city}, je propose une offre à ${formatPrice(suggestedPrice)}. ` +
    `Le bien est affiché à ${formatPrice(pricePerSqm)}/m² contre ${formatPrice(cityAvgPerSqm)}/m² selon le marché DVF local.`;

  async function handleCopy() {
    try { await navigator.clipboard.writeText(negotiationMessage); } catch { /* ignore */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  /* ── Colour tokens per rating ── */
  const isOver = rating === "SURÉVALUÉ";
  const isFair = rating === "PRIX DU MARCHÉ";
  const isGood = rating === "EXCELLENTE AFFAIRE";

  const ratingBadge  = isOver ? "bg-red-500/10 border-red-500/20 text-red-400"
    : isFair ? "bg-blue-500/10 border-blue-500/20 text-blue-400"
    :           "bg-emerald-500/10 border-emerald-500/20 text-emerald-400";

  const accentText   = isOver ? "text-red-400"     : isFair ? "text-blue-400"     : "text-emerald-400";
  const accentBorder = isOver ? "border-red-500/20" : isFair ? "border-blue-500/20" : "border-emerald-500/20";
  const accentBg     = isOver ? "bg-red-500/10"     : isFair ? "bg-blue-500/10"     : "bg-emerald-500/10";
  const dotColor     = isOver ? "bg-orange-400"     : isFair ? "bg-blue-400"        : "bg-emerald-400";

  const TrendIcon    = isGood ? TrendingDown : isOver ? TrendingUp : Minus;

  /* ── Render ── */
  return (
    <div className="rounded-2xl bg-white/[0.04] backdrop-blur-sm border border-white/10 overflow-hidden">

      {/* Header */}
      <div className="px-6 py-4 border-b border-white/[0.07] flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/20 flex items-center justify-center shrink-0">
          <Bot size={16} className="text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm">Assistant Négociation DVF</p>
          <p className="text-gray-500 text-xs">Analyse basée sur les données officielles</p>
        </div>
        <span className={`shrink-0 text-[9px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wide ${ratingBadge}`}>
          {rating}
        </span>
      </div>

      <div className="px-6 py-5 space-y-5">

        {/* Headline */}
        <div className="flex items-start gap-2.5">
          <TrendIcon size={17} className={`shrink-0 mt-0.5 ${accentText}`} />
          <p className="text-white font-bold text-sm leading-snug">{headline}</p>
        </div>

        {/* DVF vs Asking comparison */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3.5">
            <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1.5">Marché DVF</p>
            <p className="text-xl font-black text-blue-400">{formatPrice(cityAvgPerSqm)}</p>
            <p className="text-[10px] text-gray-600 mt-0.5">par m² · référence officielle</p>
          </div>
          <div className={`rounded-xl border p-3.5 ${accentBg} ${accentBorder}`}>
            <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1.5">Ce bien</p>
            <p className={`text-xl font-black ${accentText}`}>{formatPrice(pricePerSqm)}</p>
            <p className={`text-[10px] mt-0.5 ${accentText} opacity-70`}>
              par m² ({differenceFromMarket > 0 ? "+" : ""}{differenceFromMarket}% vs DVF)
            </p>
          </div>
        </div>

        {/* Suggested offer */}
        <div className="rounded-xl bg-white/[0.04] border border-white/[0.08] p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              Offre suggérée
            </p>
            <div className="flex items-center gap-1.5">
              <p className={`text-[10px] font-bold ${accentText}`}>
                Confiance {confidenceLabel}
              </p>
              <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${dotColor}`} />
            </div>
          </div>

          <p className="text-3xl font-black text-white tracking-tighter">
            {formatPrice(suggestedPrice)}
          </p>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <span className="text-xs text-gray-500">
              -{discountPercent}% du prix affiché
            </span>
            {savings > 0 && (
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                économie de {formatPrice(savings)}
              </span>
            )}
          </div>
        </div>

        {/* Negotiation message */}
        <div className="rounded-xl bg-gradient-to-br from-blue-600/10 to-blue-900/5 border border-blue-500/15 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={12} className="text-blue-400 shrink-0" />
            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">
              Message de négociation
            </p>
          </div>
          <p className="text-gray-300 text-sm leading-relaxed">
            &ldquo;{negotiationMessage}&rdquo;
          </p>
        </div>

        {/* Advice */}
        <p className="text-gray-500 text-xs leading-relaxed">{advice}</p>

        {/* CTAs */}
        <div className="flex gap-2">
          <button
            onClick={() => onPropose?.(suggestedPrice)}
            className="flex-1 py-3 bg-gradient-to-r from-[#1E3A8A] to-blue-600 hover:from-blue-800 hover:to-blue-500 text-white font-bold rounded-xl text-sm transition-all hover:shadow-lg hover:shadow-blue-500/20 hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2"
          >
            Proposer ce prix
            <ArrowRight size={14} />
          </button>
          <button
            onClick={handleCopy}
            title="Copier le message de négociation"
            className={[
              "px-4 py-3 rounded-xl border text-sm font-bold transition-all active:scale-95",
              copied
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                : "bg-white/[0.04] border-white/10 text-gray-400 hover:text-white hover:border-white/20",
            ].join(" ")}
          >
            {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
