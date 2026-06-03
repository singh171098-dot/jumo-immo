import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "../../lib/prisma";
import EspaceVendeurClient from "./EspaceVendeurClient";
import type { SerializedOffer, SerializedConversation } from "./EspaceVendeurClient";

export default async function EspaceVendeurPage() {
  const session = await auth();
  if (!session?.user) redirect("/");

  const properties = await prisma.property.findMany({
    where:   { sellerId: session.user.id },
    include: {
      offers:   { orderBy: { createdAt: "desc" } },
      messages: {
        orderBy: { createdAt: "desc" },
        include: {
          sender:   { select: { id: true, name: true } },
          receiver: { select: { id: true, name: true } },
        },
      },
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
  const totalViews   = properties.reduce((sum, p) => sum + p.viewCount, 0);
  const visitCount   = properties.reduce((sum, p) => sum + p.visits.length, 0);
  const messageCount = properties.reduce((sum, p) => sum + p.messages.length, 0);

  /* Build inbox: group messages by (propertyId + buyerId) */
  const sellerId = session.user.id;
  const inboxMap = new Map<string, SerializedConversation>();

  for (const prop of properties) {
    for (const msg of prop.messages) {
      if (!msg.senderId || !msg.receiverId) continue;

      const isFromMe   = msg.senderId === sellerId;
      const otherId    = isFromMe ? msg.receiverId : msg.senderId;
      const otherUser  = isFromMe ? msg.receiver   : msg.sender;
      const key        = `${prop.id}__${otherId}`;

      if (!inboxMap.has(key)) {
        inboxMap.set(key, {
          propertyId:    prop.id,
          propertyTitle: prop.title,
          propertyCover: prop.images[0] ?? "",
          propertyCity:  prop.city,
          otherUserId:   otherId,
          otherUserName: otherUser?.name ?? "Acheteur",
          lastMessage:   msg.body,
          lastActivity:  msg.createdAt.toISOString(),
          unreadCount:   !isFromMe && !msg.isRead ? 1 : 0,
        });
      } else if (!isFromMe && !msg.isRead) {
        inboxMap.get(key)!.unreadCount++;
      }
    }
  }

  const inbox = Array.from(inboxMap.values());

  return (
    <EspaceVendeurClient
      sellerName={session.user.name ?? "Vendeur"}
      sellerEmail={session.user.email ?? ""}
      sellerId={sellerId}
      offers={offers}
      totalViews={totalViews}
      visitCount={visitCount}
      messageCount={messageCount}
      inbox={inbox}
    />
  );
}
