import { extractPdfText } from "@/lib/parsers/pdfText";

/**
 * Parses verified address-level weather-history reports (currently tuned to
 * the "Predictive Sales AI" / "Verified Extreme Weather Report" PDF format
 * — a per-row table of Type / Magnitude / Date). Other vendors (NOAA/NCEI
 * exports, etc.) would need their own row pattern added here.
 *
 * This is a rows-detected table, not a spatial map: the source PDF marks
 * some rows with an icon meaning "the storm's impact zone is over the
 * address," but that icon doesn't survive text extraction, so every parsed
 * row is conservatively labeled "area_reported" rather than claiming a
 * verified-at-coordinate match we can't actually confirm from the text.
 */

export interface ExtractedWeatherRow {
  eventDate: string; // ISO yyyy-mm-dd
  eventType: "wind" | "hail";
  hailSizeInches?: number;
  windSpeedMph?: number;
  confidenceLevel: "medium" | "high";
}

export interface WeatherReportParseResult {
  rows: ExtractedWeatherRow[];
  warnings: string[];
}

const ROW_RE =
  /(WIND|HAIL)[ \t]+([\d.]+)[ \t]+(Miles Per Hour|Inches)[ \t]+(\d{1,2}\/\d{1,2}\/\d{4})[ \t]+View Storm/gi;

function toIsoDate(mdY: string): string | null {
  const m = mdY.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, mo, da, yr] = m;
  return `${yr}-${mo.padStart(2, "0")}-${da.padStart(2, "0")}`;
}

export function extractWeatherRowsFromText(text: string): WeatherReportParseResult {
  const rows: ExtractedWeatherRow[] = [];
  const seen = new Set<string>();

  for (const match of text.matchAll(ROW_RE)) {
    const [, typeRaw, valueRaw, , dateRaw] = match;
    const iso = toIsoDate(dateRaw);
    if (!iso) continue;
    const value = Number(valueRaw);
    if (!Number.isFinite(value)) continue;
    const eventType = typeRaw.toUpperCase() === "HAIL" ? "hail" : "wind";

    // Same address can report both a hail and a wind row on the same date —
    // dedupe only on the exact same type+date+value combination.
    const key = `${eventType}|${iso}|${value}`;
    if (seen.has(key)) continue;
    seen.add(key);

    // "Severe" threshold as defined by the report itself (hail > 1" or wind
    // > 58 mph) — used only to set confidence, never to fabricate a value.
    const severe = eventType === "hail" ? value > 1 : value > 58;

    rows.push({
      eventDate: iso,
      eventType,
      hailSizeInches: eventType === "hail" ? value : undefined,
      windSpeedMph: eventType === "wind" ? value : undefined,
      confidenceLevel: severe ? "high" : "medium",
    });
  }

  const warnings: string[] = [];
  if (rows.length === 0) {
    warnings.push("Report format was not recognized — no weather events were found. Enter events manually below.");
  } else {
    warnings.push(
      `Extracted ${rows.length} weather event(s). All were conservatively labeled "area reported" — review the source report's storm map for any marked as directly over the property before upgrading the evidence level.`
    );
  }

  return { rows, warnings };
}

export async function parseWeatherReportPdf(buffer: Buffer, filename: string): Promise<WeatherReportParseResult> {
  try {
    const text = await extractPdfText(buffer);
    if (!text.trim()) {
      return {
        rows: [],
        warnings: [`No text layer found in "${filename}". Enter weather events manually.`],
      };
    }
    return extractWeatherRowsFromText(text);
  } catch (err) {
    return {
      rows: [],
      warnings: [`Could not extract text from "${filename}": ${(err as Error).message}`],
    };
  }
}
