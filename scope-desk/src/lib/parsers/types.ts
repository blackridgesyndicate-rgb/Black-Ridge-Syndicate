export type FieldStatus = "extracted" | "needs_review";

export interface ExtractedField<T> {
  value: T;
  status: FieldStatus;
}

export type PitchArea = { pitch: string; areaSqFt: number };

export interface ExtractedMeasurementFields {
  roofAreaSqFt?: ExtractedField<number>;
  measuredSquares?: ExtractedField<number>;
  facets?: ExtractedField<number>;
  predominantPitch?: ExtractedField<string>;
  pitchAreas?: ExtractedField<PitchArea[]>;
  eaves?: ExtractedField<number>;
  rakes?: ExtractedField<number>;
  ridges?: ExtractedField<number>;
  hips?: ExtractedField<number>;
  valleys?: ExtractedField<number>;
  starterLength?: ExtractedField<number>;
  dripEdgeLength?: ExtractedField<number>;
  flashingLength?: ExtractedField<number>;
  stepFlashingLength?: ExtractedField<number>;
  apronFlashingLength?: ExtractedField<number>;
  leakBarrierLength?: ExtractedField<number>;
  twoStoryAreaSqFt?: ExtractedField<number>;
  steepSlopeAreaSqFt?: ExtractedField<number>;
  wastePercent?: ExtractedField<number>;
}

export interface ParseResult {
  fields: ExtractedMeasurementFields;
  rawText?: string;
  warnings: string[];
}

export interface ReportParser {
  id: string;
  label: string;
  supportsExtension(ext: string): boolean;
  parse(buffer: Buffer, filename: string): Promise<ParseResult>;
}

export const MEASUREMENT_FIELD_KEYS: (keyof ExtractedMeasurementFields)[] = [
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
];
