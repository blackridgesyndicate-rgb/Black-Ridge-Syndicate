import type { ExtractedMeasurementFields } from "@/lib/parsers/types";
import { MEASUREMENT_FIELD_KEYS } from "@/lib/parsers/types";

const ALL_TRACKED_FIELDS = [
  "roofAreaSqFt",
  "measuredSquares",
  "facets",
  "predominantPitch",
  "pitchAreas",
  "eaves",
  "rakes",
  "ridges",
  "hips",
  "valleys",
  "starterLength",
  "dripEdgeLength",
  "flashingLength",
  "stepFlashingLength",
  "apronFlashingLength",
  "leakBarrierLength",
  "twoStoryAreaSqFt",
  "steepSlopeAreaSqFt",
  "wastePercent",
] as const;

/**
 * Converts parser output into a Prisma Measurement create payload, plus the
 * provenance maps that let the review UI show which fields came from the
 * report vs. need manual entry, while always preserving the originally
 * extracted values even after a contractor edits them later.
 */
export function buildMeasurementCreateData(fields: ExtractedMeasurementFields) {
  const data: Record<string, unknown> = {};
  const fieldSource: Record<string, string> = {};
  const originalValues: Record<string, unknown> = {};

  for (const key of ALL_TRACKED_FIELDS) {
    const entry = fields[key as keyof ExtractedMeasurementFields];
    if (entry) {
      fieldSource[key] = entry.status; // "extracted"
      originalValues[key] = entry.value;
      if (key === "pitchAreas") {
        data.pitchAreasJson = JSON.stringify(entry.value);
      } else if (key === "facets") {
        data.facets = Math.round(entry.value as number);
      } else {
        data[key] = entry.value;
      }
    } else {
      fieldSource[key] = "needs_review";
    }
  }

  return {
    data,
    fieldSourceJson: JSON.stringify(fieldSource),
    originalValuesJson: JSON.stringify(originalValues),
  };
}

export { MEASUREMENT_FIELD_KEYS };
