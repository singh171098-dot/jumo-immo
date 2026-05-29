import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { Dpe } from "@prisma/client";

/* ── Apify item shape (Lexis Solutions SeLoger scraper) ──────────────────── */
interface ApifyItem {
  [key: string]: any;
}

/* ── POST /api/webhooks/ingest ───────────────────────────────────────────── */
export async function POST(req: Request) {
  try {

    /* ── Auth ────────────────────────────────────────────────────────────── */
    const secret = process.env.JUMO_SECRET_SCRAPER_KEY ?? "";
    const auth   = req.headers.get("authorization") ?? "";
    if (!secret || auth !== `Bearer ${secret}`) {
      return new Response("Unauthorized", { status: 401 });
    }

    /* ── Parse Apify webhook payload ──────────────────────────────────────── */
    let body: { resource?: { defaultDatasetId?: string } };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    console.log("Webhook Payload Received:", JSON.stringify(body, null, 2));

    const datasetId = body?.resource?.defaultDatasetId;
    if (!datasetId) {
      return NextResponse.json({ error: "Missing resource.defaultDatasetId" }, { status: 400 });
    }

    /* ── Fetch items from Apify dataset ───────────────────────────────────── */
    console.log("Token exists:", !!process.env.APIFY_API_TOKEN);

    if (!process.env.APIFY_API_TOKEN) {
      console.error("Missing APIFY_API_TOKEN");
      return NextResponse.json(
        { success: false, error: "Missing APIFY_API_TOKEN" },
        { status: 500 }
      );
    }

    let items: ApifyItem[];
    try {
      const res = await fetch(
        `https://api.apify.com/v2/datasets/${datasetId}/items?token=${process.env.APIFY_API_TOKEN}`
      );
      if (!res.ok) {
        const errorText = await res.text();
        console.error("APIFY REJECTED FETCH:", errorText);
        return NextResponse.json({ error: "Failed to fetch Apify dataset" }, { status: 502 });
      }
      items = (await res.json()) as ApifyItem[];
    } catch (err) {
      console.error("[ingest] dataset fetch error", err);
      return NextResponse.json({ error: "Failed to reach Apify API" }, { status: 502 });
    }

    /* ── Process items ────────────────────────────────────────────────────── */
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
      const images      = Array.isArray(item.gallery?.images)
        ? item.gallery.images.map((img: any) => img.url).filter(Boolean)
        : [];

      const VALID_DPE = ["A", "B", "C", "D", "E", "F", "G"];
      const dpe = VALID_DPE.includes(item.energyClass) ? item.energyClass : "D";

      /* Skip if missing required fields */
      if (!item.id || !price) {
        console.warn("Skipping invalid item:", item.id);
        skipped++;
        continue;
      }

      /* ── Geocode city via French government API ─────────────────────────── */
      let latitude  = item.location?.lat ?? 48.8566;
      let longitude = item.location?.lng ?? 2.3522;

      try {
        const cityQuery = encodeURIComponent(item.location?.address?.city || "Paris");
        const geoRes    = await fetch(
          `https://api-adresse.data.gouv.fr/search/?q=${cityQuery}&limit=1`
        );
        const geoData = await geoRes.json();
        if (geoData.features?.[0]?.geometry?.coordinates) {
          longitude = geoData.features[0].geometry.coordinates[0];
          latitude  = geoData.features[0].geometry.coordinates[1];
        }
      } catch {
        /* Geocoding failed — keep payload coords or Paris fallback */
      }

      try {
        await prisma.property.upsert({
          where: { externalId },
          update: {
            price,
            latitude,
            longitude,
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
      } catch (error) {
        console.error("Ingestion failed for item:", item.id, error);
        skipped++;
      }
    }

    revalidatePath("/");
    return NextResponse.json({ success: true, upserted, skipped });

  } catch (error: any) {
    console.error("🚨 CRITICAL WEBHOOK ERROR 🚨:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
