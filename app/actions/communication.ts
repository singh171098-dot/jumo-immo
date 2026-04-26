"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "../../lib/prisma";
import { sendEmail } from "../../lib/email";

/* ── Helper: fetch seller email + city for a property ───────────────────── */
async function getSellerContact(
  propertyId: string,
): Promise<{ email: string; city: string; title: string } | null> {
  try {
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: {
        city:   true,
        title:  true,
        seller: { select: { email: true } },
      },
    });
    if (!property?.seller?.email) return null;
    return { email: property.seller.email, city: property.city, title: property.title };
  } catch {
    return null;
  }
}

/* ── Submit an offer ─────────────────────────────────────────────────────── */
export async function submitOffer(data: {
  propertyId:       string;
  buyerName:        string;
  buyerEmail:       string;
  amount:           number;
  financingDetails?: string;
}): Promise<{ success: boolean; offerId?: string; error?: string }> {
  const { propertyId, buyerName, buyerEmail, amount, financingDetails } = data;
  if (!propertyId || !buyerName.trim() || !buyerEmail.trim() || !amount) {
    return { success: false, error: "Champs requis." };
  }
  try {
    const offer = await prisma.offer.create({
      data: {
        propertyId,
        buyerName:        buyerName.trim(),
        buyerEmail:       buyerEmail.trim(),
        amount,
        financingDetails: financingDetails?.trim() ?? null,
        status:           "PENDING",
      },
      select: { id: true },
    });

    const contact = await getSellerContact(propertyId);
    if (contact) {
      await sendEmail({
        to:      contact.email,
        subject: `Nouvelle offre reçue pour votre bien à ${contact.city}`,
        body: [
          `${buyerName} a soumis une offre d'achat de ${amount.toLocaleString("fr-FR")} € pour votre bien.`,
          "",
          financingDetails ? `Détails de financement : ${financingDetails}` : "",
          "",
          "Connectez-vous à votre tableau de bord pour accepter ou refuser cette offre.",
        ].join("\n"),
      });
    }

    revalidatePath("/espace-vendeur");
    return { success: true, offerId: offer.id };
  } catch {
    return { success: false, error: "Erreur lors de la soumission. Réessayez." };
  }
}

/* ── Accept an offer ────────────────────────────────────────────────────── */
export async function acceptOffer(
  offerId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.offer.update({
      where: { id: offerId },
      data:  { status: "ACCEPTED" },
    });
    revalidatePath("/espace-vendeur");
    return { success: true };
  } catch {
    return { success: false, error: "Erreur lors de l'acceptation." };
  }
}

/* ── Refuse an offer ────────────────────────────────────────────────────── */
export async function refuseOffer(
  offerId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.offer.update({
      where: { id: offerId },
      data:  { status: "REJECTED" },
    });
    revalidatePath("/espace-vendeur");
    return { success: true };
  } catch {
    return { success: false, error: "Erreur lors du refus." };
  }
}

/* ── Send a message from buyer to seller ─────────────────────────────────── */
export async function sendMessage(
  propertyId: string,
  senderName: string,
  body: string,
): Promise<{ success: boolean; error?: string }> {
  if (!propertyId || !senderName.trim() || !body.trim()) {
    return { success: false, error: "Champs requis." };
  }
  try {
    await prisma.message.create({
      data: {
        propertyId,
        senderName: senderName.trim(),
        senderRole: "buyer",
        body:       body.trim(),
      },
    });

    const contact = await getSellerContact(propertyId);
    if (contact) {
      await sendEmail({
        to:      contact.email,
        subject: "Nouveau message d'un acheteur",
        body: [
          `${senderName} vous a envoyé un message concernant votre bien à ${contact.city}.`,
          "",
          "Message :",
          body,
        ].join("\n"),
      });
    }

    revalidatePath("/espace-vendeur");
    return { success: true };
  } catch {
    return { success: false, error: "Erreur lors de l'envoi. Réessayez." };
  }
}

/* ── Book a visit slot ───────────────────────────────────────────────────── */
export async function bookVisit(data: {
  propertyId:      string;
  buyerName:       string;
  buyerEmail:      string;
  slot:            string;  // ISO date string
  proofOfFundsUrl?: string;
}): Promise<{ success: boolean; visitId?: string; referenceId?: string; error?: string }> {
  const { propertyId, buyerName, buyerEmail, slot, proofOfFundsUrl } = data;
  if (!propertyId || !buyerName.trim() || !buyerEmail.trim() || !slot) {
    return { success: false, error: "Veuillez remplir tous les champs." };
  }
  try {
    const visit = await prisma.visit.create({
      data: {
        propertyId,
        buyerName:       buyerName.trim(),
        buyerEmail:      buyerEmail.trim(),
        slot:            new Date(slot),
        status:          "PENDING",
        proofOfFundsUrl: proofOfFundsUrl ?? null,
      },
      select: { id: true },
    });

    const contact = await getSellerContact(propertyId);
    if (contact) {
      const slotLabel = new Date(slot).toLocaleDateString("fr-FR", {
        weekday: "long", day: "numeric", month: "long", year: "numeric",
      });
      await sendEmail({
        to:      contact.email,
        subject: "Demande de visite reçue",
        body: [
          `${buyerName} souhaite visiter votre bien à ${contact.city}.`,
          "",
          `Créneau demandé : ${slotLabel}`,
          "",
          proofOfFundsUrl ? "Un justificatif de financement a été joint à la demande." : "",
        ].join("\n"),
      });
    }

    const referenceId = `VISIT-${visit.id.slice(0, 6).toUpperCase()}`;
    revalidatePath("/espace-vendeur");
    return { success: true, visitId: visit.id, referenceId };
  } catch {
    return { success: false, error: "Erreur lors de la réservation. Réessayez." };
  }
}
