import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import AcquereurOnboardingClient from "./AcquereurOnboardingClient";

export default async function AcquereurOnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const [civilStatus, buyerProfile] = await Promise.all([
    prisma.civilStatus.findUnique({ where: { userId: session.user.id } }),
    prisma.buyerProfile.findUnique({ where: { userId: session.user.id } }),
  ]);

  return (
    <AcquereurOnboardingClient
      userId={session.user.id}
      existingCivilStatus={civilStatus}
      existingBuyerProfile={buyerProfile}
    />
  );
}
