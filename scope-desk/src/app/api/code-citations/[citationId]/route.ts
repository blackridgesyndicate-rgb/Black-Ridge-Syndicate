import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, parseJson, handleApiError } from "@/lib/api";
import { codeCitationUpdateSchema } from "@/lib/validation";

export async function PATCH(req: Request, { params }: { params: Promise<{ citationId: string }> }) {
  try {
    const user = await requireUser();
    const { citationId } = await params;
    const data = await parseJson(req, codeCitationUpdateSchema);

    const citation = await db.codeCitation.update({
      where: { id: citationId },
      data: {
        ...(data.requirementKey !== undefined ? { requirementKey: data.requirementKey } : {}),
        ...(data.requirementText !== undefined ? { requirementText: data.requirementText || null } : {}),
        ...(data.sourceName !== undefined ? { sourceName: data.sourceName || null } : {}),
        ...(data.sourceUrl !== undefined ? { sourceUrl: data.sourceUrl || null } : {}),
        ...(data.codeSection !== undefined ? { codeSection: data.codeSection || null } : {}),
        ...(data.verificationStatus !== undefined
          ? {
              verificationStatus: data.verificationStatus,
              reviewedByUserId: data.verificationStatus === "verified" ? user.id : null,
            }
          : {}),
        ...(data.verifiedDate !== undefined
          ? { verifiedDate: data.verifiedDate ? new Date(data.verifiedDate) : null }
          : {}),
      },
    });

    return NextResponse.json({ citation });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ citationId: string }> }) {
  try {
    await requireUser();
    const { citationId } = await params;
    await db.codeCitation.delete({ where: { id: citationId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
