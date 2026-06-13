import type { MapboxGeocodingFeature } from "./AddressAutocomplete";

export type { DVFEstimationData, DVFComparable, DVFTrendPoint } from "@/lib/dvf";

export interface EstimationQuery {
  label: string;
  city: string;
  postalCode: string;
  lat: number;
  lng: number;
  surface?: number;
  askingPrice?: number;
}

/** Pulls the commune name and postal code out of a Mapbox geocoding feature. */
export function extractLocationInfo(feature: MapboxGeocodingFeature): { city: string; postalCode: string } {
  const context = feature.context ?? [];

  const place = context.find(c => c.id.startsWith("place"))?.text
    ?? (feature.place_type.includes("place") ? feature.text : undefined);

  const postcode = context.find(c => c.id.startsWith("postcode"))?.text
    ?? (feature.place_type.includes("postcode") ? feature.text : undefined);

  return {
    city: place ?? feature.text,
    postalCode: postcode ?? "",
  };
}
