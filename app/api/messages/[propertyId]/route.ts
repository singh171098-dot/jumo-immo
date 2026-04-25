import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

// Next.js 16: params is a Promise
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ propertyId: string }> },
) {
  const { propertyId } = await params;
  try {
    const messages = await prisma.message.findMany({
      where: { propertyId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        senderName: true,
        senderRole: true,
        body: true,
        createdAt: true,
      },
    });
    return NextResponse.json(messages);
  } catch {
    // Table may not exist yet (pre-migration) — return empty gracefully
    return NextResponse.json([]);
  }
}
