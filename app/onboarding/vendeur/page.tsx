import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import VendeurOnboardingClient from "./VendeurOnboardingClient";

export default async function VendeurOnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const [civilStatus, sellerProfile] = await Promise.all([
    prisma.civilStatus.findUnique({ where: { userId: session.user.id } }),
    prisma.sellerProfile.findUnique({ where: { userId: session.user.id } }),
  ]);

  return (
    <VendeurOnboardingClient
      userId={session.user.id}
      existingCivilStatus={civilStatus}
      existingSellerProfile={sellerProfile}
    />
  );
}
