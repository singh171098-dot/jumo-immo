// Base INSEE postal code (commune-level, before arrondissement offset)
const ARRONDISSEMENT_CITY_BASES: Record<string, number> = {
  paris: 75000,
  lyon: 69000,
  marseille: 13000,
};

const ARRONDISSEMENT_PATTERN = /^(paris|lyon|marseille)\s+(\d{1,2})(?:er|ère|ème|eme|e)?$/i;

/**
 * Extracts a 5-digit French postal code from a free-form city string.
 *
 * Passes through values that are already a 5-digit postal code, resolves
 * Paris/Lyon/Marseille arrondissement notations (e.g. "Paris 19ème" -> "75019"),
 * and returns null when no postal code can be determined (e.g. "Bordeaux").
 */
export function extractPostalCode(cityString: string): string | null {
  const trimmed = cityString.trim();

  if (/^\d{5}$/.test(trimmed)) {
    return trimmed;
  }

  const match = trimmed.match(ARRONDISSEMENT_PATTERN);
  if (!match) return null;

  const base = ARRONDISSEMENT_CITY_BASES[match[1].toLowerCase()];
  const arrondissement = parseInt(match[2], 10);
  if (arrondissement < 1 || arrondissement > 20) return null;

  return String(base + arrondissement).padStart(5, "0");
}
