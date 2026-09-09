import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, parseJson, handleApiError } from "@/lib/api";
import { createClaimSchema } from "@/lib/validation";

export async function GET() {
  try {
    await requireUser();
    const claims = await db.claim.findMany({
      include: { property: { include: { customer: true } } },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json({ claims });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const data = await parseJson(req, createClaimSchema);

    const claim = await db.$transaction(async (tx) => {
      const customer = await tx.customer.create({
        data: {
          name: data.homeownerName,
          phone: data.phone || null,
          email: data.email || null,
        },
      });
      const property = await tx.property.create({
        data: {
          customerId: customer.id,
          addressLine1: data.addressLine1,
          addressLine2: data.addressLine2 || null,
          city: data.city,
          state: data.state,
          zip: data.zip,
        },
      });
      return tx.claim.create({
        data: {
          propertyId: property.id,
          insuranceCarrier: data.insuranceCarrier || null,
          claimNumber: data.claimNumber || null,
          policyNumber: data.policyNumber || null,
          dateOfLoss: data.dateOfLoss ? new Date(data.dateOfLoss) : null,
          estimator: data.estimator || user.name,
          inspectionDate: data.inspectionDate ? new Date(data.inspectionDate) : null,
          createdById: user.id,
        },
        include: { property: { include: { customer: true } } },
      });
    });

    return NextResponse.json({ claim }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
