import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Dpe } from "@prisma/client";

/* ── Apify item shape (fields vary by scraper) ───────────────────────────── */
interface ApifyItem {
  id?:          string;
  title?:       string;
  description?: string;
  price?:       number;
  surface?:     number;
  latitude?:    number;
  longitude?:   number;
  images?:      string[];
  url?:         string;
  source?:      string;
  city?:        string;
  [key: string]: unknown;
}

/* ── POST /api/webhooks/ingest ───────────────────────────────────────────── */
export async function POST(req: NextRequest) {

  /* ── Auth ──────────────────────────────────────────────────────────────── */
  const secret = process.env.JUMO_SECRET_SCRAPER_KEY ?? "";
  const auth   = req.headers.get("authorization") ?? "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  /* ── Parse Apify webhook payload ────────────────────────────────────────── */
  let body: { resource?: { defaultDatasetId?: string } };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const datasetId = body?.resource?.defaultDatasetId;
  if (!datasetId) {
    return Response.json({ error: "Missing resource.defaultDatasetId" }, { status: 400 });
  }

  /* ── Fetch items from Apify dataset ─────────────────────────────────────── */
  let items: ApifyItem[];
  try {
    const res = await fetch(
      `https://api.apify.com/v2/datasets/${datasetId}/items`
    );
    if (!res.ok) {
      return Response.json({ error: "Failed to fetch Apify dataset" }, { status: 502 });
    }
    items = (await res.json()) as ApifyItem[];
  } catch (err) {
    console.error("[ingest] dataset fetch error", err);
    return Response.json({ error: "Failed to reach Apify API" }, { status: 502 });
  }

  /* ── Process items ───────────────────────────────────────────────────────── */
  let upserted = 0;
  let skipped  = 0;

  for (const item of items) {
    /* Skip if missing required fields */
    if (!item.id || !item.price) {
      skipped++;
      continue;
    }

    const externalId  = item.id;
    const externalUrl = item.url         ?? "";
    const source      = (typeof item.source === "string" && item.source) ? item.source : "SELOGER";
    const title       = item.title       ?? "Annonce externe";
    const description = item.description ?? title;
    const price       = Math.round(item.price);
    const surface     = typeof item.surface   === "number" ? Math.round(item.surface) : 1;
    const latitude    = typeof item.latitude  === "number" ? item.latitude  : 48.8566;
    const longitude   = typeof item.longitude === "number" ? item.longitude : 2.3522;
    const city        = typeof item.city      === "string" ? item.city      : "France";
    const images      = Array.isArray(item.images) ? (item.images as string[]) : [];

    try {
      await prisma.property.upsert({
        where: { externalId },
        update: {
          price,
          ...(item.description !== undefined ? { description } : {}),
          ...(item.images       !== undefined ? { images       } : {}),
        },
        create: {
          title,
          description,
          price,
          surface,
          rooms:         0,
          dpe:           "D" as Dpe,  // default — external listings rarely expose DPE
          latitude,
          longitude,
          city,
          fairScore:     0,
          cityAvgPerSqm: 0,
          images,
          source,
          externalUrl,
          externalId,
          sellerId:      null,
        },
      });
      upserted++;
    } catch (err) {
      console.error("[ingest] upsert error — externalId:", externalId, err);
      skipped++;
    }
  }

  return Response.json({ success: true, upserted, skipped });
}
