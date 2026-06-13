"use client";
import { Bot, TrendingUp, TrendingDown, Minus, Info } from "lucide-react";
import { getNegotiationAdvice } from "../../lib/utils/pricingLogic";
import { formatPrice } from "../../lib/utils/formatters";

interface NegotiationAdvisorProps {
  askingPrice?: number;
  surface?: number;
  localAvgPerSqm: number;
  city: string;
}

export default function NegotiationAdvisor({
  askingPrice, surface, localAvgPerSqm, city,
}: NegotiationAdvisorProps) {

  /* Need both price and surface to compare against the DVF benchmark */
  if (!askingPrice || !surface) {
    return (
      <div className="rounded-2xl bg-white/[0.04] backdrop-blur-sm border border-white/10 p-5">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/20 flex items-center justify-center shrink-0">
            <Bot size={16} className="text-blue-400" />
          </div>
          <p className="text-white font-bold text-sm">Avis de négociation</p>
        </div>
        <div className="flex items-start gap-2 text-xs text-gray-400 leading-relaxed">
          <Info size={13} className="shrink-0 mt-0.5 text-gray-500" />
          <p>
            Renseignez la surface et le prix demandé du bien dans le formulaire ci-dessus
            pour comparer son prix au marché DVF de {city}.
          </p>
        </div>
      </div>
    );
  }

  const advice = getNegotiationAdvice(askingPrice, surface, localAvgPerSqm);
  const { verdict, verdictLabel, pricePerSqm, gapPercent, negotiationMargin, explanation } = advice;

  const isOver = verdict === "SUREVALUE";
  const isFair = verdict === "PRIX_CORRECT";

  const badgeClass = isOver
    ? "bg-red-500/10 border-red-500/20 text-red-400"
    : isFair
    ? "bg-blue-500/10 border-blue-500/20 text-blue-400"
    : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400";

  const accentText = isOver ? "text-red-400" : isFair ? "text-blue-400" : "text-emerald-400";
  const TrendIcon  = isOver ? TrendingUp : isFair ? Minus : TrendingDown;

  return (
    <div className="rounded-2xl bg-white/[0.04] backdrop-blur-sm border border-white/10 overflow-hidden">

      {/* Header */}
      <div className="px-5 py-4 border-b border-white/[0.07] flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/20 flex items-center justify-center shrink-0">
          <Bot size={16} className="text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm">Avis de négociation</p>
          <p className="text-gray-500 text-xs">Comparaison au marché DVF de {city}</p>
        </div>
        <span className={`shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wide ${badgeClass}`}>
          {verdictLabel}
        </span>
      </div>

      <div className="px-5 py-4 space-y-4">

        {/* Price comparison */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3.5">
            <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1.5">Prix demandé</p>
            <p className="text-xl font-black text-white">{formatPrice(pricePerSqm)}</p>
            <p className="text-[10px] text-gray-600 mt-0.5">par m² · {formatPrice(askingPrice)} au total</p>
          </div>
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3.5">
            <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1.5">Moyenne DVF locale</p>
            <p className="text-xl font-black text-blue-400">{formatPrice(localAvgPerSqm)}</p>
            <p className="text-[10px] text-gray-600 mt-0.5">par m² · référence officielle</p>
          </div>
        </div>

        {/* Gap + margin */}
        <div className="rounded-xl bg-white/[0.04] border border-white/[0.08] p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <TrendIcon size={18} className={accentText} />
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Écart au marché</p>
              <p className={`text-lg font-black ${accentText}`}>
                {gapPercent > 0 ? "+" : ""}{gapPercent}%
              </p>
            </div>
          </div>
          {negotiationMargin != null && (
            <div className="text-right">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Marge de négociation</p>
              <p className="text-lg font-black text-red-400">~{formatPrice(negotiationMargin)}</p>
            </div>
          )}
        </div>

        {/* Explanation */}
        <p className="text-gray-400 text-xs leading-relaxed">{explanation}</p>
      </div>
    </div>
  );
}
