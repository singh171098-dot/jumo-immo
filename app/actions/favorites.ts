"use server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function toggleFavorite(propertyId: string): Promise<{ saved: boolean }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifié");

  const userId = session.user.id;

  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { savedProperties: { where: { id: propertyId }, select: { id: true } } },
  });

  const alreadySaved = (existing?.savedProperties ?? []).length > 0;

  await prisma.user.update({
    where: { id: userId },
    data: {
      savedProperties: alreadySaved
        ? { disconnect: { id: propertyId } }
        : { connect:    { id: propertyId } },
    },
  });

  revalidatePath("/espace-acheteur");
  revalidatePath(`/annonces/${propertyId}`);

  return { saved: !alreadySaved };
}
