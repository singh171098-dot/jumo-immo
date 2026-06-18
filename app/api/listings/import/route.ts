import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveLocationToPostalCode } from "@/lib/locationResolver";
import type { Dpe } from "@prisma/client";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const PARIS_FALLBACK = { latitude: 48.8566, longitude: 2.3522 };

function withCors(body: Record<string, unknown>, init?: { status?: number }) {
  return NextResponse.json(body, { status: init?.status ?? 200, headers: CORS_HEADERS });
}

/* Coerces scraped strings like "350 000 €" or "65,5 m²" into a plain number. */
function parseNumericField(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  if (typeof value !== "string") return null;
  const normalized = value.replace(/[\s  ]/g, "").replace(",", ".");
  const match = normalized.match(/\d+(?:\.\d+)?/);
  if (!match) return null;
  const num = parseFloat(match[0]);
  return Number.isFinite(num) ? Math.round(num) : null;
}

function detectSource(url: string): string {
  let host = "";
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return "EXTENSION";
  }
  if (host.includes("seloger")) return "SELOGER";
  if (host.includes("leboncoin")) return "LEBONCOIN";
  if (host.includes("bienici")) return "BIENICI";
  return "EXTENSION";
}

/* Resolves the scraped location string to a postal code and lat/lng via the
   official French government address API (api-adresse.data.gouv.fr). */
async function geocodeLocation(location: string) {
  const resolved = await resolveLocationToPostalCode(location);
  const fallbackCity = resolved?.city || location || "France";

  try {
    const query = encodeURIComponent(resolved?.postalCode || location);
    const res = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${query}&limit=1`);
    const data = await res.json();
    const feature = data?.features?.[0];
    const coordinates = feature?.geometry?.coordinates;

    if (coordinates) {
      return {
        postalCode: resolved?.postalCode ?? feature?.properties?.postcode ?? null,
        city: feature?.properties?.city || fallbackCity,
        latitude: coordinates[1],
        longitude: coordinates[0],
      };
    }
  } catch {
    // Network/parse error — fall through to the default below.
  }

  return {
    postalCode: resolved?.postalCode ?? null,
    city: fallbackCity,
    latitude: PARIS_FALLBACK.latitude,
    longitude: PARIS_FALLBACK.longitude,
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: Request) {
  try {
    let payload: {
      price?: unknown;
      surface?: unknown;
      location?: unknown;
      url?: unknown;
      imageUrl?: unknown;
      title?: unknown;
    };

    try {
      payload = await req.json();
    } catch {
      return withCors({ success: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const url = typeof payload.url === "string" ? payload.url.trim() : "";
    if (!url) {
      return withCors({ success: false, error: "Missing required field: url" }, { status: 400 });
    }

    const title =
      typeof payload.title === "string" && payload.title.trim()
        ? payload.title.trim()
        : "Annonce importée via Jumo-Immo Analyzer";

    const price = parseNumericField(payload.price) ?? 0;
    const surface = parseNumericField(payload.surface) ?? 1;
    const locationString = typeof payload.location === "string" ? payload.location.trim() : "";
    const imageUrl = typeof payload.imageUrl === "string" ? payload.imageUrl.trim() : "";

    const { city, latitude, longitude } = await geocodeLocation(locationString);
    const source = detectSource(url);

    const property = await prisma.property.upsert({
      where: { externalId: url },
      update: {
        title,
        price,
        surface,
        city,
        latitude,
        longitude,
        ...(imageUrl ? { images: [imageUrl] } : {}),
      },
      create: {
        title,
        description: title,
        price,
        surface,
        rooms: 0,
        dpe: "D" as Dpe,
        latitude,
        longitude,
        city,
        fairScore: 0,
        cityAvgPerSqm: 0,
        images: imageUrl ? [imageUrl] : [],
        source,
        externalUrl: url,
        externalId: url,
      },
    });

    return withCors({
      success: true,
      redirectUrl: `http://localhost:3000/annonces/${property.id}`,
    });
  } catch (error: any) {
    console.error("[listings/import] error:", error);
    return withCors(
      { success: false, error: error?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
