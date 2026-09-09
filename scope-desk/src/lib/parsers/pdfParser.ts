import type { ParseResult, ReportParser } from "@/lib/parsers/types";
import { extractMeasurementFieldsFromText } from "@/lib/parsers/textExtraction";

// pdf-parse (via pdfjs-dist) normally loads its worker as a separate chunk,
// which Next's bundler can't resolve at runtime in this server context.
// pdfjs-dist's "fake worker" path checks globalThis.pdfjsWorker first, so we
// preload the worker's exports into the main thread once, up front, and skip
// the broken dynamic import entirely.
let workerReady: Promise<void> | null = null;
function ensurePdfWorkerLoaded(): Promise<void> {
  if (!workerReady) {
    workerReady = import("pdfjs-dist/legacy/build/pdf.worker.mjs").then((mod) => {
      (globalThis as any).pdfjsWorker = mod;
    });
  }
  return workerReady;
}

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
      await ensurePdfWorkerLoaded();
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: new Uint8Array(buffer) });
      try {
        const result = await parser.getText();
        text = result.text ?? "";
      } finally {
        await parser.destroy();
      }
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
