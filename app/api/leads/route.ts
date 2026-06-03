import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { leadSchema, firstZodError } from "@/lib/validations";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    /* ── Validate payload ── */
    const parsed = leadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: firstZodError(parsed.error) },
        { status: 400 },
      );
    }

    const { firstName, lastName, email, postalCode, propertyId } = parsed.data;

    /* ── Verify property exists ── */
    const property = await prisma.property.findUnique({
      where:  { id: propertyId },
      select: { id: true },
    });
    if (!property) {
      return NextResponse.json({ error: "Bien introuvable." }, { status: 404 });
    }

    await prisma.lead.create({
      data: { firstName, lastName, email, postalCode, propertyId, rgpdConsent: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[leads] create error:", error);
    return NextResponse.json({ error: "Erreur serveur. Veuillez réessayer." }, { status: 500 });
  }
}
