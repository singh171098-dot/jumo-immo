import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { firstName, lastName, email, postalCode, propertyId, rgpdConsent } = body ?? {};

    if (
      !firstName?.trim() ||
      !lastName?.trim()  ||
      !email?.trim()     ||
      !postalCode?.trim()||
      !propertyId        ||
      rgpdConsent !== true
    ) {
      return NextResponse.json(
        { error: "Tous les champs sont requis et le consentement RGPD est obligatoire." },
        { status: 400 },
      );
    }

    await prisma.lead.create({
      data: {
        firstName:   firstName.trim(),
        lastName:    lastName.trim(),
        email:       email.trim().toLowerCase(),
        postalCode:  postalCode.trim(),
        propertyId,
        rgpdConsent: true,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[leads] create error:", error);
    return NextResponse.json({ error: "Erreur serveur. Veuillez réessayer." }, { status: 500 });
  }
}
