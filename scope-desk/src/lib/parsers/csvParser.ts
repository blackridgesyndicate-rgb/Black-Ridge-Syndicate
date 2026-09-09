import Papa from "papaparse";
import type { ExtractedMeasurementFields, ParseResult, ReportParser, PitchArea } from "@/lib/parsers/types";

// Accepted CSV column headers -> internal field key (case-insensitive, tolerant of spaces/underscores).
const HEADER_MAP: Record<string, keyof ExtractedMeasurementFields> = {
  roofareasqft: "roofAreaSqFt",
  totalroofarea: "roofAreaSqFt",
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
  starter: "starterLength",
  dripedgelength: "dripEdgeLength",
  dripedge: "dripEdgeLength",
  flashinglength: "flashingLength",
  flashing: "flashingLength",
  stepflashing: "stepFlashingLength",
  apronflashing: "apronFlashingLength",
  leakbarrierlength: "leakBarrierLength",
  leakbarrier: "leakBarrierLength",
  twostoryareasqft: "twoStoryAreaSqFt",
  twostoryarea: "twoStoryAreaSqFt",
  steepslopeareasqft: "steepSlopeAreaSqFt",
  steepslopearea: "steepSlopeAreaSqFt",
  wastepercent: "wastePercent",
  waste: "wastePercent",
};

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[\s_\-()%]/g, "").replace(/sqft|sf/g, "sqft");
}

export const csvMeasurementParser: ReportParser = {
  id: "csv",
  label: "Measurement CSV export",
  supportsExtension(ext) {
    return ext === ".csv";
  },
  async parse(buffer: Buffer, filename: string): Promise<ParseResult> {
    const warnings: string[] = [];
    const text = buffer.toString("utf8");
    const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });

    if (parsed.errors.length > 0) {
      warnings.push(`CSV parse warnings in "${filename}": ${parsed.errors[0].message}`);
    }
    const row = parsed.data[0];
    if (!row) {
      warnings.push(`No data rows found in "${filename}". Enter measurements manually.`);
      return { fields: {}, rawText: text, warnings };
    }

    const fields: ExtractedMeasurementFields = {};
    const pitchAreas: PitchArea[] = [];

    for (const [rawHeader, rawValue] of Object.entries(row)) {
      const key = normalizeHeader(rawHeader);
      if (!rawValue || rawValue.trim() === "") continue;

      // pitch_6_12 / pitch6/12 style columns feed the pitch-area breakdown.
      const pitchMatch = rawHeader.match(/(\d{1,2})\s*[/_]\s*12/);
      if (pitchMatch) {
        const areaSqFt = Number(rawValue.replace(/,/g, ""));
        if (Number.isFinite(areaSqFt)) {
          pitchAreas.push({ pitch: `${pitchMatch[1]}/12`, areaSqFt });
        }
        continue;
      }

      const mapped = HEADER_MAP[key];
      if (!mapped) continue;

      if (mapped === "predominantPitch") {
        fields.predominantPitch = { value: rawValue.trim(), status: "extracted" };
      } else {
        const num = Number(rawValue.replace(/,/g, ""));
        if (Number.isFinite(num)) {
          (fields as any)[mapped] = { value: num, status: "extracted" };
        }
      }
    }

    if (pitchAreas.length > 0) {
      fields.pitchAreas = { value: pitchAreas, status: "extracted" };
    }

    if (Object.keys(fields).length === 0) {
      warnings.push(
        `No recognized measurement columns found in "${filename}". Expected headers like roof_area_sqft, eaves, rakes, ridges, hips, valleys.`
      );
    } else {
      warnings.push(`Mapped ${Object.keys(fields).length} column(s). Please verify before saving.`);
    }

    return { fields, rawText: text, warnings };
  },
};
