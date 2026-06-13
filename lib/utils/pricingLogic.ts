import { formatPrice } from './formatters';

export type PriceRating = 'SURÉVALUÉ' | 'PRIX DU MARCHÉ' | 'EXCELLENTE AFFAIRE';

export interface PropertyMetrics {
  pricePerSqm: number;
  agencySavings: number;
  differenceFromMarket: number; // signed percentage: positive = above DVF, negative = below
  rating: PriceRating;
}

export function calculatePropertyMetrics(
  askingPrice: number,
  surface: number,
  localDvfAverage: number,
): PropertyMetrics {
  const pricePerSqm = Math.round(askingPrice / surface);
  const agencySavings = askingPrice * 0.05;
  const differenceFromMarket = Math.round(
    ((pricePerSqm - localDvfAverage) / localDvfAverage) * 100,
  );

  let rating: PriceRating;
  if (differenceFromMarket > 10) {
    rating = 'SURÉVALUÉ';
  } else if (differenceFromMarket >= 0) {
    rating = 'PRIX DU MARCHÉ';
  } else {
    rating = 'EXCELLENTE AFFAIRE';
  }

  return { pricePerSqm, agencySavings, differenceFromMarket, rating };
}

/* ── Negotiation advisor ───────────────────────────────────────────────── */

export type NegotiationVerdict = 'PRIX_CORRECT' | 'SUREVALUE' | 'BONNE_AFFAIRE';

export interface NegotiationAdvice {
  verdict: NegotiationVerdict;
  verdictLabel: string;
  pricePerSqm: number;
  localAvgPerSqm: number;
  gapPercent: number; // signed percentage vs local DVF average
  negotiationMargin: number | null; // € amount to negotiate down — only set when SUREVALUE
  explanation: string;
}

/**
 * Compares an asking price against the local DVF benchmark and returns a
 * French-language verdict, gap percentage and (when overpriced) a
 * negotiation margin in euros.
 */
export function getNegotiationAdvice(
  askingPrice: number,
  surface: number,
  localAvgPerSqm: number,
): NegotiationAdvice {
  const { pricePerSqm, differenceFromMarket, rating } =
    calculatePropertyMetrics(askingPrice, surface, localAvgPerSqm);

  let verdict: NegotiationVerdict;
  let verdictLabel: string;
  let negotiationMargin: number | null = null;
  let explanation: string;

  if (rating === 'SURÉVALUÉ') {
    verdict = 'SUREVALUE';
    verdictLabel = 'Surévalué';
    const discountPercent = Math.min(12, Math.max(5, Math.round(differenceFromMarket * 0.7)));
    negotiationMargin = Math.round(askingPrice * (discountPercent / 100));
    explanation = `Ce prix est ${differenceFromMarket}% au-dessus de la moyenne DVF du secteur `
      + `(${formatPrice(localAvgPerSqm)}/m²). Une marge de négociation d'environ `
      + `${formatPrice(negotiationMargin)} (-${discountPercent}%) est justifiée par les données officielles.`;
  } else if (rating === 'PRIX DU MARCHÉ') {
    verdict = 'PRIX_CORRECT';
    verdictLabel = 'Prix correct';
    explanation = `Ce prix est aligné avec le marché local `
      + `(écart de ${differenceFromMarket > 0 ? '+' : ''}${differenceFromMarket}% par rapport à la moyenne DVF `
      + `de ${formatPrice(localAvgPerSqm)}/m²).`;
  } else {
    verdict = 'BONNE_AFFAIRE';
    verdictLabel = 'Bonne affaire';
    explanation = `Ce prix est ${Math.abs(differenceFromMarket)}% inférieur à la moyenne DVF du secteur `
      + `(${formatPrice(localAvgPerSqm)}/m²) — une opportunité à saisir rapidement.`;
  }

  return {
    verdict,
    verdictLabel,
    pricePerSqm,
    localAvgPerSqm,
    gapPercent: differenceFromMarket,
    negotiationMargin,
    explanation,
  };
}
