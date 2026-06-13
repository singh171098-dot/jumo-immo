import { prisma } from "./prisma";
import type { Prisma } from "@prisma/client";

export interface DVFComparable {
  id: string;
  date: string;
  price: number;
  surface: number;
  city: string;
  propertyType: string;
  pricePerM2: number;
}

export interface DVFTrendPoint {
  year: number;
  averagePricePerM2: number;
  transactionCount: number;
}

export interface DVFEstimationData {
  hasData: boolean;
  postalCode: string;
  city?: string | null;
  transactionCount: number;
  averagePricePerM2: number | null;
  comparables: DVFComparable[];
  trend: DVFTrendPoint[];
}

const COMPARABLES_LIMIT = 5;
// Bounds the rows pulled for the yearly trend breakdown — DVF covers ~5 years
// per postal code, so this comfortably covers even the densest areas.
const TREND_ROW_LIMIT = 20_000;

function emptyResult(postalCode: string, city?: string | null): DVFEstimationData {
  return {
    hasData: false,
    postalCode,
    city: city ?? null,
    transactionCount: 0,
    averagePricePerM2: null,
    comparables: [],
    trend: [],
  };
}

/**
 * Fetches real DVF transaction data for a postal code (exact match), used to
 * power the estimation UI (local average €/m², comparables, yearly trend).
 *
 * `city`, when provided, narrows results with a case-insensitive match — but
 * falls back to the postal-code-only set if no rows share that city name, so
 * minor formatting differences (accents, case) never produce an empty result.
 */
export async function getDvfEstimationData(
  postalCode: string,
  city?: string,
): Promise<DVFEstimationData> {
  const trimmedPostalCode = postalCode.trim();
  const normalizedCity = city?.trim() || undefined;

  if (!trimmedPostalCode) {
    return emptyResult(trimmedPostalCode, normalizedCity);
  }

  const baseWhere: Prisma.DVFTransactionWhereInput = {
    postalCode: trimmedPostalCode,
    price: { gt: 0 },
    surface: { gt: 0 },
  };

  let where = baseWhere;
  if (normalizedCity) {
    const cityWhere: Prisma.DVFTransactionWhereInput = {
      ...baseWhere,
      city: { equals: normalizedCity, mode: "insensitive" },
    };
    const cityMatchCount = await prisma.dVFTransaction.count({ where: cityWhere });
    if (cityMatchCount > 0) where = cityWhere;
  }

  const [aggregate, comparableRows, trendRows] = await Promise.all([
    prisma.dVFTransaction.aggregate({
      where,
      _sum: { price: true, surface: true },
      _count: true,
    }),
    prisma.dVFTransaction.findMany({
      where,
      orderBy: { date: "desc" },
      take: COMPARABLES_LIMIT,
      select: { id: true, date: true, price: true, surface: true, city: true, propertyType: true },
    }),
    prisma.dVFTransaction.findMany({
      where,
      orderBy: { date: "desc" },
      take: TREND_ROW_LIMIT,
      select: { date: true, price: true, surface: true },
    }),
  ]);

  const transactionCount = aggregate._count;
  if (transactionCount === 0) {
    return emptyResult(trimmedPostalCode, normalizedCity);
  }

  const totalPrice = aggregate._sum.price ?? 0;
  const totalSurface = aggregate._sum.surface ?? 0;
  const averagePricePerM2 = totalSurface > 0 ? Math.round(totalPrice / totalSurface) : null;

  const comparables: DVFComparable[] = comparableRows.map(row => ({
    id: row.id,
    date: row.date.toISOString(),
    price: row.price,
    surface: row.surface,
    city: row.city,
    propertyType: row.propertyType,
    pricePerM2: Math.round(row.price / row.surface),
  }));

  const yearBuckets = new Map<number, { totalPrice: number; totalSurface: number; count: number }>();
  for (const row of trendRows) {
    const year = row.date.getFullYear();
    const bucket = yearBuckets.get(year) ?? { totalPrice: 0, totalSurface: 0, count: 0 };
    bucket.totalPrice += row.price;
    bucket.totalSurface += row.surface;
    bucket.count += 1;
    yearBuckets.set(year, bucket);
  }

  const trend: DVFTrendPoint[] = Array.from(yearBuckets.entries())
    .map(([year, bucket]) => ({
      year,
      averagePricePerM2: Math.round(bucket.totalPrice / bucket.totalSurface),
      transactionCount: bucket.count,
    }))
    .sort((a, b) => a.year - b.year);

  return {
    hasData: true,
    postalCode: trimmedPostalCode,
    city: comparableRows[0]?.city ?? normalizedCity ?? null,
    transactionCount,
    averagePricePerM2,
    comparables,
    trend,
  };
}
