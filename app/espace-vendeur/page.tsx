import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "../../lib/prisma";
import EspaceVendeurClient from "./EspaceVendeurClient";
import type { SerializedOffer } from "./EspaceVendeurClient";

export default async function EspaceVendeurPage() {
  const session = await auth();
  if (!session?.user) redirect("/");

  const properties = await prisma.property.findMany({
    where:   { sellerId: session.user.id },
    include: {
      offers:   { orderBy: { createdAt: "desc" } },
      messages: { orderBy: { createdAt: "desc" } },
      visits:   { orderBy: { createdAt: "desc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  /* Flatten + serialize dates so Next.js can pass to client component */
  const offers: SerializedOffer[] = properties.flatMap(p =>
    p.offers.map(o => ({
      id:               o.id,
      amount:           o.amount,
      buyerName:        o.buyerName,
      buyerEmail:       o.buyerEmail,
      financingDetails: o.financingDetails,
      status:           o.status as SerializedOffer["status"],
      propertyId:       o.propertyId,
      propertyTitle:    p.title,
      propertyCity:     p.city,
      createdAt:        o.createdAt.toISOString(),
    })),
  );

  /* Real analytics aggregated from all seller properties */
  const totalViews    = properties.reduce((sum, p) => sum + p.viewCount, 0);
  const visitCount    = properties.reduce((sum, p) => sum + p.visits.length, 0);
  const messageCount  = properties.reduce((sum, p) => sum + p.messages.length, 0);

  return (
    <EspaceVendeurClient
      sellerName={session.user.name ?? "Vendeur"}
      sellerEmail={session.user.email ?? ""}
      offers={offers}
      totalViews={totalViews}
      visitCount={visitCount}
      messageCount={messageCount}
    />
  );
}
