import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, parseJson, handleApiError, ApiError } from "@/lib/api";
import { updateClaimSchema } from "@/lib/validation";
import { claimDetailInclude } from "@/lib/types";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const { id } = await params;
    const claim = await db.claim.findUnique({
      where: { id },
      include: claimDetailInclude,
    });
    if (!claim) throw new ApiError(404, "Claim not found");
    return NextResponse.json({ claim });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const { id } = await params;
    const data = await parseJson(req, updateClaimSchema);

    const existing = await db.claim.findUnique({ where: { id }, include: { property: true } });
    if (!existing) throw new ApiError(404, "Claim not found");

    if (
      data.homeownerName !== undefined ||
      data.phone !== undefined ||
      data.email !== undefined
    ) {
      await db.customer.update({
        where: { id: existing.property.customerId },
        data: {
          ...(data.homeownerName !== undefined ? { name: data.homeownerName } : {}),
          ...(data.phone !== undefined ? { phone: data.phone || null } : {}),
          ...(data.email !== undefined ? { email: data.email || null } : {}),
        },
      });
    }

    if (
      data.addressLine1 !== undefined ||
      data.addressLine2 !== undefined ||
      data.city !== undefined ||
      data.state !== undefined ||
      data.zip !== undefined
    ) {
      await db.property.update({
        where: { id: existing.propertyId },
        data: {
          ...(data.addressLine1 !== undefined ? { addressLine1: data.addressLine1 } : {}),
          ...(data.addressLine2 !== undefined ? { addressLine2: data.addressLine2 || null } : {}),
          ...(data.city !== undefined ? { city: data.city } : {}),
          ...(data.state !== undefined ? { state: data.state } : {}),
          ...(data.zip !== undefined ? { zip: data.zip } : {}),
        },
      });
    }

    const claim = await db.claim.update({
      where: { id },
      data: {
        ...(data.insuranceCarrier !== undefined ? { insuranceCarrier: data.insuranceCarrier || null } : {}),
        ...(data.claimNumber !== undefined ? { claimNumber: data.claimNumber || null } : {}),
        ...(data.policyNumber !== undefined ? { policyNumber: data.policyNumber || null } : {}),
        ...(data.dateOfLoss !== undefined
          ? { dateOfLoss: data.dateOfLoss ? new Date(data.dateOfLoss) : null }
          : {}),
        ...(data.estimator !== undefined ? { estimator: data.estimator || null } : {}),
        ...(data.inspectionDate !== undefined
          ? { inspectionDate: data.inspectionDate ? new Date(data.inspectionDate) : null }
          : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
      },
      include: { property: { include: { customer: true } } },
    });

    return NextResponse.json({ claim });
  } catch (err) {
    return handleApiError(err);
  }
}
