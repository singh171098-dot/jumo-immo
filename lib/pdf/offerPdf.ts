import { PDFDocument, StandardFonts, rgb, RGB } from "pdf-lib";

/* ── Brand colours ─────────────────────────────────────────────────────────── */
const ROYAL_BLUE: RGB  = rgb(30 / 255,  58 / 255,  138 / 255); // #1E3A8A
const GOLD: RGB        = rgb(212 / 255, 175 / 255,  55 / 255); // #D4AF37
const DARK: RGB        = rgb(30 / 255,  30 / 255,   30 / 255);
const GRAY: RGB        = rgb(100 / 255, 100 / 255, 100 / 255);
const LIGHT_GRAY: RGB  = rgb(245 / 255, 245 / 255, 245 / 255);
const WHITE: RGB       = rgb(1, 1, 1);

/* ── A4 page dimensions (points at 72 dpi) ──────────────────────────────────  */
const W = 595.28;
const H = 841.89;
const ML = 52;   // margin left
const MR = 52;   // margin right
const CW = W - ML - MR;  // content width ≈ 491pt

/* ── Locale price formatter (matches formatPrice in lib/utils/formatters.ts) ─ */
const priceFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});
function fmt(n: number) { return priceFormatter.format(n); }

/* ── Date helper ────────────────────────────────────────────────────────────── */
function fmtDate(d: Date, options: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" }) {
  return d.toLocaleDateString("fr-FR", options);
}

/* ── Data shape accepted by this module ─────────────────────────────────────── */
export interface OfferPdfData {
  offerId:          string;
  buyerName:        string;
  buyerEmail:       string;
  amount:           number;
  financingDetails: string | null;
  validityDays:     number;
  createdAt:        Date;
  property: {
    title:    string;
    city:     string;
    surface:  number;
    rooms:    number;
    price:    number;
    bedrooms: number | null;
  };
  sellerName:  string;
  sellerEmail: string;
}

/* ── Main generator ─────────────────────────────────────────────────────────── */
export async function generateOffrePdf(data: OfferPdfData): Promise<Uint8Array> {
  const doc  = await PDFDocument.create();
  doc.setTitle("Offre d'achat immobilière — Jumo Immo");
  doc.setAuthor("Jumo Immo");
  doc.setCreator("Jumo Immo — plateforme immobilière entre particuliers");

  const page = doc.addPage([W, H]);

  /* ── Embed fonts ── */
  const regular = await doc.embedFont(StandardFonts.TimesRoman);
  const bold    = await doc.embedFont(StandardFonts.TimesRomanBold);
  const helvB   = await doc.embedFont(StandardFonts.HelveticaBold);
  const helv    = await doc.embedFont(StandardFonts.Helvetica);
  const mono    = await doc.embedFont(StandardFonts.Courier);

  /* ── Helpers ── */
  function text(
    t: string,
    x: number, y: number,
    { size = 10, font = regular, color = DARK, maxWidth }: {
      size?: number; font?: typeof regular; color?: RGB; maxWidth?: number;
    } = {},
  ) {
    if (!maxWidth) {
      page.drawText(t, { x, y, size, font, color });
      return size + 2; // line height
    }
    // Wrap text
    const words = t.split(" ");
    let line = "";
    let currentY = y;
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      const testW = font.widthOfTextAtSize(test, size);
      if (testW > maxWidth && line) {
        page.drawText(line, { x, y: currentY, size, font, color });
        currentY -= size + 3;
        line = word;
      } else {
        line = test;
      }
    }
    if (line) page.drawText(line, { x, y: currentY, size, font, color });
    return y - currentY + size + 2;
  }

  function hline(y: number, { opacity = 0.15 }: { opacity?: number } = {}) {
    page.drawLine({ start: { x: ML, y }, end: { x: W - MR, y }, thickness: 0.5, color: ROYAL_BLUE, opacity });
  }

  function rect(x: number, y: number, w: number, h: number, color: RGB, opacity = 1) {
    page.drawRectangle({ x, y, width: w, height: h, color, opacity });
  }

  function label(t: string, x: number, y: number) {
    text(t, x, y, { size: 8, font: helv, color: GRAY });
  }

  /* ════════════════════════════════════════════════════════
     HEADER
  ════════════════════════════════════════════════════════ */
  const HDR_H = 88;
  const HDR_Y = H - HDR_H;

  rect(0, HDR_Y, W, HDR_H, ROYAL_BLUE);

  // Title
  text("OFFRE D'ACHAT IMMOBILIÈRE", ML, H - 32, { size: 18, font: helvB, color: WHITE });
  text("Jumo Immo · Plateforme immobilière entre particuliers", ML, H - 50, { size: 9, font: helv, color: rgb(0.7, 0.8, 1) });

  // Reference — top right
  const ref = `OA-${data.offerId.slice(0, 6).toUpperCase()}`;
  const refW = mono.widthOfTextAtSize(ref, 10);
  text("Référence", W - MR - refW - 4, H - 32, { size: 8, font: helv, color: rgb(0.7, 0.8, 1) });
  text(ref, W - MR - refW, H - 44, { size: 11, font: mono, color: WHITE });

  // Date generated
  text(`Émise le ${fmtDate(data.createdAt)}`, ML, H - 68, { size: 9, font: helv, color: rgb(0.7, 0.8, 1) });

  // Validity
  const expiry = new Date(data.createdAt);
  expiry.setDate(expiry.getDate() + data.validityDays);
  text(`Valable jusqu'au ${fmtDate(expiry)}`, ML, H - 80, { size: 9, font: helv, color: GOLD });

  /* ════════════════════════════════════════════════════════
     BODY — cursor starts below header
  ════════════════════════════════════════════════════════ */
  let cy = HDR_Y - 22;

  /* ── Section 1: PARTIES ── */
  text("1.  PARTIES", ML, cy, { size: 11, font: helvB, color: ROYAL_BLUE });
  cy -= 16;
  hline(cy + 2);
  cy -= 14;

  // Acquéreur
  rect(ML, cy - 2, CW, 50, LIGHT_GRAY, 0.6);
  label("ACQUÉREUR", ML + 10, cy + 40);
  text(data.buyerName, ML + 10, cy + 26, { size: 11, font: bold });
  text(data.buyerEmail, ML + 10, cy + 12, { size: 9, font: regular, color: GRAY });
  cy -= 58;

  // Vendeur
  rect(ML, cy - 2, CW, 38, LIGHT_GRAY, 0.6);
  label("VENDEUR", ML + 10, cy + 28);
  text(data.sellerName, ML + 10, cy + 14, { size: 11, font: bold });
  cy -= 46;

  cy -= 14;
  hline(cy);
  cy -= 18;

  /* ── Section 2: DÉSIGNATION DU BIEN ── */
  text("2.  DÉSIGNATION DU BIEN", ML, cy, { size: 11, font: helvB, color: ROYAL_BLUE });
  cy -= 16;

  rect(ML, cy - 46, CW, 60, LIGHT_GRAY, 0.6);
  label("BIEN IMMOBILIER", ML + 10, cy + 8);
  text(data.property.title, ML + 10, cy - 6, { size: 11, font: bold, maxWidth: CW - 20 });
  text(
    `${data.property.city}  ·  ${data.property.surface} m²  ·  ${data.property.rooms} pièce${data.property.rooms > 1 ? "s" : ""}${data.property.bedrooms ? `  ·  ${data.property.bedrooms} ch.` : ""}`,
    ML + 10,
    cy - 22,
    { size: 9, font: helv, color: GRAY },
  );
  text(`Ref. interne : ${data.offerId}`, ML + 10, cy - 36, { size: 8, font: mono, color: GRAY });
  cy -= 60;

  cy -= 12;
  hline(cy);
  cy -= 18;

  /* ── Section 3: CONDITIONS FINANCIÈRES ── */
  text("3.  CONDITIONS FINANCIÈRES", ML, cy, { size: 11, font: helvB, color: ROYAL_BLUE });
  cy -= 16;

  // Prix proposé
  label("PRIX PROPOSÉ", ML, cy);
  cy -= 14;
  rect(ML, cy - 4, CW, 32, ROYAL_BLUE, 0.06);
  text(fmt(data.amount), ML + 10, cy + 10, { size: 20, font: bold, color: ROYAL_BLUE });

  const diff = data.property.price > 0
    ? Math.round(((data.amount - data.property.price) / data.property.price) * 100)
    : null;
  if (diff !== null) {
    const diffStr = diff > 0 ? `+${diff}%` : `${diff}%`;
    const diffColor = diff > 0 ? rgb(0.9, 0.3, 0.2) : rgb(0.1, 0.6, 0.3);
    text(`Prix affiché : ${fmt(data.property.price)}  (${diffStr})`, W - MR - 180, cy + 14, { size: 9, font: helv, color: diffColor });
  }
  cy -= 40;

  // Financement
  cy -= 4;
  label("CONDITION DE FINANCEMENT", ML, cy);
  cy -= 14;
  const financing = data.financingDetails ?? "Achat comptant (sans condition suspensive de prêt)";
  rect(ML, cy - 8, CW, 28, LIGHT_GRAY, 0.6);
  text(financing, ML + 10, cy + 6, { size: 9, font: regular, maxWidth: CW - 20 });
  cy -= 40;

  cy -= 10;
  hline(cy);
  cy -= 18;

  /* ── Section 4: VALIDITÉ ── */
  text("4.  CLAUSE DE VALIDITÉ", ML, cy, { size: 11, font: helvB, color: ROYAL_BLUE });
  cy -= 16;

  const validityText =
    `La présente offre d'achat est valable pendant ${data.validityDays} jours calendaires ` +
    `à compter de sa date d'émission, soit jusqu'au ${fmtDate(expiry)}. ` +
    `Passé ce délai, sans réponse du vendeur, l'offre est considérée comme caduque ` +
    `et l'acquéreur est libéré de tout engagement (art. 1113 et suivants du Code civil).`;

  rect(ML, cy - 52, CW, 66, LIGHT_GRAY, 0.4);
  text(validityText, ML + 10, cy + 8, { size: 9, font: regular, color: DARK, maxWidth: CW - 20 });
  cy -= 68;

  cy -= 12;
  hline(cy);
  cy -= 18;

  /* ── Section 5: SIGNATURES ── */
  text("5.  SIGNATURES", ML, cy, { size: 11, font: helvB, color: ROYAL_BLUE });
  cy -= 16;

  text("Fait à __________________, le ___________________", ML, cy, { size: 9, font: regular, color: DARK });
  cy -= 28;

  const halfW = CW / 2 - 10;

  // Left column — Acquéreur
  label("SIGNATURE DE L'ACQUÉREUR", ML, cy);
  cy -= 12;
  rect(ML, cy - 54, halfW, 58, LIGHT_GRAY, 0.4);
  text(data.buyerName, ML + 10, cy - 38, { size: 9, font: regular, color: GRAY });
  cy -= 58;

  // Right column — Vendeur (offset back up)
  const sigY = cy + 58;
  label("SIGNATURE DU VENDEUR", ML + halfW + 20, sigY);
  rect(ML + halfW + 20, sigY - 58, halfW, 58, LIGHT_GRAY, 0.4);
  text(data.sellerName, ML + halfW + 30, sigY - 50, { size: 9, font: regular, color: GRAY });

  cy -= 10;

  /* ════════════════════════════════════════════════════════
     FOOTER
  ════════════════════════════════════════════════════════ */
  rect(0, 0, W, 36, ROYAL_BLUE, 0.08);
  hline(36);

  text(
    `Document généré automatiquement par Jumo Immo · ${fmtDate(data.createdAt)} · Réf. ${ref}`,
    ML, 14,
    { size: 8, font: helv, color: GRAY },
  );

  const legalNote = "Ce document a une valeur juridique d'offre d'achat. Conservez-en un exemplaire.";
  const noteW = helv.widthOfTextAtSize(legalNote, 7);
  text(legalNote, W - MR - noteW, 14, { size: 7, font: helv, color: GRAY });

  /* ── Serialize ── */
  return doc.save();
}
