import "server-only";
import { db } from "@/lib/db";
import type { InsuranceIntake, RetailIntakeAnswers } from "@/lib/orderIntake";

function parseDateOfLoss(value: string | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Converts a paid Order into a working Claim: finds-or-creates the Customer,
 * creates the Property and Claim, and seeds report-type-specific intake data
 * (insurance fields directly on the Claim, or a RetailIntake row). Called
 * from the Stripe webhook once payment is confirmed — staff then pick the
 * claim up from the dashboard to upload the measurement report and begin
 * work, per the acceptance tests. Idempotent: safe to call once per order.
 */
export async function fulfillPaidOrder(
  orderId: string,
  opts: { stripePaymentIntentId: string | null }
): Promise<string> {
  return db.$transaction(async (tx) => {
    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
    if (order.claimId) return order.claimId; // already fulfilled

    let customer = await tx.customer.findFirst({ where: { email: order.contactEmail } });
    if (!customer) {
      customer = await tx.customer.create({
        data: { name: order.contactName, email: order.contactEmail, phone: order.contactPhone },
      });
    }

    const property = await tx.property.create({
      data: {
        customerId: customer.id,
        addressLine1: order.addressLine1,
        addressLine2: order.addressLine2,
        city: order.city,
        state: order.state,
        zip: order.zip,
      },
    });

    const intake = order.intakeJson ? JSON.parse(order.intakeJson) : {};

    const claim = await tx.claim.create({
      data: {
        propertyId: property.id,
        reportType: order.reportType,
        status: "open",
        ...(order.reportType === "insurance"
          ? (() => {
              const i = intake as InsuranceIntake;
              return {
                insuranceCarrier: i.insuranceCarrier || null,
                claimNumber: i.claimNumber || null,
                policyNumber: i.policyNumber || null,
                dateOfLoss: parseDateOfLoss(i.dateOfLoss),
                causeOfLoss: i.causeOfLoss || null,
                adjusterName: i.adjusterName || null,
                adjusterPhone: i.adjusterPhone || null,
                adjusterEmail: i.adjusterEmail || null,
              };
            })()
          : {}),
      },
    });

    if (order.reportType === "retail") {
      const r = intake as RetailIntakeAnswers;
      await tx.retailIntake.create({
        data: {
          claimId: claim.id,
          desiredSystem: r.desiredSystem || null,
          desiredManufacturer: r.desiredManufacturer || null,
          shingleStyleColor: r.shingleStyleColor || null,
          warrantySelection: r.warrantySelection || null,
          ventilationPreference: r.ventilationPreference || null,
          financingInterest: r.financingInterest ?? false,
          requestedTimeframe: r.requestedTimeframe || null,
          knownLeaksConcerns: r.knownLeaksConcerns || null,
          existingRoofInfo: r.existingRoofInfo || null,
          budgetRangeMin: r.budgetRangeMin ?? null,
          budgetRangeMax: r.budgetRangeMax ?? null,
        },
      });
    } else {
      const i = intake as InsuranceIntake;
      if (i.knownDamageDescription) {
        await tx.inspectionFinding.create({
          data: {
            claimId: claim.id,
            category: "other",
            damageType: "other",
            description: i.knownDamageDescription,
            notes: "Submitted by customer at order intake — verify during field inspection.",
          },
        });
      }
    }

    await tx.order.update({
      where: { id: order.id },
      data: {
        status: "paid",
        paidAt: new Date(),
        stripePaymentIntentId: opts.stripePaymentIntentId,
        claimId: claim.id,
      },
    });

    return claim.id;
  });
}
