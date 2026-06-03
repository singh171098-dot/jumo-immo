import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateOffrePdf } from "@/lib/pdf/offerPdf";

// Next.js 16: params is a Promise
type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;

  /* ── Auth ── */
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  /* ── Fetch offer with full context ── */
  const offer = await prisma.offer.findUnique({
    where: { id },
    select: {
      id:               true,
      amount:           true,
      buyerName:        true,
      buyerEmail:       true,
      financingDetails: true,
      validityDays:     true,
      createdAt:        true,
      property: {
        select: {
          id:       true,
          title:    true,
          city:     true,
          surface:  true,
          rooms:    true,
          bedrooms: true,
          price:    true,
          sellerId: true,
          seller: {
            select: { name: true, email: true },
          },
        },
      },
    },
  });

  if (!offer) {
    return NextResponse.json({ error: "Offre introuvable." }, { status: 404 });
  }

  /* ── Authorization: buyer or seller only ── */
  const isBuyer  = offer.buyerEmail === session.user.email;
  const isSeller = offer.property.sellerId === session.user.id;
  if (!isBuyer && !isSeller) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  /* ── Generate PDF ── */
  let pdfBytes: Uint8Array;
  try {
    pdfBytes = await generateOffrePdf({
      offerId:          offer.id,
      buyerName:        offer.buyerName,
      buyerEmail:       offer.buyerEmail,
      amount:           offer.amount,
      financingDetails: offer.financingDetails,
      validityDays:     offer.validityDays,
      createdAt:        offer.createdAt,
      property: {
        title:    offer.property.title,
        city:     offer.property.city,
        surface:  offer.property.surface,
        rooms:    offer.property.rooms,
        bedrooms: offer.property.bedrooms,
        price:    offer.property.price,
      },
      sellerName:  offer.property.seller?.name  ?? "Vendeur",
      sellerEmail: offer.property.seller?.email ?? "",
    });
  } catch (err) {
    console.error("[PDF Generation Error]", err);
    return NextResponse.json({ error: "Erreur lors de la génération du PDF." }, { status: 500 });
  }

  /* ── Build filename from city slug ── */
  const citySlug = offer.property.city
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  const filename = `offre_achat_${citySlug}.pdf`;

  return new NextResponse(Buffer.from(pdfBytes), {
    status:  200,
    headers: {
      "Content-Type":        "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control":       "no-store",
    },
  });
}
