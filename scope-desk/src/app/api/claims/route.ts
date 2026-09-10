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
      const claim = await tx.claim.create({
        data: {
          propertyId: property.id,
          reportType: data.reportType,
          insuranceCarrier: data.reportType === "insurance" ? data.insuranceCarrier || null : null,
          claimNumber: data.reportType === "insurance" ? data.claimNumber || null : null,
          policyNumber: data.reportType === "insurance" ? data.policyNumber || null : null,
          dateOfLoss: data.reportType === "insurance" && data.dateOfLoss ? new Date(data.dateOfLoss) : null,
          causeOfLoss: data.reportType === "insurance" ? data.causeOfLoss || null : null,
          adjusterName: data.reportType === "insurance" ? data.adjusterName || null : null,
          adjusterPhone: data.reportType === "insurance" ? data.adjusterPhone || null : null,
          adjusterEmail: data.reportType === "insurance" ? data.adjusterEmail || null : null,
          estimator: data.estimator || user.name,
          inspectionDate: data.inspectionDate ? new Date(data.inspectionDate) : null,
          createdById: user.id,
        },
        include: { property: { include: { customer: true } } },
      });

      if (data.reportType === "retail") {
        await tx.retailIntake.create({
          data: {
            claimId: claim.id,
            desiredSystem: data.desiredSystem || null,
            desiredManufacturer: data.desiredManufacturer || null,
            shingleStyleColor: data.shingleStyleColor || null,
            warrantySelection: data.warrantySelection || null,
            ventilationPreference: data.ventilationPreference || null,
            financingInterest: data.financingInterest ?? false,
            requestedTimeframe: data.requestedTimeframe || null,
            knownLeaksConcerns: data.knownLeaksConcerns || null,
            existingRoofInfo: data.existingRoofInfo || null,
          },
        });
      }

      return claim;
    });

    return NextResponse.json({ claim }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
