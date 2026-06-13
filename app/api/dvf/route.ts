import { NextResponse } from "next/server";
import { getDvfEstimationData } from "@/lib/dvf";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const postalCode = searchParams.get("postalCode")?.trim() ?? "";
  const city = searchParams.get("city")?.trim() || undefined;

  if (!/^\d{5}$/.test(postalCode)) {
    return NextResponse.json({ error: "Code postal invalide." }, { status: 400 });
  }

  try {
    const data = await getDvfEstimationData(postalCode, city);
    return NextResponse.json(data);
  } catch (error) {
    console.error("[dvf] query error:", error);
    return NextResponse.json({ error: "Erreur serveur. Veuillez réessayer." }, { status: 500 });
  }
}
