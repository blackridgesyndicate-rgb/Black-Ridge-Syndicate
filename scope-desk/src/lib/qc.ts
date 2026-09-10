/** Canonical quality-control checklist required before a document can be
 * securely delivered to the customer (see src/app/api/documents/[docId]/
 * deliver/route.ts). Plain constants — safe to import from client UI. */
export const QC_ITEMS: { key: string; label: string }[] = [
  { key: "correctProperty", label: "Correct property" },
  { key: "correctCustomer", label: "Correct customer" },
  { key: "correctReportType", label: "Correct report type" },
  { key: "measurementsVerified", label: "Measurements verified" },
  { key: "pitchVerified", label: "Pitch verified" },
  { key: "wasteReviewed", label: "Waste reviewed" },
  { key: "accessoriesReviewed", label: "Accessories reviewed" },
  { key: "jurisdictionVerified", label: "State and municipality verified" },
  { key: "codeCitationsVerified", label: "Code citations verified" },
  { key: "salesTaxVerified", label: "Sales tax verified" },
  { key: "weatherSourcesVerified", label: "Weather sources verified" },
  { key: "productCompatibilityVerified", label: "Product compatibility verified" },
  { key: "estimateTotalsRecalculated", label: "Estimate totals recalculated" },
  { key: "imagesLabeled", label: "Images correctly labeled" },
  { key: "fieldVerificationDisclosed", label: "Field-verification items disclosed" },
  { key: "disclaimerIncluded", label: "Disclaimer included" },
  { key: "pdfVisuallyReviewed", label: "PDF visually reviewed" },
  { key: "finalRevisionApproved", label: "Final revision approved" },
];

export const QC_ITEM_KEYS = QC_ITEMS.map((i) => i.key);

export function computeQcStatus(itemsJson: string): "incomplete" | "complete" {
  try {
    const items = JSON.parse(itemsJson) as Record<string, boolean>;
    return QC_ITEM_KEYS.every((key) => items[key] === true) ? "complete" : "incomplete";
  } catch {
    return "incomplete";
  }
}

/** Whether a claim's current QC status allows delivering a document to the customer. */
export function qcAllowsDelivery(status: string | undefined): boolean {
  return status === "complete" || status === "exception_approved";
}
