import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, parseJson, handleApiError } from "@/lib/api";
import { codeReportSchema } from "@/lib/validation";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const { id: claimId } = await params;
    const data = await parseJson(req, codeReportSchema);

    const payload = {
      ...data,
      verificationDate:
        data.verificationDate !== undefined
          ? data.verificationDate
            ? new Date(data.verificationDate)
            : null
          : undefined,
    };

    const codeReport = await db.codeReport.upsert({
      where: { claimId },
      create: { claimId, ...payload },
      update: payload,
    });

    return NextResponse.json({ codeReport });
  } catch (err) {
    return handleApiError(err);
  }
}
