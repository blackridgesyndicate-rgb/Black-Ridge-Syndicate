import { extractPdfText } from "@/lib/parsers/pdfText";

/**
 * Parses address-specific building-code verification reports (currently
 * tuned to the "OneClick Code" / "Residential Roofing Report" PDF format —
 * other vendors would need their own header list here, following the same
 * pattern). Like the measurement-report parser, this never invents a
 * citation: a field is only populated when the exact report text is found,
 * everything else is left for manual entry/"Verification required".
 */

export interface ExtractedCodeReportFields {
  authorityHavingJurisdiction?: string;
  departmentContact?: string;
  adoptedCodeEdition?: string;
  verificationDate?: string; // ISO yyyy-mm-dd
  sourceUrl?: string;
  iceBarrierRequirement?: string;
  dripEdgeRequirement?: string;
  valleyLiningRequirement?: string;
  underlaymentRequirement?: string;
  chimneyCricketRequirement?: string;
}

export interface CodeReportParseResult {
  fields: ExtractedCodeReportFields;
  warnings: string[];
}

// The report presents these section headers in this fixed order; the text
// between one header and the next is that section's body. Any header not
// found is simply skipped (its field stays unset), rather than guessing.
const CODE_SECTION_HEADERS: { header: string; field: keyof ExtractedCodeReportFields }[] = [
  { header: "R905.1.2 ICE BARRIERS", field: "iceBarrierRequirement" },
  { header: "R905.2.8.5 DRIP EDGE", field: "dripEdgeRequirement" },
  { header: "R905.2.8.2 VALLEYS", field: "valleyLiningRequirement" },
  { header: "R905.1.1 UNDERLAYMENT", field: "underlaymentRequirement" },
  { header: "R1003.20 CHIMNEY CRICKETS", field: "chimneyCricketRequirement" },
];
// A trailing boundary the last section's body stops at.
const TRAILING_BOUNDARY = "BUILDING CODE ENFORCEMENT";

// A citation body that spans a page break in the source PDF picks up that
// page's boilerplate (our own "-- N of M --" page-extraction marker, a
// repeated report title, a repeated property-address line, and a bare page
// number) in the middle of the paragraph. Strip those lines before
// collapsing whitespace so the citation text reads as one continuous
// paragraph.
function stripPageBoilerplate(s: string, propertyAddressLine?: string): string {
  return s
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      if (/^--\s*\d+\s*of\s*\d+\s*--$/i.test(trimmed)) return false;
      if (/^Residential Roofing Report(\s+LITE)?$/i.test(trimmed)) return false;
      if (/^\d{1,3}$/.test(trimmed)) return false;
      if (propertyAddressLine && trimmed.toLowerCase() === propertyAddressLine.trim().toLowerCase()) return false;
      return true;
    })
    .join("\n");
}

function normalizeWhitespace(s: string, propertyAddressLine?: string): string {
  return stripPageBoilerplate(s, propertyAddressLine)
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, " ")
    .trim();
}

function toIsoDate(mdY: string): string | undefined {
  const m = mdY.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!m) return undefined;
  const [, mo, da, yr] = m;
  const year = yr.length === 2 ? `20${yr}` : yr;
  return `${year}-${mo.padStart(2, "0")}-${da.padStart(2, "0")}`;
}

export function extractCodeReportFieldsFromText(
  text: string,
  propertyAddressLine?: string
): CodeReportParseResult {
  const fields: ExtractedCodeReportFields = {};
  const warnings: string[] = [];

  const ahjMatch = text.match(/AUTHORITY HAVING JURISDICTION\s*\n\s*([^\n]+)/i);
  if (ahjMatch) fields.authorityHavingJurisdiction = ahjMatch[1].trim();

  const contactBlockMatch = text.match(/MUNICIPAL CONTACT\s*\n([\s\S]*?)\n\s*SALES TAX/i);
  if (contactBlockMatch) {
    const lines = contactBlockMatch[1]
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length > 0) fields.departmentContact = lines.join(" — ");
    const website = lines.find((l) => /^(www\.|https?:\/\/)/i.test(l));
    if (website) fields.sourceUrl = website.startsWith("http") ? website : `https://${website}`;
  }

  const codeBlockMatch = text.match(/CODE ENFORCED\s*\n([\s\S]*?)\n\s*IECC DETAILS/i);
  if (codeBlockMatch) {
    const lines = codeBlockMatch[1]
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const editions = lines.filter((l) => !/DATA VERIFIED/i.test(l));
    if (editions.length > 0) fields.adoptedCodeEdition = editions.join("; ");
    const verifiedLine = lines.find((l) => /DATA VERIFIED/i.test(l));
    if (verifiedLine) {
      const dateMatch = verifiedLine.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})/);
      if (dateMatch) {
        const iso = toIsoDate(dateMatch[1]);
        if (iso) fields.verificationDate = iso;
      }
    }
  }

  const boundaries = [...CODE_SECTION_HEADERS.map((h) => h.header), TRAILING_BOUNDARY];
  let matchedAnySection = false;
  for (let i = 0; i < CODE_SECTION_HEADERS.length; i++) {
    const { header, field } = CODE_SECTION_HEADERS[i];
    const startIdx = text.indexOf(header);
    if (startIdx === -1) continue;
    const bodyStart = startIdx + header.length;
    // Find the nearest of the remaining known boundaries after this header.
    let bodyEnd = text.length;
    for (const boundary of boundaries) {
      if (boundary === header) continue;
      const idx = text.indexOf(boundary, bodyStart);
      if (idx !== -1 && idx < bodyEnd) bodyEnd = idx;
    }
    const body = normalizeWhitespace(text.slice(bodyStart, bodyEnd), propertyAddressLine);
    if (body) {
      fields[field] = `${header}: ${body}`;
      matchedAnySection = true;
    }
  }

  if (!fields.authorityHavingJurisdiction && !matchedAnySection) {
    warnings.push(
      "Report format was not recognized as a supported code-report layout — no fields were extracted. Enter code-report fields manually below."
    );
  } else {
    const count = Object.keys(fields).length;
    warnings.push(
      `Extracted ${count} field(s) automatically. Please verify each citation against the source report and the AHJ's current adopted code before relying on it.`
    );
  }

  return { fields, warnings };
}

export async function parseCodeReportPdf(
  buffer: Buffer,
  filename: string,
  propertyAddressLine?: string
): Promise<CodeReportParseResult> {
  try {
    const text = await extractPdfText(buffer);
    if (!text.trim()) {
      return {
        fields: {},
        warnings: [`No text layer found in "${filename}". Enter code-report fields manually.`],
      };
    }
    return extractCodeReportFieldsFromText(text, propertyAddressLine);
  } catch (err) {
    return {
      fields: {},
      warnings: [`Could not extract text from "${filename}": ${(err as Error).message}`],
    };
  }
}
