import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { estimationLeadSchema, firstZodError } from "@/lib/validations";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const parsed = estimationLeadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: firstZodError(parsed.error) }, { status: 400 });
    }

    const { firstName, email, city, postalCode, askingPrice, surface } = parsed.data;

    await prisma.estimationLead.create({
      data: {
        firstName,
        email,
        city,
        postalCode: postalCode ?? null,
        askingPrice: askingPrice ?? null,
        surface: surface ?? null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[estimation-leads] create error:", error);
    return NextResponse.json({ error: "Erreur serveur. Veuillez réessayer." }, { status: 500 });
  }
}
