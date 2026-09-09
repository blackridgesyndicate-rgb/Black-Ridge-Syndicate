import path from "path";
import type { ParseResult, ReportParser } from "@/lib/parsers/types";
import { pdfMeasurementParser } from "@/lib/parsers/pdfParser";
import { csvMeasurementParser } from "@/lib/parsers/csvParser";
import { xmlMeasurementParser } from "@/lib/parsers/xmlParser";

export * from "@/lib/parsers/types";

const PARSERS: ReportParser[] = [pdfMeasurementParser, csvMeasurementParser, xmlMeasurementParser];

export function selectParser(filename: string): ReportParser | null {
  const ext = path.extname(filename).toLowerCase();
  return PARSERS.find((p) => p.supportsExtension(ext)) ?? null;
}

export async function runParser(filename: string, buffer: Buffer): Promise<{ parserType: string; result: ParseResult }> {
  const parser = selectParser(filename);
  if (!parser) {
    return {
      parserType: "manual",
      result: {
        fields: {},
        rawText: "",
        warnings: [`Unsupported file type for "${filename}". Enter all measurements manually.`],
      },
    };
  }
  const result = await parser.parse(buffer, filename);
  return { parserType: parser.id, result };
}
