import { prisma } from "../../lib/prisma";
import EspaceVendeurClient from "./EspaceVendeurClient";
import type { SerializedOffer } from "./EspaceVendeurClient";

export default async function EspaceVendeurPage() {
  /* Use the first SELLER in the DB (seed creates one) */
  const seller = await prisma.user.findFirst({
    where:  { role: "SELLER" },
    select: { id: true, name: true },
  });

  const properties = seller
    ? await prisma.property.findMany({
        where:   { sellerId: seller.id },
        include: {
          offers:   { orderBy: { createdAt: "desc" } },
          messages: { orderBy: { createdAt: "desc" } },
          visits:   { orderBy: { createdAt: "desc" } },
        },
        orderBy: { createdAt: "desc" },
      })
    : [];

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

  return (
    <EspaceVendeurClient
      sellerName={seller?.name ?? "Jean"}
      offers={offers}
    />
  );
}
