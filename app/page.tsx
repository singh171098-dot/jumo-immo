import { prisma } from "../lib/prisma";
import HomeClientUI, { type DbProperty } from "../components/HomeClientUI";

export default async function Home() {
  const raw = await prisma.property.findMany({
    where: { status: "AVAILABLE" },
    select: {
      id: true,
      title: true,
      price: true,
      originalPrice: true,
      surface: true,
      rooms: true,
      dpe: true,
      city: true,
      fairScore: true,
      createdAt: true,
      latitude: true,
      longitude: true,
      cityAvgPerSqm: true,
    },
  });

  // Convert Date → ms timestamp so the prop is serializable across the Server/Client boundary
  const dbProperties: DbProperty[] = raw.map(p => ({
    id: p.id,
    title: p.title,
    price: p.price,
    originalPrice: p.originalPrice,
    surface: p.surface,
    rooms: p.rooms,
    dpe: p.dpe as string,
    city: p.city,
    fairScore: p.fairScore,
    cityAvgPerSqm: p.cityAvgPerSqm,
    createdAtMs: p.createdAt.getTime(),
    lat: p.latitude,
    lng: p.longitude,
  }));

  return <HomeClientUI dbProperties={dbProperties} />;
}