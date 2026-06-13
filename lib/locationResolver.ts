import { prisma } from "./prisma";

export interface ResolvedLocation {
  postalCode: string;
  city: string;
  department: string;
  source: "direct" | "geo-api" | "db-text-search" | "department-fallback";
  confidence: "high" | "medium" | "low";
  originalInput: string;
}

interface GeoApiFeature {
  properties: {
    postcode?: string;
    citycode?: string;
    city?: string;
    name?: string;
    context?: string;
    score?: number;
    type?: string;
  };
}

interface GeoApiResponse {
  features: GeoApiFeature[];
}

const GEO_API_TIMEOUT_MS = 3000;
const GEO_API_SCORE_THRESHOLD = 0.3;

// Words that add noise to a location string without identifying a place.
const NOISE_WORDS = [
  "appartement",
  "maison",
  "studio",
  "t1",
  "t2",
  "t3",
  "t4",
  "eme",
  "arrondissement",
];

// Hardcoded department codes for major cities — last-resort fallback when
// neither the Geo API nor a DB text search can resolve a location.
const CITY_DEPARTMENT_MAP: Record<string, string> = {
  paris: "75",
  lyon: "69",
  marseille: "13",
  bordeaux: "33",
  toulouse: "31",
  nice: "06",
  nantes: "44",
  strasbourg: "67",
  montpellier: "34",
  rennes: "35",
  lille: "59",
};

function stripAccents(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function cleanLocationString(input: string): string {
  let cleaned = stripAccents(input).toLowerCase();

  for (const word of NOISE_WORDS) {
    cleaned = cleaned.replace(new RegExp(`\\b${word}\\b`, "g"), " ");
  }

  return cleaned.replace(/\s+/g, " ").trim();
}

function extractDepartment(locationString: string): string | null {
  const parenMatch = locationString.match(/\((\d{2})\)/);
  if (parenMatch) return parenMatch[1];

  const normalized = stripAccents(locationString).toLowerCase();
  for (const [name, department] of Object.entries(CITY_DEPARTMENT_MAP)) {
    if (normalized.includes(name)) return department;
  }

  return null;
}

/**
 * Resolves a free-form location string ("Créteil", "93000 Bobigny",
 * "Montreuil (93)", "Appartement T3 Vincennes"...) to a postal code usable
 * for querying DVFTransaction, via a 4-step waterfall: a standalone 5-digit
 * code in the string, the official French government Geo API, a text search
 * over DVF city names, and finally a department-level fallback.
 *
 * Never throws — returns null if every step fails.
 */
export async function resolveLocationToPostalCode(
  locationString: string,
): Promise<ResolvedLocation | null> {
  try {
    // Step A — direct postal code detection
    const directMatch = locationString.match(/\b(\d{5})\b/);
    if (directMatch) {
      const postalCode = directMatch[1];
      return {
        postalCode,
        city: "",
        department: postalCode.slice(0, 2),
        source: "direct",
        confidence: "high",
        originalInput: locationString,
      };
    }

    // Step B — French government Geo API
    const geoResult = await resolveViaGeoApi(locationString);
    if (geoResult) return geoResult;

    // Step C — Prisma city text search
    const dbResult = await resolveViaDbTextSearch(locationString);
    if (dbResult) return dbResult;

    // Step D — department-level fallback
    const departmentResult = await resolveViaDepartmentFallback(locationString);
    if (departmentResult) return departmentResult;

    return null;
  } catch (error) {
    console.error("[LocationResolver] Error:", error);
    return null;
  }
}

async function resolveViaGeoApi(locationString: string): Promise<ResolvedLocation | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEO_API_TIMEOUT_MS);

  try {
    const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(locationString)}&limit=3&type=municipality`;
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return null;

    const data = (await response.json()) as GeoApiResponse;

    for (const feature of data.features) {
      const { postcode, city, score } = feature.properties;
      if (postcode && city && score !== undefined && score > GEO_API_SCORE_THRESHOLD) {
        return {
          postalCode: postcode,
          city,
          department: postcode.slice(0, 2),
          source: "geo-api",
          confidence: "high",
          originalInput: locationString,
        };
      }
    }

    return null;
  } catch {
    // Network error, abort/timeout, or malformed response — fall through.
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function resolveViaDbTextSearch(locationString: string): Promise<ResolvedLocation | null> {
  const cleaned = cleanLocationString(locationString);
  if (!cleaned) return null;

  const result = await prisma.dVFTransaction.findFirst({
    where: {
      city: { contains: cleaned, mode: "insensitive" },
      surface: { gt: 0 },
      price: { gt: 0 },
    },
    select: { postalCode: true, city: true },
    orderBy: { date: "desc" },
  });

  if (!result) return null;

  return {
    postalCode: result.postalCode,
    city: result.city,
    department: result.postalCode.slice(0, 2),
    source: "db-text-search",
    confidence: "medium",
    originalInput: locationString,
  };
}

async function resolveViaDepartmentFallback(locationString: string): Promise<ResolvedLocation | null> {
  const department = extractDepartment(locationString);
  if (!department) return null;

  // DVFTransaction has no `department` column — derive it from the postal
  // code prefix instead.
  const result = await prisma.dVFTransaction.findFirst({
    where: {
      postalCode: { startsWith: department },
      surface: { gt: 0 },
      price: { gt: 0 },
    },
    select: { postalCode: true, city: true },
    orderBy: { date: "desc" },
  });

  if (!result) return null;

  return {
    postalCode: result.postalCode,
    city: result.city,
    department,
    source: "department-fallback",
    confidence: "low",
    originalInput: locationString,
  };
}

/*
// MANUAL TEST — uncomment and run with: npx tsx lib/locationResolver.ts
async function runTests() {
  const testCases = [
    "Paris 19ème",
    "Créteil",
    "Nantes",
    "Bordeaux",
    "93000 Bobigny",
    "Montreuil (93)",
    "Appartement T3 Vincennes",
    "Buttes-Chaumont, Paris",
    "75019",
    "Lyon 3ème",
    "Marseille 6e",
    "Strasbourg",
    "13100 Aix-en-Provence",
  ];

  for (const testCase of testCases) {
    const result = await resolveLocationToPostalCode(testCase);
    console.log(`"${testCase}" -> ${result ? `${result.postalCode} (${result.source}, ${result.confidence})` : "NULL"}`);
  }
}

runTests();
*/
