/**
 * Computes a 0-100 "FairScore" expressing how a listing's price per m²
 * compares to the local DVF average. 100 = at or below market, decreasing
 * by 2 points per percentage point above the local average (≥80 ≈ "Prix juste",
 * ≥60 ≈ "À négocier", below that ≈ "Surévalué").
 */
export function calculateFairScore(listingPricePerM2: number, dvfAvgPricePerM2: number): number {
  if (dvfAvgPricePerM2 <= 0) return 0;

  const percentDiff = ((listingPricePerM2 - dvfAvgPricePerM2) / dvfAvgPricePerM2) * 100;
  return Math.min(100, Math.max(0, Math.round(100 - percentDiff * 2)));
}
