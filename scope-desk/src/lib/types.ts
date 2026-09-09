import type { Prisma } from "@prisma/client";

export const claimDetailInclude = {
  property: { include: { customer: true } },
  files: true,
  measurementReports: true,
  measurement: true,
  accessories: true,
  findings: true,
  photos: { include: { file: true } },
  revisions: { include: { lineItems: true } },
  codeReport: true,
  weatherEvents: true,
  supplements: { include: { carrierItems: true, matches: true } },
  generatedDocuments: true,
} satisfies Prisma.ClaimInclude;

export type ClaimDetail = Prisma.ClaimGetPayload<{ include: typeof claimDetailInclude }>;
export type MeasurementDetail = NonNullable<ClaimDetail["measurement"]>;
export type RevisionDetail = ClaimDetail["revisions"][number];
export type LineItemDetail = RevisionDetail["lineItems"][number];
export type AccessoryDetail = ClaimDetail["accessories"][number];
export type FindingDetail = ClaimDetail["findings"][number];
export type PhotoDetail = ClaimDetail["photos"][number];
export type WeatherEventDetail = ClaimDetail["weatherEvents"][number];
export type SupplementDetail = ClaimDetail["supplements"][number];
export type CodeReportDetail = NonNullable<ClaimDetail["codeReport"]>;
