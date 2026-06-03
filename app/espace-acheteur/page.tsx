import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "../../lib/prisma";
import EspaceAcheteurClient from "./EspaceAcheteurClient";
import type { SavedProperty, SerializedBuyerCriteria, RecommendedProperty, BuyerConversation } from "./EspaceAcheteurClient";

/* ── Title → property type extractor (mirrors HomeClientUI dbToListings) ──── */
function extractType(title: string): string {
  const m = title.match(/^(Appartement|Maison|Studio|Terrain|Villa|Loft|Immeuble)/i);
  return m ? m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase() : "Appartement";
}

/* ── Match score 0–100 ────────────────────────────────────────────────────── */
function computeMatchScore(
  p: { city: string; title: string; hasBalcony: boolean; hasParking: boolean; price: number },
  c: NonNullable<SerializedBuyerCriteria>,
): number {
  const type = extractType(p.title);
  let hits = 0;
  let total = 0;

  // City match (weight 2)
  total += 2;
  const cityNorm  = p.city.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  const cityMatch = c.targetCities.some(tc =>
    cityNorm.includes(tc.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "")) ||
    tc.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").includes(cityNorm),
  );
  if (cityMatch) hits += 2;

  // Property type match (weight 1)
  if (c.propertyTypes.length > 0) {
    total += 1;
    if (c.propertyTypes.some(pt => pt.toLowerCase() === type.toLowerCase())) hits += 1;
  }

  // Balcony preference (weight 1)
  if (c.wantsBalcony) {
    total += 1;
    if (p.hasBalcony) hits += 1;
  }

  // Parking preference (weight 1)
  if (c.wantsParking) {
    total += 1;
    if (p.hasParking) hits += 1;
  }

  // Budget proximity bonus (weight 1) — within 10% under max is ideal
  if (c.maxPrice) {
    total += 1;
    const ratio = p.price / c.maxPrice;
    if (ratio >= 0.85 && ratio <= 1.0) hits += 1;
  }

  return total === 0 ? 100 : Math.round((hits / total) * 100);
}

export default async function EspaceAcheteurPage() {
  const session = await auth();
  if (!session?.user) redirect("/");

  // Single query: user + buyerCriteria + savedProperties
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      buyerCriteria: true,
      savedProperties: {
        orderBy: { createdAt: "desc" },
        select: {
          id:            true,
          title:         true,
          price:         true,
          surface:       true,
          rooms:         true,
          city:          true,
          images:        true,
          fairScore:     true,
          cityAvgPerSqm: true,
          dpe:           true,
          status:        true,
        },
      },
    },
  });

  /* ── Saved properties ── */
  const savedProperties: SavedProperty[] = (user?.savedProperties ?? []).map(p => ({
    ...p,
    dpe:    p.dpe    as string,
    status: p.status as string,
  }));

  /* ── Buyer criteria ── */
  const rawC = user?.buyerCriteria;
  const buyerCriteria: SerializedBuyerCriteria | null = rawC
    ? {
        targetCities:  (rawC.targetCities  as string[]) ?? [],
        maxPrice:      rawC.maxPrice,
        minSurface:    rawC.minSurface,
        minRooms:      rawC.minRooms,
        propertyTypes: (rawC.propertyTypes as string[]) ?? [],
        wantsBalcony:  rawC.wantsBalcony,
        wantsParking:  rawC.wantsParking,
      }
    : null;

  /* ── Recommendations ── */
  let recommendedProperties: RecommendedProperty[] = [];

  if (
    buyerCriteria &&
    buyerCriteria.maxPrice !== null &&
    buyerCriteria.minSurface !== null &&
    buyerCriteria.minRooms !== null
  ) {
    const savedIds = new Set(savedProperties.map(p => p.id));

    // DB-level numeric filters — city/type matching done in memory (no raw SQL needed)
    const candidates = await prisma.property.findMany({
      where: {
        status:    "AVAILABLE",
        externalId: null,           // Jumo listings only (have full data)
        sellerId:  { not: null },   // exclude orphaned demo properties
        price:     { lte: buyerCriteria.maxPrice },
        surface:   { gte: buyerCriteria.minSurface },
        rooms:     { gte: buyerCriteria.minRooms },
        // Exclude properties already saved by this user
        NOT: { savedBy: { some: { id: session.user.id } } },
      },
      select: {
        id:         true,
        title:      true,
        price:      true,
        surface:    true,
        rooms:      true,
        city:       true,
        images:     true,
        fairScore:  true,
        cityAvgPerSqm: true,
        dpe:        true,
        status:     true,
        hasBalcony: true,
        hasParking: true,
      },
      // Fetch up to 200 candidates — sort/filter/rank in memory for precision
      take: 200,
      orderBy: [{ fairScore: "desc" }, { createdAt: "desc" }],
    });

    // In-memory: city normalisation + type filter + ranking
    const cityTargets = buyerCriteria.targetCities.map(c =>
      c.toLowerCase().normalize("NFD").replace(/\p{M}/gu, ""),
    );
    const typeTargets = buyerCriteria.propertyTypes.map(t => t.toLowerCase());

    const scored = candidates
      .filter(p => {
        // City filter: must match at least one target city (substring both ways)
        if (cityTargets.length > 0) {
          const norm = p.city.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
          const match = cityTargets.some(tc => norm.includes(tc) || tc.includes(norm));
          if (!match) return false;
        }
        // Property type filter
        if (typeTargets.length > 0) {
          const type = extractType(p.title).toLowerCase();
          if (!typeTargets.some(tt => tt === type)) return false;
        }
        return true;
      })
      .map(p => ({
        ...p,
        dpe:       p.dpe    as string,
        status:    p.status as string,
        matchScore: computeMatchScore(p, buyerCriteria as NonNullable<SerializedBuyerCriteria>),
      }))
      .sort((a, b) => {
        // 1. FairScore DESC
        if (b.fairScore !== a.fairScore) return b.fairScore - a.fairScore;
        // 2. Price proximity ASC (distance to maxPrice)
        const aDist = Math.abs(buyerCriteria.maxPrice! - a.price);
        const bDist = Math.abs(buyerCriteria.maxPrice! - b.price);
        if (aDist !== bDist) return aDist - bDist;
        // 3. Surface proximity ASC (distance to minSurface, prefer closer)
        return Math.abs(a.surface - buyerCriteria.minSurface!) - Math.abs(b.surface - buyerCriteria.minSurface!);
      })
      .slice(0, 6);

    recommendedProperties = scored.map(({ hasBalcony, hasParking, ...rest }) => rest);
  }

  /* ── Buyer inbox ── */
  const buyerId = session.user.id;

  const inboxMessages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId:   buyerId },
        { receiverId: buyerId },
      ],
      AND: [
        { senderId:   { not: null } },
        { receiverId: { not: null } },
      ],
    },
    select: {
      id:         true,
      body:       true,
      createdAt:  true,
      senderId:   true,
      receiverId: true,
      isRead:     true,
      property: { select: { id: true, title: true, images: true, city: true } },
      sender:   { select: { id: true, name: true } },
      receiver: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const convMap = new Map<string, BuyerConversation>();

  for (const msg of inboxMessages) {
    if (!msg.senderId || !msg.receiverId) continue;

    const isFromMe  = msg.senderId === buyerId;
    const otherId   = isFromMe ? msg.receiverId : msg.senderId;
    const otherUser = isFromMe ? msg.receiver   : msg.sender;
    const key       = `${msg.property.id}__${otherId}`;

    if (!convMap.has(key)) {
      convMap.set(key, {
        propertyId:    msg.property.id,
        propertyTitle: msg.property.title,
        propertyCover: msg.property.images[0] ?? "",
        propertyCity:  msg.property.city,
        otherUserId:   otherId,
        otherUserName: otherUser?.name ?? "Vendeur",
        lastMessage:   msg.body,
        lastActivity:  msg.createdAt.toISOString(),
        unreadCount:   !isFromMe && !msg.isRead ? 1 : 0,
      });
    } else if (!isFromMe && !msg.isRead) {
      convMap.get(key)!.unreadCount++;
    }
  }

  const inbox = Array.from(convMap.values());

  return (
    <EspaceAcheteurClient
      userName={session.user.name ?? "Acheteur"}
      userEmail={session.user.email ?? ""}
      userId={buyerId}
      savedProperties={savedProperties}
      initialCriteria={buyerCriteria}
      recommendedProperties={recommendedProperties}
      inbox={inbox}
    />
  );
}
