import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "../../../lib/prisma";
import PropertyDetailClient from "../../../components/PropertyDetailClient";

// Next.js 16: params is a Promise
type PageProps = { params: Promise<{ id: string }> };

export default async function AnnoncePage({ params }: PageProps) {
  const { id } = await params;

  const [property, session] = await Promise.all([
    prisma.property.findUnique({
      where: { id },
      include: { seller: { select: { id: true, name: true } } },
    }),
    auth(),
  ]);

  if (!property) notFound();

  // Non-blocking view increment — fire and forget
  prisma.property.update({
    where: { id },
    data: { viewCount: { increment: 1 } },
  }).catch(() => {});

  // Check if the logged-in user has saved this property
  let isSaved = false;
  if (session?.user?.id) {
    const saved = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { savedProperties: { where: { id }, select: { id: true } } },
    });
    isSaved = (saved?.savedProperties ?? []).length > 0;
  }

  const priceDropDate = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(property.updatedAt);

  const hasOriginalPrice =
    property.originalPrice !== null && property.originalPrice !== property.price;

  return (
    <PropertyDetailClient
      id={property.id}
      title={property.title}
      description={property.description}
      price={property.price}
      originalPrice={property.originalPrice ?? property.price}
      hasOriginalPrice={hasOriginalPrice}
      surface={property.surface}
      rooms={property.rooms}
      bedrooms={property.bedrooms ?? null}
      bathrooms={property.bathrooms ?? null}
      dpe={property.dpe as string}
      city={property.city}
      fairScore={property.fairScore}
      cityAvgPerSqm={property.cityAvgPerSqm}
      priceDropDate={priceDropDate}
      sellerId={property.seller?.id ?? null}
      sellerName={property.seller?.name ?? "Partenaire"}
      sessionUserId={session?.user?.id ?? null}
      sessionUserName={session?.user?.name ?? null}
      images={property.images}
      heatingType={property.heatingType}
      insulationLevel={property.insulationLevel}
      constructionYear={property.constructionYear}
      hasBalcony={property.hasBalcony}
      hasParking={property.hasParking}
      hasElevator={property.hasElevator}
      hasCellar={property.hasCellar}
      source={property.source}
      externalUrl={property.externalUrl}
      externalId={property.externalId}
      isSaved={isSaved}
      isAuthenticated={!!session?.user}
    />
  );
}
