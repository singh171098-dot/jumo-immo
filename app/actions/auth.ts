"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function registerUser(data: {
  name:     string;
  email:    string;
  password: string;
  role:     "BUYER" | "SELLER";
}): Promise<{ success: boolean; error?: string }> {
  const { name, email, password, role } = data;

  if (!name.trim() || !email.trim() || !password || !role) {
    return { success: false, error: "Tous les champs sont requis." };
  }
  if (password.length < 8) {
    return { success: false, error: "Minimum 8 caractères pour le mot de passe." };
  }

  try {
    const exists = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (exists) {
      return { success: false, error: "Un compte avec cet email existe déjà." };
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.user.create({
      data: {
        name:  name.trim(),
        email: email.trim().toLowerCase(),
        hashedPassword,
        role,
      },
    });

    return { success: true };
  } catch {
    return { success: false, error: "Erreur serveur. Veuillez réessayer." };
  }
}
