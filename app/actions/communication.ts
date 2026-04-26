"use server";

import { prisma } from "../../lib/prisma";

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
        body: body.trim(),
      },
    });
    return { success: true };
  } catch {
    return { success: false, error: "Erreur lors de l'envoi. Réessayez." };
  }
}

/* ── Book a visit slot ───────────────────────────────────────────────────── */
export async function bookVisit(data: {
  propertyId: string;
  buyerName: string;
  buyerEmail: string;
  slot: string;           // ISO date string
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
        buyerName: buyerName.trim(),
        buyerEmail: buyerEmail.trim(),
        slot: new Date(slot),
        status: "PENDING",
        proofOfFundsUrl,
      },
      select: { id: true },
    });
    const referenceId = `VISIT-${visit.id.slice(0, 6).toUpperCase()}`;
    return { success: true, visitId: visit.id, referenceId };
  } catch {
    return { success: false, error: "Erreur lors de la réservation. Réessayez." };
  }
}
