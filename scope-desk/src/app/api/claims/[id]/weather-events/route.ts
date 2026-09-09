import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, parseJson, handleApiError } from "@/lib/api";
import { weatherEventSchema } from "@/lib/validation";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const { id: claimId } = await params;
    const data = await parseJson(req, weatherEventSchema);
    const event = await db.weatherEvent.create({
      data: {
        claimId,
        eventDate: new Date(data.eventDate),
        eventType: data.eventType,
        hailSizeInches: data.hailSizeInches ?? null,
        windSpeedMph: data.windSpeedMph ?? null,
        distanceFromPropertyMiles: data.distanceFromPropertyMiles ?? null,
        evidenceLevel: data.evidenceLevel,
        source: data.source,
        sourceUrl: data.sourceUrl || null,
        confidenceLevel: data.confidenceLevel,
        notes: data.notes || null,
      },
    });
    return NextResponse.json({ event }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
