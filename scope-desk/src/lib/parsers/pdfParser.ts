import type { ParseResult, ReportParser } from "@/lib/parsers/types";
import { extractMeasurementFieldsFromText } from "@/lib/parsers/textExtraction";
import { extractPdfText } from "@/lib/parsers/pdfText";

/**
 * Handles GAF QuickMeasure, EagleView, Roofr, and similar vendor PDF roof
 * reports. There is no public spec for these proprietary layouts, so this
 * parser extracts the document's text (via pdf-parse) and pattern-matches
 * common field labels used across these report vendors. Anything it can't
 * confidently match is left out of `fields`, so the review UI marks it
 * "needs_review" instead of guessing.
 */
export const pdfMeasurementParser: ReportParser = {
  id: "gaf_quickmeasure",
  label: "Roof Measurement PDF (GAF QuickMeasure / EagleView / Roofr / generic)",
  supportsExtension(ext) {
    return ext === ".pdf";
  },
  async parse(buffer: Buffer, filename: string): Promise<ParseResult> {
    const warnings: string[] = [];
    let text = "";
    try {
      text = await extractPdfText(buffer);
    } catch (err) {
      warnings.push(
        `Could not extract text from "${filename}": ${(err as Error).message}. All fields require manual entry.`
      );
      return { fields: {}, rawText: "", warnings };
    }

    if (!text.trim()) {
      warnings.push(
        `No text layer found in "${filename}" (likely a scanned image PDF). All measurements require manual entry.`
      );
      return { fields: {}, rawText: text, warnings };
    }

    const fields = extractMeasurementFieldsFromText(text);
    const matchedCount = Object.keys(fields).length;
    if (matchedCount === 0) {
      warnings.push(
        `Report format was not recognized — no known measurement labels were found in "${filename}". Enter all measurements manually below.`
      );
    } else {
      warnings.push(
        `Extracted ${matchedCount} field(s) automatically. Please verify every value against the source report before saving.`
      );
    }

    return { fields, rawText: text, warnings };
  },
};
