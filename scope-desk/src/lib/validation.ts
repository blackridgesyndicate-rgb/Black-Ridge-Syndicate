import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const createClaimSchema = z.object({
  reportType: z.enum(["insurance", "retail"]).default("insurance"),
  homeownerName: z.string().min(1, "Homeowner name is required"),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  addressLine1: z.string().min(1, "Address is required"),
  addressLine2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zip: z.string().min(1, "ZIP is required"),
  insuranceCarrier: z.string().optional(),
  claimNumber: z.string().optional(),
  policyNumber: z.string().optional(),
  dateOfLoss: z.string().optional(),
  causeOfLoss: z.string().optional(),
  adjusterName: z.string().optional(),
  adjusterPhone: z.string().optional(),
  adjusterEmail: z.string().optional(),
  estimator: z.string().optional(),
  inspectionDate: z.string().optional(),
  // Retail-only intake, mirrors src/lib/orderIntake.ts's retailIntakeSchema.
  desiredSystem: z.string().optional(),
  desiredManufacturer: z.string().optional(),
  shingleStyleColor: z.string().optional(),
  warrantySelection: z.string().optional(),
  ventilationPreference: z.string().optional(),
  financingInterest: z.boolean().optional(),
  requestedTimeframe: z.string().optional(),
  knownLeaksConcerns: z.string().optional(),
  existingRoofInfo: z.string().optional(),
});

export const updateClaimSchema = createClaimSchema.partial().extend({
  status: z.string().optional(),
  whiteLabelProfileId: z.string().nullable().optional(),
});

const optionalNumber = z.union([z.number(), z.null()]).optional();

export const pitchAreaSchema = z.object({ pitch: z.string(), areaSqFt: z.number() });

export const measurementSchema = z.object({
  roofAreaSqFt: optionalNumber,
  measuredSquares: optionalNumber,
  facets: optionalNumber,
  predominantPitch: z.string().nullable().optional(),
  pitchAreas: z.array(pitchAreaSchema).optional(),
  eaves: optionalNumber,
  rakes: optionalNumber,
  ridges: optionalNumber,
  hips: optionalNumber,
  valleys: optionalNumber,
  starterLength: optionalNumber,
  dripEdgeLength: optionalNumber,
  flashingLength: optionalNumber,
  stepFlashingLength: optionalNumber,
  apronFlashingLength: optionalNumber,
  leakBarrierLength: optionalNumber,
  twoStoryAreaSqFt: optionalNumber,
  steepSlopeAreaSqFt: optionalNumber,
  wastePercent: optionalNumber,
  membraneWidthFeet: optionalNumber,
  fieldOverrides: z.record(z.string(), z.boolean()).optional(),
});

export const accessorySchema = z.object({
  type: z.string().min(1),
  label: z.string().optional(),
  quantity: z.number().min(0),
  unit: z.string().min(1),
  notes: z.string().optional(),
});

export const findingSchema = z.object({
  category: z.string().min(1),
  location: z.string().optional(),
  damageType: z.string().min(1),
  description: z.string().min(1),
  notes: z.string().optional(),
});

export const photoMetaSchema = z.object({
  caption: z.string().optional(),
  damageClassification: z.string().optional(),
});

export const lineItemSchema = z.object({
  category: z.string().min(1),
  description: z.string().min(1),
  unit: z.string().min(1),
  quantity: z.number(),
  unitPrice: z.number(),
  taxable: z.boolean().optional(),
  taxableMaterialAmount: z.number().nullable().optional(),
  taxRatePercent: z.number().optional(),
  depreciationPercent: z.number().optional(),
  notes: z.string().optional(),
  codeCitation: z.string().optional(),
  included: z.boolean().optional(),
  sortOrder: z.number().optional(),
  isUpgrade: z.boolean().optional(),
  overrideReason: z.string().optional(),
});

export const lineItemUpdateSchema = lineItemSchema.partial();

export const revisionSettingsSchema = z.object({
  label: z.string().optional(),
  status: z.string().optional(),
  wastePercent: z.number().optional(),
  taxRatePercent: z.number().optional(),
  defaultDepreciationPercent: z.number().optional(),
  deductible: z.number().optional(),
  priorPayments: z.number().optional(),
  overheadProfitPercent: z.number().optional(),
});

export const codeReportSchema = z.object({
  authorityHavingJurisdiction: z.string().optional(),
  departmentContact: z.string().optional(),
  adoptedCodeEdition: z.string().optional(),
  localAmendments: z.string().optional(),
  permitRequirements: z.string().optional(),
  permitFees: z.string().optional(),
  iceBarrierRequirement: z.string().optional(),
  dripEdgeRequirement: z.string().optional(),
  valleyLiningRequirement: z.string().optional(),
  underlaymentRequirement: z.string().optional(),
  ventilationRequirement: z.string().optional(),
  chimneyCricketRequirement: z.string().optional(),
  reRoofLayerLimitation: z.string().optional(),
  deckingRequirement: z.string().optional(),
  sourceUrl: z.string().optional(),
  verified: z.boolean().optional(),
  verificationDate: z.string().nullable().optional(),
  notes: z.string().optional(),
});

export const CODE_CITATION_REQUIREMENT_KEYS = [
  "ice_barrier",
  "drip_edge",
  "valley_lining",
  "underlayment",
  "ventilation",
  "layer_limitation",
  "decking",
  "fire_classification",
  "wind",
  "energy_code",
  "permit",
  "sales_tax",
  "permit_fee",
  "other",
] as const;

export const codeCitationSchema = z.object({
  requirementKey: z.enum(CODE_CITATION_REQUIREMENT_KEYS),
  requirementText: z.string().optional(),
  sourceName: z.string().optional(),
  sourceUrl: z.string().optional(),
  codeSection: z.string().optional(),
  verificationStatus: z.enum(["verified", "verification_required"]).optional(),
  verifiedDate: z.string().nullable().optional(),
  reviewedByUserId: z.string().optional(),
});

export const codeCitationUpdateSchema = codeCitationSchema.partial();

export const qcChecklistUpdateSchema = z.object({
  items: z.record(z.string(), z.boolean()),
});

export const qcExceptionSchema = z.object({
  reason: z.string().min(1, "An exception reason is required"),
});

export const whiteLabelProfileSchema = z.object({
  name: z.string().min(1),
  businessName: z.string().min(1),
  addressLine1: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  website: z.string().optional(),
  licenseNumber: z.string().optional(),
  salesRepName: z.string().optional(),
  workmanshipWarrantyText: z.string().optional(),
  brandPrimaryColor: z.string().optional(),
  brandAccentColor: z.string().optional(),
  active: z.boolean().optional(),
});

export const whiteLabelProfileUpdateSchema = whiteLabelProfileSchema.partial();

export const weatherEventSchema = z.object({
  eventDate: z.string().min(1),
  eventType: z.string().min(1),
  hailSizeInches: z.number().nullable().optional(),
  windSpeedMph: z.number().nullable().optional(),
  distanceFromPropertyMiles: z.number().nullable().optional(),
  evidenceLevel: z.string().min(1),
  source: z.string().min(1),
  sourceUrl: z.string().optional(),
  confidenceLevel: z.string().min(1),
  notes: z.string().optional(),
});

export const supplementSchema = z.object({
  label: z.string().min(1),
  revisionId: z.string().optional(),
});

export const carrierItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number(),
  unit: z.string().min(1),
  unitPrice: z.number(),
});

export const supplementMatchSchema = z.object({
  contractorLineItemId: z.string().optional(),
  contractorDescription: z.string().min(1),
  contractorQuantity: z.number(),
  contractorUnit: z.string().min(1),
  contractorUnitPrice: z.number(),
  carrierItemId: z.string().optional(),
  reasonForSupplement: z.string().optional(),
  supportingCodeOrPhoto: z.string().optional(),
});

export const priceListItemSchema = z.object({
  category: z.string().min(1),
  code: z.string().min(1),
  description: z.string().min(1),
  unit: z.string().min(1),
  defaultUnitPrice: z.number(),
  taxable: z.boolean().optional(),
  defaultDepreciationPercent: z.number().optional(),
  codeCitation: z.string().optional(),
  calcRule: z.string().nullable().optional(),
  sortOrder: z.number().optional(),
  active: z.boolean().optional(),
  state: z.string().nullable().optional(),
  insuranceUnitPrice: z.number().nullable().optional(),
  retailUnitPrice: z.number().nullable().optional(),
  internalCostPrice: z.number().nullable().optional(),
  manufacturer: z.string().nullable().optional(),
  productName: z.string().nullable().optional(),
  technicalFunction: z.string().nullable().optional(),
  reasonSelected: z.string().nullable().optional(),
  compatibleSystems: z.string().nullable().optional(),
  applicablePitches: z.string().nullable().optional(),
  climateSuitability: z.string().nullable().optional(),
  codeRelevance: z.string().nullable().optional(),
  installReference: z.string().nullable().optional(),
  warrantyRelevance: z.string().nullable().optional(),
  dataSheetUrl: z.string().nullable().optional(),
  infoVerifiedDate: z.string().nullable().optional(),
  standardOrUpgrade: z.string().optional(),
  retailTierKeys: z.string().nullable().optional(),
});

export const perplexityRouterTestSchema = z.object({
  schema: z.enum(["chat", "messages"]).default("chat"),
  model: z.string().min(1, "Model slug is required, e.g. anthropic/claude-sonnet-5"),
  prompt: z.string().min(1, "Prompt is required"),
  maxTokens: z.number().int().positive().max(4096).optional(),
});
