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
