import { notFound } from "next/navigation";
import { prisma } from "../../../lib/prisma";
import PropertyDetailClient from "../../../components/PropertyDetailClient";

// Next.js 16: params is a Promise
type PageProps = { params: Promise<{ id: string }> };

export default async function AnnoncePage({ params }: PageProps) {
  const { id } = await params;

  console.log("Fetching property ID:", id);

  const property = await prisma.property.findUnique({
    where: { id },
    include: { seller: { select: { name: true } } },
  });

  if (!property) notFound();

  // Format the price-drop date server-side so the prop is a plain string
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
      sellerName={property.seller.name}
      images={property.images}
      heatingType={property.heatingType}
      insulationLevel={property.insulationLevel}
    />
  );
}
