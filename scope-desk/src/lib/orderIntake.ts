import { z } from "zod";

/**
 * The primary product decision. This single field controls intake
 * questions, required uploads, estimate calculations, report language,
 * report sections, disclaimers, customer-facing totals, available
 * upgrades, and the final PDF package throughout the rest of the app.
 */
export const REPORT_TYPES = ["insurance", "retail"] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export const REPORT_TYPE_COPY: Record<ReportType, { label: string; title: string; description: string }> = {
  insurance: {
    label: "Insurance Claim Estimate",
    title: "INSURANCE CLAIM ESTIMATE",
    description:
      "For documented storm or covered-loss projects requiring an itemized contractor estimate, applicable code support, weather history, photographs, replacement-cost calculations, and carrier-scope comparison.",
  },
  retail: {
    label: "Retail Roof Bid",
    title: "RETAIL ROOF BID",
    description:
      "For homeowners, property managers, builders, or contractors requesting a complete roof-replacement proposal without an insurance claim.",
  },
};

/** Flat order price per report type, in cents. Business-configurable — these
 * are placeholder figures for the Black Ridge Scope Desk service fee (the
 * cost of a prepared report/estimate package), not roofing project cost. */
export const ORDER_PRICE_CENTS: Record<ReportType, number> = {
  insurance: 24900,
  retail: 14900,
};

// ---------------------------------------------------------------------------
// Intake question sets — what the customer answers at order time. Uploads
// (measurement report, photos, carrier estimate) are handled by staff after
// the order is placed, since a customer often only has an address at this
// point ("generate a preliminary property package").
// ---------------------------------------------------------------------------

export const insuranceIntakeSchema = z.object({
  insuranceCarrier: z.string().trim().max(200).optional(),
  claimNumber: z.string().trim().max(100).optional(),
  policyNumber: z.string().trim().max(100).optional(),
  dateOfLoss: z.string().trim().max(40).optional(),
  causeOfLoss: z.string().trim().max(500).optional(),
  adjusterName: z.string().trim().max(200).optional(),
  adjusterPhone: z.string().trim().max(40).optional(),
  adjusterEmail: z.string().trim().max(200).optional(),
  knownDamageDescription: z.string().trim().max(2000).optional(),
  hasMeasurementReport: z.boolean().optional(),
  hasCarrierEstimate: z.boolean().optional(),
});
export type InsuranceIntake = z.infer<typeof insuranceIntakeSchema>;

export const retailIntakeSchema = z.object({
  desiredSystem: z.string().trim().max(200).optional(),
  desiredManufacturer: z.string().trim().max(200).optional(),
  shingleStyleColor: z.string().trim().max(200).optional(),
  warrantySelection: z.string().trim().max(200).optional(),
  ventilationPreference: z.string().trim().max(200).optional(),
  financingInterest: z.boolean().optional(),
  requestedTimeframe: z.string().trim().max(200).optional(),
  knownLeaksConcerns: z.string().trim().max(2000).optional(),
  existingRoofInfo: z.string().trim().max(2000).optional(),
  budgetRangeMin: z.number().nonnegative().optional(),
  budgetRangeMax: z.number().nonnegative().optional(),
});
export type RetailIntakeAnswers = z.infer<typeof retailIntakeSchema>;

export const orderContactSchema = z.object({
  reportType: z.enum(REPORT_TYPES),
  contactName: z.string().trim().min(1).max(200),
  contactEmail: z.string().trim().email().max(200),
  contactPhone: z.string().trim().max(40).optional(),
  addressLine1: z.string().trim().min(1).max(200),
  addressLine2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(1).max(100),
  state: z.string().trim().min(2).max(2),
  zip: z.string().trim().min(5).max(10),
  insuranceIntake: insuranceIntakeSchema.optional(),
  retailIntake: retailIntakeSchema.optional(),
});
export type OrderContactInput = z.infer<typeof orderContactSchema>;
