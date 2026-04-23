"use client";
import { TrendingDown, AlertTriangle, BadgeCheck, Sparkles, TrendingUp } from 'lucide-react';
import { formatPrice } from '../lib/utils/formatters';
import { calculatePropertyMetrics, type PriceRating } from '../lib/utils/pricingLogic';

export interface FairPriceCardProps {
  askingPrice: number;
  surface: number;
  localDvfAverage: number;
  originalPrice: number;
  priceDropDate: string; // e.g. "15 février 2025"
}

// ── Rating badge config ──────────────────────────────────────────────────────
const RATING_CONFIG: Record<
  PriceRating,
  { label: string; icon: typeof BadgeCheck; pill: string; text: string; verdict: string }
> = {
  'SURÉVALUÉ': {
    label: 'Surévalué',
    icon: AlertTriangle,
    pill: 'bg-red-100 text-red-700',
    text: 'text-red-700',
    verdict: "bg-red-50 text-red-700",
  },
  'PRIX DU MARCHÉ': {
    label: 'Prix du marché',
    icon: BadgeCheck,
    pill: 'bg-blue-100 text-[#1E3A8A]',
    text: 'text-[#1E3A8A]',
    verdict: "bg-blue-50 text-[#1E3A8A]",
  },
  'EXCELLENTE AFFAIRE': {
    label: 'Excellente affaire',
    icon: TrendingUp,
    pill: 'bg-emerald-100 text-emerald-700',
    text: 'text-emerald-700',
    verdict: "bg-emerald-50 text-emerald-700",
  },
};

export default function FairPriceCard({
  askingPrice,
  surface,
  localDvfAverage,
  originalPrice,
  priceDropDate,
}: FairPriceCardProps) {
  const { pricePerSqm, agencySavings, differenceFromMarket, rating } =
    calculatePropertyMetrics(askingPrice, surface, localDvfAverage);

  const priceDrop = Math.round(((originalPrice - askingPrice) / originalPrice) * 100);
  const cfg = RATING_CONFIG[rating];
  const RatingIcon = cfg.icon;

  // Castorus verdict copy
  const dvfVerdictText = rating === 'SURÉVALUÉ'
    ? `Prix supérieur au marché de ${differenceFromMarket}% — marge de négociation possible.`
    : rating === 'PRIX DU MARCHÉ'
    ? `Prix aligné avec le marché local (écart : +${differenceFromMarket}%). Bonne opportunité.`
    : `Prix inférieur au marché de ${Math.abs(differenceFromMarket)}% — affaire à saisir.`;

  return (
    <div className="rounded-3xl bg-white/80 backdrop-blur-xl border border-white/20 shadow-2xl shadow-slate-200/50 overflow-hidden">

      {/* ── Section 1 : Castorus — Historique des prix ── */}
      <div className="p-6 pb-5">
        <div className="flex items-center gap-2 mb-5">
          <TrendingDown size={16} className="text-[#1E3A8A]" />
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Historique des prix</span>
        </div>

        {/* Crossed-out original + drop badge */}
        <div className="flex items-baseline gap-3 mb-2">
          <span className="text-lg font-semibold text-slate-300 line-through">
            {formatPrice(originalPrice)}
          </span>
          <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full">
            ↓ Baisse de {priceDrop}%
          </span>
        </div>

        {/* Current asking price — massive */}
        <p className="text-4xl font-black tracking-tighter text-slate-900 mb-1">
          {formatPrice(askingPrice)}
        </p>
        <p className="text-sm text-slate-400">
          {formatPrice(pricePerSqm)} / m²
        </p>

        {/* Castorus date line */}
        <p className="text-xs text-slate-400 mt-2">
          Baisse de{' '}
          <span className="font-semibold text-emerald-600">{priceDrop}%</span>
          {' '}depuis le {priceDropDate}
        </p>
      </div>

      <div className="h-px bg-slate-100 mx-6" />

      {/* ── Section 2 : Radar DVF ── */}
      <div className="p-6 py-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <RatingIcon size={16} className={cfg.text} />
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Radar DVF</span>
          </div>
          {/* Rating pill */}
          <span className={`text-xs font-black px-3 py-1 rounded-full ${cfg.pill}`}>
            {cfg.label}
          </span>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-500">Prix demandé / m²</span>
            <span className="font-bold text-slate-900">{formatPrice(pricePerSqm)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-500">Prix moyen DVF du quartier</span>
            <span className="font-bold text-[#1E3A8A]">{formatPrice(localDvfAverage)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-500">Écart au marché</span>
            <span className={`font-bold text-sm ${differenceFromMarket > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
              {differenceFromMarket > 0 ? `+${differenceFromMarket}%` : `${differenceFromMarket}%`}
            </span>
          </div>

          {/* Verdict banner */}
          <div className={`flex items-start gap-2 rounded-2xl px-3.5 py-3 mt-1 ${cfg.verdict}`}>
            <RatingIcon size={14} className={`${cfg.text} shrink-0 mt-0.5`} />
            <p className={`text-xs font-medium ${cfg.text}`}>{dvfVerdictText}</p>
          </div>
        </div>
      </div>

      {/* ── Section 3 : Économie d'agence — Emerald unlock banner ── */}
      <div className="bg-gradient-to-br from-[#10B981] to-emerald-600 p-6">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={16} className="text-white/80" />
          <span className="text-xs font-bold uppercase tracking-widest text-white/70">
            Sans frais d'agence
          </span>
        </div>
        <p className="text-white/80 text-sm font-medium">Vous économisez</p>
        <p className="text-3xl font-black tracking-tighter text-white my-1">
          {formatPrice(agencySavings)}
        </p>
        <p className="text-emerald-100 text-xs leading-relaxed">
          de frais d'agence sur ce bien, grâce à Jumo-Immo.
          <br />
          Soit exactement 5% du prix de vente ({formatPrice(askingPrice)}).
        </p>
      </div>

    </div>
  );
}
