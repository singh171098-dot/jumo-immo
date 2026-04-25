import { PrismaClient, Dpe } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // ── Create demo seller ───────────────────────────────────────────────────
  // hashedPassword is required by the User model
  const seller = await prisma.user.create({
    data: {
      email:          'seller@jumo-immo.fr',
      name:           'Jean Dupont',
      hashedPassword: 'testpassword123',
      role:           'SELLER',
    },
  });

  // ── Seed 3 properties across France ─────────────────────────────────────
  // Required fields that were missing from the broken seed:
  //   - hashedPassword on User
  //   - description    on Property (String, required)
  //   - dpe            on Property (Dpe enum) — NOT dpeScore (field does not exist)
  //   - fairScore      on Property (Int, required)
  //   - cityAvgPerSqm  on Property (Int, required)
  await prisma.property.createMany({
    data: [
      {
        title:         'Appartement haussmannien lumineux — Paris 11e',
        description:   "Appartement de 45 m² situé à Paris. 2 pièces. Classement énergétique DPE C. Bien proposé entre particuliers, sans frais d'agence via Jumo-Immo.",
        price:         320_000,
        surface:       45,
        rooms:         2,
        bedrooms:      1,
        dpe:           Dpe.C,
        city:          'Paris',
        latitude:      48.8566,
        longitude:     2.3522,
        // 320 000 / 45 = 7 111 €/m² vs DVF 9 800 €/m² → −27% → excellente affaire
        fairScore:     88,
        cityAvgPerSqm: 9_800,
        status:        'AVAILABLE',
        sellerId:      seller.id,
      },
      {
        title:         'Maison familiale avec jardin — Lyon Brotteaux',
        description:   "Maison de 120 m² situé à Lyon. 5 pièces. Classement énergétique DPE D. Bien proposé entre particuliers, sans frais d'agence via Jumo-Immo.",
        price:         540_000,
        surface:       120,
        rooms:         5,
        bedrooms:      3,
        dpe:           Dpe.D,
        city:          'Lyon',
        latitude:      45.7640,
        longitude:     4.8357,
        // 540 000 / 120 = 4 500 €/m² vs DVF 4 200 €/m² → +7% → prix du marché
        fairScore:     72,
        cityAvgPerSqm: 4_200,
        status:        'AVAILABLE',
        sellerId:      seller.id,
      },
      {
        title:         'Studio centre historique — Bordeaux',
        description:   "Studio de 28 m² situé à Bordeaux. 1 pièce. Classement énergétique DPE E. Bien proposé entre particuliers, sans frais d'agence via Jumo-Immo.",
        price:         180_000,
        surface:       28,
        rooms:         1,
        dpe:           Dpe.E,
        city:          'Bordeaux',
        latitude:      44.8378,
        longitude:     -0.5792,
        // 180 000 / 28 = 6 428 €/m² vs DVF 4 100 €/m² → +57% → surévalué
        fairScore:     55,
        cityAvgPerSqm: 4_100,
        status:        'AVAILABLE',
        sellerId:      seller.id,
      },
    ],
  });

  console.log('✅ Seed completed: 1 seller + 3 properties inserted');
}

main()
  .catch(e => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
