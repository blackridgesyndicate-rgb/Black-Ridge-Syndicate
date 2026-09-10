import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, parseJson, handleApiError } from "@/lib/api";
import { whiteLabelProfileSchema } from "@/lib/validation";

export async function GET() {
  try {
    await requireUser();
    const profiles = await db.whiteLabelProfile.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json({ profiles });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  try {
    await requireUser();
    const data = await parseJson(req, whiteLabelProfileSchema);
    const profile = await db.whiteLabelProfile.create({ data });
    return NextResponse.json({ profile }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
