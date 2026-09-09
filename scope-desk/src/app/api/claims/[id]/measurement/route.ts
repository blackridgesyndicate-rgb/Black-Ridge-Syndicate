import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, parseJson, handleApiError } from "@/lib/api";
import { measurementSchema } from "@/lib/validation";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const { id: claimId } = await params;
    const body = await parseJson(req, measurementSchema);

    const existing = await db.measurement.findUnique({ where: { claimId } });
    const prevSource: Record<string, string> = existing?.fieldSourceJson
      ? JSON.parse(existing.fieldSourceJson)
      : {};

    const { pitchAreas, fieldOverrides, ...scalarFields } = body;
    const data: Record<string, unknown> = { ...scalarFields };
    if (pitchAreas) data.pitchAreasJson = JSON.stringify(pitchAreas);

    const nextSource = { ...prevSource };
    for (const key of Object.keys(scalarFields)) {
      nextSource[key] = "manual";
    }
    if (pitchAreas) nextSource.pitchAreas = "manual";
    if (fieldOverrides) {
      for (const [key, isManual] of Object.entries(fieldOverrides)) {
        if (isManual) nextSource[key] = "manual";
      }
    }
    data.fieldSourceJson = JSON.stringify(nextSource);

    const measurement = existing
      ? await db.measurement.update({ where: { claimId }, data })
      : await db.measurement.create({ data: { claimId, ...data } });

    return NextResponse.json({ measurement });
  } catch (err) {
    return handleApiError(err);
  }
}
