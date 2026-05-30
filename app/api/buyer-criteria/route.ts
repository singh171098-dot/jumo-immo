import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  targetCities:  z.array(z.string()).min(1, "Ajoutez au moins une ville"),
  maxPrice:      z.number().min(50000, "Budget minimum 50 000 €"),
  minSurface:    z.number().min(9,     "Surface minimum 9 m²"),
  minRooms:      z.number().min(1,     "Au moins 1 pièce"),
  propertyTypes: z.array(z.string()),
  wantsBalcony:  z.boolean(),
  wantsParking:  z.boolean(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const criteria = await prisma.buyerCriteria.findUnique({
    where: { userId: session.user.id },
  });

  if (!criteria) return NextResponse.json(null);

  return NextResponse.json({
    targetCities:  criteria.targetCities  as string[],
    maxPrice:      criteria.maxPrice,
    minSurface:    criteria.minSurface,
    minRooms:      criteria.minRooms,
    propertyTypes: criteria.propertyTypes as string[],
    wantsBalcony:  criteria.wantsBalcony,
    wantsParking:  criteria.wantsParking,
  });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const { targetCities, maxPrice, minSurface, minRooms, propertyTypes, wantsBalcony, wantsParking } = parsed.data;

  const criteria = await prisma.buyerCriteria.upsert({
    where:  { userId: session.user.id },
    create: { userId: session.user.id, targetCities, maxPrice, minSurface, minRooms, propertyTypes, wantsBalcony, wantsParking },
    update: {                           targetCities, maxPrice, minSurface, minRooms, propertyTypes, wantsBalcony, wantsParking },
  });

  return NextResponse.json({
    targetCities:  criteria.targetCities  as string[],
    maxPrice:      criteria.maxPrice,
    minSurface:    criteria.minSurface,
    minRooms:      criteria.minRooms,
    propertyTypes: criteria.propertyTypes as string[],
    wantsBalcony:  criteria.wantsBalcony,
    wantsParking:  criteria.wantsParking,
  });
}
