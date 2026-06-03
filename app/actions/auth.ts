"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema, firstZodError } from "@/lib/validations";

export async function registerUser(data: {
  name:     string;
  email:    string;
  password: string;
  role:     "BUYER" | "SELLER";
}): Promise<{ success: boolean; error?: string }> {

  /* ── Server-side schema validation ── */
  const parsed = registerSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: firstZodError(parsed.error) };
  }

  const { name, email, password, role } = parsed.data;

  try {
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return { success: false, error: "Un compte avec cet email existe déjà." };
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.user.create({
      data: { name, email, hashedPassword, role },
    });

    return { success: true };
  } catch {
    return { success: false, error: "Erreur serveur. Veuillez réessayer." };
  }
}
