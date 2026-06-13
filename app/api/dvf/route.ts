import { NextRequest, NextResponse } from "next/server";
import { getDVFEstimationData } from "@/lib/dvf";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Accept either postalCode OR location (raw string) for backwards compatibility
    const postalCode = searchParams.get("postalCode");
    const location = searchParams.get("location");
    const city = searchParams.get("city");

    const locationInput = postalCode ?? location ?? city;

    if (!locationInput || locationInput.trim().length < 2) {
      return NextResponse.json(
        { error: "A location, postalCode, or city parameter is required" },
        { status: 400 },
      );
    }

    const data = await getDVFEstimationData(locationInput.trim());

    return NextResponse.json(data, {
      headers: {
        // DVF data is refreshed at most a few times a year — safe to cache for a day.
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600",
      },
    });
  } catch (error) {
    console.error("[DVF API] Unhandled error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
