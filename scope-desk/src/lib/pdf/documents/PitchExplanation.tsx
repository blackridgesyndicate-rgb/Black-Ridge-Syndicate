import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { pdfTheme } from "@/lib/pdf/theme";
import { num } from "@/lib/format";
import type { MeasurementDetail } from "@/lib/types";

const styles = StyleSheet.create({
  intro: { fontSize: 8, color: pdfTheme.text, lineHeight: 1.5, marginBottom: 8 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  stat: { width: 150, borderWidth: 1, borderColor: pdfTheme.border, padding: 8 },
  statLabel: { fontSize: 6.3, color: pdfTheme.textDim, textTransform: "uppercase", letterSpacing: 0.5 },
  statValue: { fontSize: 12, fontFamily: "Helvetica-Bold", color: pdfTheme.text, marginTop: 3 },
  considerations: { fontSize: 7.5, color: pdfTheme.text, lineHeight: 1.5, marginTop: 4 },
  considerationLabel: { fontFamily: "Helvetica-Bold" },
});

/**
 * Plain-language explanation of roof pitch plus the derived facts a report
 * reader actually needs — predominant pitch, per-facet breakdown (already
 * shown as a chart elsewhere; here it's summarized), the company's current
 * steep-slope threshold (editable per revision, never a hardcoded rule),
 * and what pitch changes about installation.
 */
export function PitchExplanationSection({
  measurement,
  steepSlopePitchThreshold,
}: {
  measurement: MeasurementDetail | null;
  steepSlopePitchThreshold: string;
}) {
  const pitchAreas: { pitch: string; areaSqFt: number }[] = measurement?.pitchAreasJson
    ? JSON.parse(measurement.pitchAreasJson)
    : [];
  const totalArea = pitchAreas.reduce((s, p) => s + p.areaSqFt, 0);

  return (
    <View>
      <Text style={styles.intro}>
        Roof pitch describes how many inches the roof rises vertically for every 12 inches of horizontal travel.
        Pitch affects material handling, installation speed, fall protection, access requirements, underlayment, and
        overall replacement cost.
      </Text>

      <View style={styles.grid}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Predominant Pitch</Text>
          <Text style={styles.statValue}>{measurement?.predominantPitch ?? "—"}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Steep-Slope Threshold (Company Policy)</Text>
          <Text style={styles.statValue}>{steepSlopePitchThreshold}+</Text>
        </View>
      </View>

      {pitchAreas.length > 0 && (
        <View style={{ marginBottom: 8 }}>
          {pitchAreas.map((p) => (
            <View key={p.pitch} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 }}>
              <Text style={{ fontSize: 7.5, color: pdfTheme.text }}>{p.pitch} pitch</Text>
              <Text style={{ fontSize: 7.5, color: pdfTheme.textDim }}>
                {num(p.areaSqFt)} sq ft ({totalArea > 0 ? Math.round((p.areaSqFt / totalArea) * 100) : 0}% of roof
                area)
              </Text>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.considerations}>
        <Text style={styles.considerationLabel}>Safety &amp; access: </Text>
        Pitches at or above the company&apos;s steep-slope threshold require fall-protection equipment and reduce
        crew productivity, which is reflected as a separate steep-slope labor charge rather than folded into the
        base installation rate.{"\n"}
        <Text style={styles.considerationLabel}>Underlayment &amp; ice-barrier implications: </Text>
        Code minimum ice-barrier coverage (see the Code &amp; Jurisdiction section) extends further up the slope on
        steeper roofs measured along the roof plane, not horizontally.{"\n"}
        <Text style={styles.considerationLabel}>Manufacturer limitations: </Text>
        Shingle manufacturers publish minimum-pitch and, on low slopes, special-application requirements — see the
        Product Selection section for this system&apos;s applicable pitch range.{"\n"}
        <Text style={styles.considerationLabel}>Waste: </Text>
        Complex, steep, or highly cut-up roof planes increase material waste beyond the standard allowance used in
        the estimate below.
      </Text>
    </View>
  );
}
