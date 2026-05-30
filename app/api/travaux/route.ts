import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { z } from "zod";
import { sendServiceRequest } from "@/lib/services/travauxNotification";

const WORK_TYPES = [
  "Électricité",
  "Carrelage",
  "Peinture",
  "Plomberie",
  "Cuisine",
  "Salle de bain",
  "Isolation",
  "Rénovation complète",
] as const;

const schema = z.object({
  workType:    z.enum(WORK_TYPES),
  description: z.string()
    .min(10, "Description trop courte (minimum 10 caractères)")
    .max(2000, "Description trop longue (maximum 2 000 caractères)"),
  photoUrls:   z.array(z.string().url("URL de photo invalide")).max(10),
  name:        z.string().min(2, "Nom requis"),
  email:       z.string().email("Email invalide"),
  phone:       z.string().optional().default(""),
});

export async function POST(req: NextRequest) {
  try {
    // Auth is optional — guest submissions are supported when contact fields are provided
    const session = await auth();
    void session; // available for future audit logging

    const body   = await req.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 422 },
      );
    }

    const { workType, description, photoUrls, name, email, phone } = parsed.data;

    await sendServiceRequest({
      category:    "travaux",
      workType,
      description,
      photoUrls,
      contact: {
        name:  name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
      },
    });

    // Always return success — notification failures are handled server-side
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/travaux] POST error:", err);
    return NextResponse.json(
      { error: "Erreur serveur. Veuillez réessayer." },
      { status: 500 },
    );
  }
}
