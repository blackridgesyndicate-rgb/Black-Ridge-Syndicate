import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, parseJson, handleApiError } from "@/lib/api";
import { weatherEventSchema } from "@/lib/validation";

export async function PATCH(req: Request, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    await requireUser();
    const { eventId } = await params;
    const data = await parseJson(req, weatherEventSchema.partial());
    const event = await db.weatherEvent.update({
      where: { id: eventId },
      data: {
        ...(data.eventDate !== undefined ? { eventDate: new Date(data.eventDate) } : {}),
        ...(data.eventType !== undefined ? { eventType: data.eventType } : {}),
        ...(data.hailSizeInches !== undefined ? { hailSizeInches: data.hailSizeInches } : {}),
        ...(data.windSpeedMph !== undefined ? { windSpeedMph: data.windSpeedMph } : {}),
        ...(data.distanceFromPropertyMiles !== undefined
          ? { distanceFromPropertyMiles: data.distanceFromPropertyMiles }
          : {}),
        ...(data.evidenceLevel !== undefined ? { evidenceLevel: data.evidenceLevel } : {}),
        ...(data.source !== undefined ? { source: data.source } : {}),
        ...(data.sourceUrl !== undefined ? { sourceUrl: data.sourceUrl || null } : {}),
        ...(data.confidenceLevel !== undefined ? { confidenceLevel: data.confidenceLevel } : {}),
        ...(data.notes !== undefined ? { notes: data.notes || null } : {}),
      },
    });
    return NextResponse.json({ event });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    await requireUser();
    const { eventId } = await params;
    await db.weatherEvent.delete({ where: { id: eventId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
