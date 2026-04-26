import { auth } from "@/auth";
import { prisma } from "../lib/prisma";
import HomeClientUI, { type DbProperty } from "../components/HomeClientUI";

export default async function Home() {
  const [session, raw] = await Promise.all([
    auth(),
    prisma.property.findMany({
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
        isBoosted: true,
        createdAt: true,
        latitude: true,
        longitude: true,
        cityAvgPerSqm: true,
      },
    }),
  ]);

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
    isBoosted: p.isBoosted,
    createdAtMs: p.createdAt.getTime(),
    lat: p.latitude,
    lng: p.longitude,
  }));

  const sessionUser = session?.user
    ? { name: session.user.name ?? "Utilisateur", role: session.user.role }
    : null;

  return <HomeClientUI dbProperties={dbProperties} sessionUser={sessionUser} />;
}
