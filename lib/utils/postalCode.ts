// Base INSEE postal code (commune-level, before arrondissement offset)
const ARRONDISSEMENT_CITY_BASES: Record<string, number> = {
  paris: 75000,
  lyon: 69000,
  marseille: 13000,
};

// Highest valid arrondissement number for each city.
const ARRONDISSEMENT_MAX: Record<string, number> = {
  paris: 20,
  lyon: 9,
  marseille: 16,
};

// Matches e.g. "paris 19eme", "paris 19eme arrondissement", "paris 1er", "lyon 6e".
// Input is expected to already be lowercased and stripped of accents.
const ARRONDISSEMENT_PATTERN =
  /^(paris|lyon|marseille)\s+(\d{1,2})\s*(?:er|ere|eme|e)?\s*(?:arrondissement)?$/;

/**
 * Extracts a 5-digit French postal code from a free-form city string.
 *
 * Passes through values that are already a 5-digit postal code, resolves
 * Paris/Lyon/Marseille arrondissement notations — including the
 * "Paris 19ème arrondissement" form used by our seed data — and returns
 * null when no postal code can be determined (e.g. "Bordeaux").
 */
export function extractPostalCode(cityString: string): string | null {
  const trimmed = cityString.trim();

  if (/^\d{5}$/.test(trimmed)) {
    return trimmed;
  }

  const normalized = trimmed
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, ""); // strip accents: é/è/ê/ë -> e

  const match = normalized.match(ARRONDISSEMENT_PATTERN);
  if (!match) return null;

  const city = match[1];
  const arrondissement = parseInt(match[2], 10);
  if (arrondissement < 1 || arrondissement > ARRONDISSEMENT_MAX[city]) return null;

  return String(ARRONDISSEMENT_CITY_BASES[city] + arrondissement).padStart(5, "0");
}
