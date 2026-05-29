import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Dpe } from "@prisma/client";

/* ── Apify item shape (Lexis Solutions SeLoger scraper) ──────────────────── */
interface ApifyItem {
  [key: string]: any;
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
    const externalId  = item.id;
    const externalUrl = item.url ?? "";
    const source      = item.brand ? String(item.brand).toUpperCase() : "SELOGER";
    const title       = item.hardFacts?.title ?? "Annonce externe";
    const description = item.mainDescription?.description ?? title;
    const price       = item.rawData?.price ?? item.tracking?.price ?? 0;
    const surface     = item.rawData?.surface?.main ?? 1;
    const rooms       = item.rawData?.nbroom ?? 0;
    const city        = item.location?.address?.city ?? "France";
    const latitude    = item.location?.lat ?? 48.8566;
    const longitude   = item.location?.lng ?? 2.3522;
    const images      = Array.isArray(item.gallery?.images)
      ? item.gallery.images.map((img: any) => img.url).filter(Boolean)
      : [];

    const VALID_DPE = ["A", "B", "C", "D", "E", "F", "G"];
    const dpe = VALID_DPE.includes(item.energyClass) ? item.energyClass : "D";

    /* Skip if missing required fields */
    if (!item.id || !price) {
      skipped++;
      continue;
    }

    try {
      await prisma.property.upsert({
        where: { externalId },
        update: {
          price,
          ...(item.mainDescription?.description !== undefined ? { description } : {}),
          ...(item.gallery?.images              !== undefined ? { images       } : {}),
        },
        create: {
          title,
          description,
          price,
          surface,
          rooms,
          dpe:           dpe as Dpe,
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
