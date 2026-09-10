import type { ExtractedMeasurementFields, PitchArea } from "@/lib/parsers/types";

/**
 * Label-driven text extraction shared by the GAF QuickMeasure / EagleView /
 * Roofr-style PDF parser. Vendor report layouts vary, so each field is
 * matched against several common label spellings; anything not matched is
 * simply left absent, which the caller marks "needs_review" so a human
 * confirms it. This never invents a number — only real regex matches on the
 * document text are used.
 */

// Labels below are hand-authored regex fragments (they intentionally use
// regex syntax like "Eaves?" or "(?:...)"), not literal text — they must be
// used as-is, not escaped, or the patterns they encode never match.
function findNumber(text: string, labels: string[]): number | null {
  for (const label of labels) {
    // The captured number must START with a digit — [\d,]+ alone would also
    // match a bare run of commas (e.g. "hips," in unrelated prose like
    // "needed for ridges, hips, valleys"), which then parses to an empty
    // string and silently becomes 0.
    const re = new RegExp(label + "\\s*[:\\-]?\\s*(\\d[\\d,]*(?:\\.\\d+)?)", "i");
    const match = text.match(re);
    if (match) {
      const num = Number(match[1].replace(/,/g, ""));
      if (Number.isFinite(num)) return num;
    }
  }
  return null;
}

function findText(text: string, labels: string[]): string | null {
  for (const label of labels) {
    const re = new RegExp(label + "\\s*[:\\-]?\\s*([0-9]{1,2}\\s*/\\s*12)", "i");
    const match = text.match(re);
    if (match) return match[1].replace(/\s+/g, "");
  }
  return null;
}

function findPitchAreas(text: string): PitchArea[] {
  // Matches lines like "6/12  849 sq ft" or "Pitch 7/12 - 1,325 SF"
  const results: PitchArea[] = [];
  const re = /(\d{1,2}\s*\/\s*12)[^\d]{0,20}(\d[\d,]*(?:\.\d+)?)\s*(?:sq\s*\.?\s*ft|sf|square\s*feet)/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const pitch = match[1].replace(/\s+/g, "");
    const areaSqFt = Number(match[2].replace(/,/g, ""));
    if (Number.isFinite(areaSqFt)) results.push({ pitch, areaSqFt });
  }
  return results;
}

export function extractMeasurementFieldsFromText(text: string): ExtractedMeasurementFields {
  const fields: ExtractedMeasurementFields = {};

  const roofArea = findNumber(text, [
    "Total Roof Area",
    "Roof Area \\(?Sq\\.?\\s*Ft\\.?\\)?\\s*[:\\-]",
    "Roof Area",
    "Total Area",
    "Total Squares Area",
  ]);
  if (roofArea != null) fields.roofAreaSqFt = { value: roofArea, status: "extracted" };

  const squares = findNumber(text, ["Total Squares", "Measured Squares", "Roofing Squares", "Squares"]);
  if (squares != null) fields.measuredSquares = { value: squares, status: "extracted" };

  const facets = findNumber(text, ["Total Roof Facets", "Number of Facets", "Facets"]);
  if (facets != null) fields.facets = { value: facets, status: "extracted" };

  const pitch = findText(text, ["Predominant Pitch", "Primary Pitch", "Pitch"]);
  if (pitch != null) fields.predominantPitch = { value: pitch, status: "extracted" };

  const pitchAreas = findPitchAreas(text);
  if (pitchAreas.length > 0) fields.pitchAreas = { value: pitchAreas, status: "extracted" };

  const eaves = findNumber(text, ["Eaves?(?:\\s*Length)?", "Total Eave"]);
  if (eaves != null) fields.eaves = { value: eaves, status: "extracted" };

  const rakes = findNumber(text, ["Rakes?(?:\\s*Length)?", "Total Rake"]);
  if (rakes != null) fields.rakes = { value: rakes, status: "extracted" };

  // Some report vendors (e.g. GAF QuickMeasure) report a single combined
  // "Ridges/Hips" total on an overview page, then break ridges and hips out
  // separately later in the same document. The lookbehind keeps the
  // combined mid-string "Hips"/"Ridges" from being mistaken for the
  // standalone field when both appear in the same report.
  const ridges = findNumber(text, ["(?<!/)Ridges?(?:\\s*Length)?", "Total Ridge"]);
  if (ridges != null) fields.ridges = { value: ridges, status: "extracted" };

  const hips = findNumber(text, ["(?<!/)Hips?(?:\\s*Length)?", "Total Hip"]);
  if (hips != null) {
    fields.hips = { value: hips, status: "extracted" };
  } else {
    // Fall back to the combined "Ridges/Hips <n> ft" total when no
    // standalone breakout exists anywhere in the document. The combined
    // value is assigned to ridges (with hips left for manual entry) so the
    // ridge-cap quantity (ridges + hips) still comes out correct even
    // though the individual split isn't known.
    if (ridges == null) {
      const combined = findNumber(text, ["Ridges?\\s*/\\s*Hips?", "Hips?\\s*/\\s*Ridges?"]);
      if (combined != null) fields.ridges = { value: combined, status: "extracted" };
    }
  }

  const valleys = findNumber(text, ["Valleys?(?:\\s*Length)?", "Total Valley"]);
  if (valleys != null) fields.valleys = { value: valleys, status: "extracted" };

  const starter = findNumber(text, ["Starter(?:\\s*Length)?"]);
  if (starter != null) fields.starterLength = { value: starter, status: "extracted" };

  const dripEdge = findNumber(text, ["Drip\\s*Edge(?:\\s*Length)?", "Total Drip Edge"]);
  if (dripEdge != null) fields.dripEdgeLength = { value: dripEdge, status: "extracted" };

  // "Flash" is the bare label GAF QuickMeasure uses for level-edge flashing
  // (excludes valleys); some other vendors spell out "Flashing" instead.
  // Both are tried, "Flash" first since it also matches "Flashing X" when
  // present but not vice versa.
  const flashing = findNumber(text, ["(?<!Step )(?<!Counter)Flash(?:ing)?(?:\\s*Length)?"]);
  if (flashing != null) fields.flashingLength = { value: flashing, status: "extracted" };

  // Likewise "Step" alone is the real-world label for sloped-edge flashing
  // around penetrations; "Step Flashing" is tried second as a fallback for
  // vendors that spell it out. Trying "Step Flashing" first would incorrectly
  // match an unrelated "Step Flashing 10 ft piece" materials-order line that
  // some reports include later in the document.
  const stepFlashing = findNumber(text, ["Step(?:\\s*Flashing)?"]);
  if (stepFlashing != null) fields.stepFlashingLength = { value: stepFlashing, status: "extracted" };

  const apronFlashing = findNumber(text, ["Apron\\s*Flashing"]);
  if (apronFlashing != null) fields.apronFlashingLength = { value: apronFlashing, status: "extracted" };

  const leakBarrier = findNumber(text, ["Leak\\s*Barrier", "Ice\\s*(?:and|&)\\s*Water(?:\\s*Barrier)?"]);
  if (leakBarrier != null) fields.leakBarrierLength = { value: leakBarrier, status: "extracted" };

  const twoStory = findNumber(text, ["Two[\\s\\-]?Story(?:\\s*Area)?", "High\\s*Roof(?:\\s*Area)?"]);
  if (twoStory != null) fields.twoStoryAreaSqFt = { value: twoStory, status: "extracted" };

  const steep = findNumber(text, ["Steep\\s*Slope(?:\\s*Area)?", "Steep\\s*Areas?"]);
  if (steep != null) fields.steepSlopeAreaSqFt = { value: steep, status: "extracted" };

  const waste = findNumber(text, ["Suggested\\s*Waste", "Waste\\s*(?:Factor|Percent(?:age)?)"]);
  if (waste != null) fields.wastePercent = { value: waste, status: "extracted" };

  return fields;
}
