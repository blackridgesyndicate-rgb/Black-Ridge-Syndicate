import "server-only";
import { renderToBuffer } from "@react-pdf/renderer";
import type { ClaimDetail, RevisionDetail, SupplementDetail } from "@/lib/types";
import { InsuranceEstimateDoc } from "@/lib/pdf/documents/InsuranceEstimate";
import { MeasurementSummaryDoc } from "@/lib/pdf/documents/MeasurementSummary";
import { CodeReportDoc } from "@/lib/pdf/documents/CodeReport";
import { WeatherReportDoc } from "@/lib/pdf/documents/WeatherReport";
import { SupplementRequestDoc } from "@/lib/pdf/documents/SupplementRequest";
import { HomeownerProposalDoc } from "@/lib/pdf/documents/HomeownerProposal";
import { MaterialOrderDoc } from "@/lib/pdf/documents/MaterialOrder";
import { InvoiceDoc } from "@/lib/pdf/documents/Invoice";

export const DOCUMENT_TYPES = [
  "insurance_estimate",
  "measurement_summary",
  "code_report",
  "weather_report",
  "supplement_request",
  "homeowner_proposal",
  "material_order",
  "invoice",
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_LABELS: Record<DocumentType, string> = {
  insurance_estimate: "Contractor-Prepared Insurance Estimate",
  measurement_summary: "Measurement Summary",
  code_report: "Code-Enforcement Report",
  weather_report: "Weather-History Report",
  supplement_request: "Supplement Request",
  homeowner_proposal: "Homeowner Proposal",
  material_order: "Material Order",
  invoice: "Invoice",
};

const REQUIRES_REVISION: DocumentType[] = ["insurance_estimate", "homeowner_proposal", "material_order", "invoice"];
const REQUIRES_SUPPLEMENT: DocumentType[] = ["supplement_request"];

export function documentRequirements(type: DocumentType) {
  return {
    needsRevision: REQUIRES_REVISION.includes(type),
    needsSupplement: REQUIRES_SUPPLEMENT.includes(type),
  };
}

export async function renderDocument(
  type: DocumentType,
  claim: ClaimDetail,
  opts: { revision?: RevisionDetail; supplement?: SupplementDetail }
): Promise<Buffer> {
  switch (type) {
    case "insurance_estimate":
      if (!opts.revision) throw new Error("A revision is required to generate an insurance estimate.");
      return renderToBuffer(<InsuranceEstimateDoc claim={claim} revision={opts.revision} />);
    case "measurement_summary":
      return renderToBuffer(<MeasurementSummaryDoc claim={claim} />);
    case "code_report":
      return renderToBuffer(<CodeReportDoc claim={claim} />);
    case "weather_report":
      return renderToBuffer(<WeatherReportDoc claim={claim} />);
    case "supplement_request":
      if (!opts.supplement) throw new Error("A supplement is required to generate a supplement request.");
      return renderToBuffer(<SupplementRequestDoc claim={claim} supplement={opts.supplement} />);
    case "homeowner_proposal":
      if (!opts.revision) throw new Error("A revision is required to generate a homeowner proposal.");
      return renderToBuffer(<HomeownerProposalDoc claim={claim} revision={opts.revision} />);
    case "material_order":
      if (!opts.revision) throw new Error("A revision is required to generate a material order.");
      return renderToBuffer(<MaterialOrderDoc claim={claim} revision={opts.revision} />);
    case "invoice":
      if (!opts.revision) throw new Error("A revision is required to generate an invoice.");
      return renderToBuffer(<InvoiceDoc claim={claim} revision={opts.revision} />);
    default:
      throw new Error(`Unknown document type: ${type}`);
  }
}
