import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    // 1. Create a dummy Seller (Using Date.now() so the unique email never crashes if you refresh)
    const seller = await prisma.user.create({
      data: {
        name: "Jean Dupont",
        email: `jean.dupont+${Date.now()}@example.com`,
        hashedPassword: "fakehashedpassword",
        role: "SELLER",
      },
    });

    // 2. Create the first property (A great deal in Paris - Emerald Green tag)
    await prisma.property.create({
      data: {
        title: "Superbe Appartement Haussmannien",
        description: "Magnifique T3 lumineux, moulures et parquet. Sans frais d'agence.",
        price: 450000,
        surface: 50,
        rooms: 3,
        bedrooms: 2,
        dpe: "C",
        latitude: 48.8566,
        longitude: 2.3522, // Paris coordinates
        city: "Paris",
        fairScore: 88, // High score!
        cityAvgPerSqm: 10000,
        sellerId: seller.id,
        status: "AVAILABLE",
      },
    });

    // 3. Create a second property (A standard deal in Lyon - Dark tag)
    await prisma.property.create({
      data: {
        title: "Loft Moderne au coeur des Brotteaux",
        description: "Grand loft rénové, cuisine ouverte, proche du parc.",
        price: 320000,
        surface: 65,
        rooms: 2,
        bedrooms: 1,
        dpe: "B",
        latitude: 45.75,
        longitude: 4.85, // Lyon coordinates
        city: "Lyon",
        fairScore: 65, // Standard score
        cityAvgPerSqm: 5000,
        sellerId: seller.id,
        status: "AVAILABLE",
      },
    });

    return NextResponse.json({ message: "BINGO! Database seeded successfully." });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Uh oh, the seed failed." }, { status: 500 });
  }
}