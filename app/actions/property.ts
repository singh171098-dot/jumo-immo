"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "../../lib/prisma";
import type { Dpe, DocumentType } from "@prisma/client";

/* ── French city lookup: coordinates + DVF reference price ──────────────── */
const CITY_DATA: Record<string, { lat: number; lng: number; avgPerSqm: number }> = {
  "paris":            { lat: 48.8566, lng:  2.3522, avgPerSqm: 9800 },
  "lyon":             { lat: 45.7640, lng:  4.8357, avgPerSqm: 4200 },
  "marseille":        { lat: 43.2965, lng:  5.3698, avgPerSqm: 3100 },
  "toulouse":         { lat: 43.6047, lng:  1.4442, avgPerSqm: 3400 },
  "nice":             { lat: 43.7102, lng:  7.2620, avgPerSqm: 4900 },
  "nantes":           { lat: 47.2184, lng: -1.5534, avgPerSqm: 3600 },
  "bordeaux":         { lat: 44.8378, lng: -0.5792, avgPerSqm: 4100 },
  "montpellier":      { lat: 43.6119, lng:  3.8767, avgPerSqm: 3200 },
  "strasbourg":       { lat: 48.5734, lng:  7.7521, avgPerSqm: 3000 },
  "lille":            { lat: 50.6292, lng:  3.0573, avgPerSqm: 2800 },
  "rennes":           { lat: 48.1173, lng: -1.6778, avgPerSqm: 3500 },
  "grenoble":         { lat: 45.1885, lng:  5.7245, avgPerSqm: 3100 },
  "toulon":           { lat: 43.1242, lng:  5.9280, avgPerSqm: 2900 },
  "aix-en-provence":  { lat: 43.5297, lng:  5.4474, avgPerSqm: 4400 },
  "reims":            { lat: 49.2583, lng:  4.0317, avgPerSqm: 2200 },
  "saint-etienne":    { lat: 45.4397, lng:  4.3872, avgPerSqm: 1600 },
  "le havre":         { lat: 49.4944, lng:  0.1079, avgPerSqm: 1900 },
  "dijon":            { lat: 47.3220, lng:  5.0415, avgPerSqm: 2100 },
  "angers":           { lat: 47.4784, lng: -0.5632, avgPerSqm: 2800 },
  "brest":            { lat: 48.3904, lng: -4.4861, avgPerSqm: 1900 },
  "clermont-ferrand": { lat: 45.7797, lng:  3.0863, avgPerSqm: 1900 },
  "amiens":           { lat: 49.8941, lng:  2.2958, avgPerSqm: 1800 },
  "limoges":          { lat: 45.8315, lng:  1.2578, avgPerSqm: 1400 },
  "nancy":            { lat: 48.6921, lng:  6.1844, avgPerSqm: 1900 },
  "metz":             { lat: 49.1193, lng:  6.1757, avgPerSqm: 1900 },
  "caen":             { lat: 49.1829, lng: -0.3707, avgPerSqm: 2100 },
  "orleans":          { lat: 47.9029, lng:  1.9092, avgPerSqm: 2000 },
  "rouen":            { lat: 49.4432, lng:  1.0993, avgPerSqm: 2300 },
  "mulhouse":         { lat: 47.7508, lng:  7.3359, avgPerSqm: 1500 },
};

const VALID_TYPES = ["Appartement", "Maison", "Studio", "Terrain", "Villa", "Loft"];
const VALID_DPE   = ["A", "B", "C", "D", "E", "F", "G"];

/* ── Result type returned to the client ─────────────────────────────────── */
export interface CreatePropertyResult {
  success: boolean;
  propertyId?: string;
  fairScore?: number;
  cityAvgPerSqm?: number;
  error?: string;
}

/* ── Server Action ───────────────────────────────────────────────────────── */
export async function createProperty(
  formData: FormData,
): Promise<CreatePropertyResult> {

  /* Parse */
  const title          = String(formData.get("title")          ?? "").trim();
  const type           = String(formData.get("type")           ?? "").trim();
  const city           = String(formData.get("city")           ?? "").trim();
  // Pre-verified coordinates from the address autocomplete (api-adresse.data.gouv.fr)
  const formLat        = formData.get("lat")  ? Number(formData.get("lat"))  : null;
  const formLng        = formData.get("lng")  ? Number(formData.get("lng"))  : null;
  const price          = Number(formData.get("price"));
  const surface        = Number(formData.get("surface"));
  const rooms          = Number(formData.get("rooms"));
  const dpe            = String(formData.get("dpe")            ?? "").trim().toUpperCase();
  const insulation      = String(formData.get("insulation")      ?? "").trim();
  const heatingType     = String(formData.get("heatingType")     ?? "").trim();
  const renovationYear  = Number(formData.get("renovationYear")  ?? 0);
  const bedrooms        = formData.get("bedrooms")        ? Number(formData.get("bedrooms"))        : null;
  const bathrooms       = formData.get("bathrooms")        ? Number(formData.get("bathrooms"))       : null;
  const constructionYear = formData.get("constructionYear") ? Number(formData.get("constructionYear")) : null;
  const hasBalcony      = formData.get("hasBalcony")  === "true";
  const hasParking      = formData.get("hasParking")  === "true";
  const hasElevator     = formData.get("hasElevator") === "true";
  const hasCellar       = formData.get("hasCellar")   === "true";

  /* Parse Cloudinary image URLs (JSON array of secure_urls) */
  let images: string[] = [];
  try {
    const raw = formData.get("images");
    if (raw) images = JSON.parse(String(raw)) as string[];
  } catch { images = []; }

  /* Validate */
  if (title.length < 5)              return { success: false, error: "Le titre doit comporter au moins 5 caractères." };
  if (!VALID_TYPES.includes(type))   return { success: false, error: "Type de bien invalide." };
  if (city.length < 2)               return { success: false, error: "Veuillez saisir une ville." };
  if (!price || price < 10_000)      return { success: false, error: "Le prix doit être supérieur à 10 000 €." };
  if (!surface || surface < 5)       return { success: false, error: "La surface doit être supérieure à 5 m²." };
  if (rooms < 0 || rooms > 20)       return { success: false, error: "Nombre de pièces invalide." };
  if (!VALID_DPE.includes(dpe))      return { success: false, error: "Classe DPE invalide." };

  /* Resolve city → coords + DVF average */
  const normalised = city
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")   // strip accents
    .replace(/[^a-z0-9\s-]/g, "")
    .trim();

  const cityEntry = Object.entries(CITY_DATA).find(([key]) => normalised.includes(key));
  const fallback  = cityEntry?.[1] ?? { lat: 48.8566, lng: 2.3522, avgPerSqm: 3000 };
  // Prefer coordinates from the verified address API over the static CITY_DATA map
  const lat       = (formLat !== null && !isNaN(formLat)) ? formLat : fallback.lat;
  const lng       = (formLng !== null && !isNaN(formLng)) ? formLng : fallback.lng;
  const { avgPerSqm } = fallback;

  /* Compute FairScore (60–95) based on price vs DVF market + seller signals */
  const pricePerSqm = Math.round(price / surface);
  const marketDiff  = (pricePerSqm - avgPerSqm) / avgPerSqm;
  let fairScore: number;
  if (marketDiff < -0.05) {
    fairScore = 80 + Math.floor(Math.random() * 16); // 80–95 — excellent deal
  } else if (marketDiff < 0.10) {
    fairScore = 65 + Math.floor(Math.random() * 15); // 65–79 — fair market
  } else {
    fairScore = 60 + Math.floor(Math.random() * 11); // 60–70 — slightly above market
  }

  // Adjust score based on seller improvement data (±7 total)
  const insulationBonus: Record<string, number> = { Excellent: 5, Bon: 3, Moyen: 0, Mauvais: -5 };
  const heatingBonus: Record<string, number>    = { "Pompe à chaleur": 5, Bois: 3, Électrique: 2, Gaz: 0, Fioul: -3, Autre: 0 };
  let bonus = 0;
  if (insulation in insulationBonus)  bonus += insulationBonus[insulation];
  if (heatingType in heatingBonus)    bonus += heatingBonus[heatingType];
  if (renovationYear > 0) {
    const age = new Date().getFullYear() - renovationYear;
    if (age <= 5)  bonus += 3;
    else if (age <= 15) bonus += 1;
    else if (age > 30)  bonus -= 3;
  }
  fairScore = Math.min(95, Math.max(60, fairScore + bonus));

  /* Auto-generate description */
  const description =
    `${type} de ${surface} m² situé${type === "Maison" || type === "Villa" ? "e" : ""} à ${city}. ` +
    (rooms > 0 ? `${rooms} pièce${rooms > 1 ? "s" : ""}. ` : "") +
    `Classement énergétique DPE ${dpe}. ` +
    `Bien proposé entre particuliers, sans frais d'agence via Jumo-Immo.`;

  /* Get or create a demo seller (no auth system yet) */
  let seller = await prisma.user.findFirst({ where: { role: "SELLER" } });
  if (!seller) {
    seller = await prisma.user.create({
      data: {
        name: "Vendeur Demo",
        email: "vendeur-demo@jumo-immo.fr",
        hashedPassword: "demo-hash",
        role: "SELLER",
      },
    });
  }

  /* doc_key → DocumentType enum mapping */
  const DOC_TYPE_MAP: Record<string, DocumentType> = {
    TITRE_PROPRIETE: "TITRE_PROPRIETE",
    DPE_DOC:         "DPE",
    AMIANTE:         "AMIANTE",
    PLOMB:           "PLOMB",
    TERMITES:        "TERMITES",
    MESURAGE_CARREZ: "MESURAGE_CARREZ",
    ASSAINISSEMENT:  "ASSAINISSEMENT",
    ELECTRICITE:     "ELECTRICITE",
    GAZ:             "GAZ",
  };

  /* Persist property + documents in a single transaction */
  try {
    const property = await prisma.$transaction(async tx => {
      const created = await tx.property.create({
        data: {
          title,
          description,
          price:           Math.round(price),
          surface:         Math.round(surface),
          rooms:           Math.round(rooms),
          dpe:             dpe as Dpe,
          city,
          latitude:        lat,
          longitude:       lng,
          fairScore,
          cityAvgPerSqm:   avgPerSqm,
          images:          images || [],
          status:          "AVAILABLE",
          sellerId:        seller.id,
          // optional rich fields — saved only when provided
          ...(bedrooms         != null ? { bedrooms         } : {}),
          ...(bathrooms        != null ? { bathrooms        } : {}),
          ...(constructionYear != null ? { constructionYear } : {}),
          ...(heatingType  ? { heatingType                } : {}),
          ...(insulation   ? { insulationLevel: insulation } : {}),
          hasBalcony,
          hasParking,
          hasElevator,
          hasCellar,
        },
        select: { id: true },
      });

      /* Create Document records for every uploaded file */
      for (const [formKey, dbType] of Object.entries(DOC_TYPE_MAP)) {
        const file = formData.get(`doc_${formKey}`) as File | null;
        if (file && file.size > 0) {
          await tx.document.create({
            data: {
              type:       dbType,
              url:        file.name,   // placeholder — swap for S3 URL in production
              status:     "PENDING",
              propertyId: created.id,
              uploadedAt: new Date(),
            },
          });
        }
      }

      return created;
    });

    revalidatePath("/");

    return { success: true, propertyId: property.id, fairScore, cityAvgPerSqm: avgPerSqm };

  } catch (err) {
    console.error("[createProperty]", err);
    return { success: false, error: "Erreur lors de la publication. Veuillez réessayer." };
  }
}
