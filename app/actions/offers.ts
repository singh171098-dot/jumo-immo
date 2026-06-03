"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/* ── Types ─────────────────────────────────────────────────────────────────── */

export interface CreateLegalOfferInput {
  propertyId:       string;
  offerAmount:      number;
  financingDetails: string | null;
  validityDays:     number;
}

export interface CreateLegalOfferResult {
  success:  boolean;
  offerId?: string;
  error?:   string;
}

/* ── createLegalOffer ───────────────────────────────────────────────────────── */

export async function createLegalOffer(
  input: CreateLegalOfferInput,
): Promise<CreateLegalOfferResult> {
  /* ── Auth ── */
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Vous devez être connecté pour soumettre une offre." };
  }

  const buyerId    = session.user.id;
  const buyerName  = session.user.name  ?? "Acheteur";
  const buyerEmail = session.user.email ?? "";

  /* ── Input guard ── */
  if (!input.propertyId)                   return { success: false, error: "Bien non identifié." };
  if (!Number.isFinite(input.offerAmount) || input.offerAmount <= 0)
    return { success: false, error: "Montant de l'offre invalide." };
  if (input.offerAmount > 100_000_000)     return { success: false, error: "Montant de l'offre non plausible." };

  /* ── Property validation ── */
  const property = await prisma.property.findUnique({
    where:  { id: input.propertyId },
    select: { id: true, status: true, sellerId: true, title: true },
  });

  if (!property)                             return { success: false, error: "Ce bien est introuvable." };
  if (property.status !== "AVAILABLE")       return { success: false, error: "Ce bien n'est plus disponible à la vente." };
  if (!property.sellerId)                    return { success: false, error: "Ce bien n'a pas de vendeur enregistré sur la plateforme." };
  if (property.sellerId === buyerId)         return { success: false, error: "Vous ne pouvez pas faire une offre sur votre propre bien." };

  /* ── Create Offer record ── */
  const offer = await prisma.offer.create({
    data: {
      propertyId:       input.propertyId,
      amount:           Math.round(input.offerAmount),
      buyerName,
      buyerEmail,
      financingDetails: input.financingDetails ?? null,
      validityDays:     input.validityDays,
      status:           "PENDING",
    },
    select: { id: true },
  });

  /* ── Upsert Document record (OFFRE_ACHAT per property) ── */
  // The Document model enforces one record per (propertyId, type).
  // We upsert so that re-submissions update the existing pointer.
  await prisma.document.upsert({
    where: {
      propertyId_type: { propertyId: input.propertyId, type: "OFFRE_ACHAT" },
    },
    update: {
      status:     "PENDING",
      uploadedAt: new Date(),
    },
    create: {
      propertyId: input.propertyId,
      type:       "OFFRE_ACHAT",
      status:     "PENDING",
      uploadedAt: new Date(),
    },
  });

  revalidatePath("/espace-vendeur");

  return { success: true, offerId: offer.id };
}
