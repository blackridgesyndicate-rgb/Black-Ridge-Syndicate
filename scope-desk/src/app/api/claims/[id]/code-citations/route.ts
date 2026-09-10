import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, parseJson, handleApiError } from "@/lib/api";
import { codeCitationSchema } from "@/lib/validation";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id: claimId } = await params;
    const data = await parseJson(req, codeCitationSchema);

    const citation = await db.codeCitation.create({
      data: {
        claimId,
        requirementKey: data.requirementKey,
        requirementText: data.requirementText || null,
        sourceName: data.sourceName || null,
        sourceUrl: data.sourceUrl || null,
        codeSection: data.codeSection || null,
        verificationStatus: data.verificationStatus ?? "verification_required",
        verifiedDate: data.verifiedDate ? new Date(data.verifiedDate) : null,
        reviewedByUserId: data.reviewedByUserId || (data.verificationStatus === "verified" ? user.id : null),
      },
    });

    return NextResponse.json({ citation }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
