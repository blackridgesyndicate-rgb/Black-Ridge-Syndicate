import { XMLParser } from "fast-xml-parser";
import type { ExtractedMeasurementFields, ParseResult, ReportParser } from "@/lib/parsers/types";

const TAG_MAP: Record<string, keyof ExtractedMeasurementFields> = {
  roofareasqft: "roofAreaSqFt",
  totalroofarea: "roofAreaSqFt",
  totalarea: "roofAreaSqFt",
  measuredsquares: "measuredSquares",
  squares: "measuredSquares",
  facets: "facets",
  predominantpitch: "predominantPitch",
  eaves: "eaves",
  rakes: "rakes",
  ridges: "ridges",
  hips: "hips",
  valleys: "valleys",
  starterlength: "starterLength",
  dripedgelength: "dripEdgeLength",
  flashinglength: "flashingLength",
  stepflashinglength: "stepFlashingLength",
  apronflashinglength: "apronFlashingLength",
  leakbarrierlength: "leakBarrierLength",
  twostoryareasqft: "twoStoryAreaSqFt",
  steepslopeareasqft: "steepSlopeAreaSqFt",
  wastepercent: "wastePercent",
};

function flatten(obj: unknown, out: Record<string, string> = {}): Record<string, string> {
  if (obj == null) return out;
  if (typeof obj === "object" && !Array.isArray(obj)) {
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      if (v != null && typeof v === "object" && !Array.isArray(v)) {
        flatten(v, out);
      } else if (Array.isArray(v)) {
        // ignore repeated nodes for this generic flattener
      } else {
        out[k.toLowerCase().replace(/[\s_\-]/g, "")] = String(v);
      }
    }
  }
  return out;
}

export const xmlMeasurementParser: ReportParser = {
  id: "xml",
  label: "Measurement XML export",
  supportsExtension(ext) {
    return ext === ".xml";
  },
  async parse(buffer: Buffer, filename: string): Promise<ParseResult> {
    const warnings: string[] = [];
    const text = buffer.toString("utf8");
    let json: unknown;
    try {
      const parser = new XMLParser({ ignoreAttributes: false });
      json = parser.parse(text);
    } catch (err) {
      warnings.push(`Could not parse XML in "${filename}": ${(err as Error).message}`);
      return { fields: {}, rawText: text, warnings };
    }

    const flat = flatten(json);
    const fields: ExtractedMeasurementFields = {};
    for (const [tag, value] of Object.entries(flat)) {
      const mapped = TAG_MAP[tag];
      if (!mapped || value === "") continue;
      if (mapped === "predominantPitch") {
        fields.predominantPitch = { value, status: "extracted" };
      } else {
        const num = Number(value.replace(/,/g, ""));
        if (Number.isFinite(num)) (fields as any)[mapped] = { value: num, status: "extracted" };
      }
    }

    if (Object.keys(fields).length === 0) {
      warnings.push(`No recognized measurement tags found in "${filename}". Enter measurements manually.`);
    } else {
      warnings.push(`Mapped ${Object.keys(fields).length} tag(s). Please verify before saving.`);
    }

    return { fields, rawText: text, warnings };
  },
};
