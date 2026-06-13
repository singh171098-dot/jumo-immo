import { prisma } from "./prisma";
import type { Prisma } from "@prisma/client";
import { resolveLocationToPostalCode } from "./locationResolver";

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
  city: string;
  department: string;
  transactionCount: number;
  averagePricePerM2: number | null;
  dataSource: "postalCode" | "department" | null;
  resolverSource: "direct" | "geo-api" | "db-text-search" | "department-fallback" | null;
  confidence: "high" | "medium" | "low" | null;
  comparables: DVFComparable[];
  trend: DVFTrendPoint[];
}

const COMPARABLES_LIMIT = 5;
const POSTAL_CODE_ROW_LIMIT = 2_000;
const DEPARTMENT_ROW_LIMIT = 500;

function emptyResult(): DVFEstimationData {
  return {
    hasData: false,
    postalCode: "",
    city: "",
    department: "",
    transactionCount: 0,
    averagePricePerM2: null,
    dataSource: null,
    resolverSource: null,
    confidence: null,
    comparables: [],
    trend: [],
  };
}

/**
 * Resolves a free-form location string ("Créteil", "Paris 19ème
 * arrondissement", "93000 Bobigny"...) via `resolveLocationToPostalCode`,
 * then aggregates real DVFTransaction rows for that postal code (or, for
 * low-confidence department-level matches, the whole department) into the
 * data powering the estimation UI: local average €/m², comparables, and
 * yearly trend.
 */
export async function getDVFEstimationData(locationString: string): Promise<DVFEstimationData> {
  const resolved = await resolveLocationToPostalCode(locationString);
  if (!resolved) return emptyResult();

  const dataSource: "postalCode" | "department" = resolved.confidence === "low" ? "department" : "postalCode";

  // DVFTransaction has no `department` column — the department-level
  // fallback matches on the postal code prefix instead.
  const where: Prisma.DVFTransactionWhereInput = dataSource === "postalCode"
    ? { postalCode: resolved.postalCode, surface: { gt: 0 }, price: { gt: 0 } }
    : { postalCode: { startsWith: resolved.department }, surface: { gt: 0 }, price: { gt: 0 } };

  const take = dataSource === "postalCode" ? POSTAL_CODE_ROW_LIMIT : DEPARTMENT_ROW_LIMIT;

  const [transactionCount, transactions] = await Promise.all([
    prisma.dVFTransaction.count({ where }),
    prisma.dVFTransaction.findMany({
      where,
      select: { id: true, date: true, price: true, surface: true, city: true, propertyType: true, postalCode: true },
      orderBy: { date: "desc" },
      take,
    }),
  ]);

  if (transactionCount === 0) {
    return {
      ...emptyResult(),
      postalCode: resolved.postalCode,
      city: resolved.city,
      department: resolved.department,
      dataSource,
      resolverSource: resolved.source,
      confidence: resolved.confidence,
    };
  }

  const totalValue = transactions.reduce((sum, t) => sum + t.price, 0);
  const totalSurface = transactions.reduce((sum, t) => sum + t.surface, 0);
  const averagePricePerM2 = totalSurface > 0 ? Math.round(totalValue / totalSurface) : null;

  const comparables: DVFComparable[] = transactions.slice(0, COMPARABLES_LIMIT).map(t => ({
    id: t.id,
    date: t.date.toISOString().split("T")[0],
    price: t.price,
    surface: t.surface,
    city: t.city,
    propertyType: t.propertyType,
    pricePerM2: t.surface > 0 ? Math.round(t.price / t.surface) : 0,
  }));

  const trendMap = new Map<number, { totalValue: number; totalSurface: number; count: number }>();
  for (const t of transactions) {
    if (t.surface <= 0) continue;
    const year = t.date.getFullYear();
    const bucket = trendMap.get(year) ?? { totalValue: 0, totalSurface: 0, count: 0 };
    bucket.totalValue += t.price;
    bucket.totalSurface += t.surface;
    bucket.count += 1;
    trendMap.set(year, bucket);
  }

  const trend: DVFTrendPoint[] = Array.from(trendMap.entries())
    .map(([year, bucket]) => ({
      year,
      averagePricePerM2: Math.round(bucket.totalValue / bucket.totalSurface),
      transactionCount: bucket.count,
    }))
    .sort((a, b) => a.year - b.year);

  return {
    hasData: true,
    postalCode: resolved.postalCode,
    city: transactions[0]?.city ?? resolved.city,
    department: resolved.department,
    transactionCount,
    averagePricePerM2,
    dataSource,
    resolverSource: resolved.source,
    confidence: resolved.confidence,
    comparables,
    trend,
  };
}
