import { View, Text, Svg, Path, Line, Circle, G, StyleSheet } from "@react-pdf/renderer";
import { pdfTheme } from "@/lib/pdf/theme";
import { num } from "@/lib/format";

/**
 * A labeled roof-plan schematic. The house/roof outline itself is a
 * representative shape (illustrative, not a survey of this property's
 * actual footprint) — real polygon geometry isn't captured anywhere in the
 * measurement data — but every number in the legend is the claim's actual
 * measured quantity, and the color key matches the convention GAF QuickMeasure
 * itself uses (eave = gray, rake = green, ridge = red).
 */

const COLORS = {
  eave: "#7d7568",
  rake: "#3f7d4f",
  ridge: "#a53f3f",
  hip: "#c07a2e",
  valley: "#2f5f8a",
};

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", gap: 16, alignItems: "center" },
  legend: { flexDirection: "column", gap: 5, flexGrow: 1 },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  swatch: { width: 10, height: 3 },
  legendLabel: { fontSize: 8, color: pdfTheme.text, width: 62 },
  legendValue: { fontSize: 8, color: pdfTheme.textDim },
  caption: { fontSize: 6.5, color: pdfTheme.textDim, marginTop: 6, fontStyle: "italic" },
});

export interface RoofDiagramMeasurements {
  eaves?: number | null;
  rakes?: number | null;
  ridges?: number | null;
  hips?: number | null;
  valleys?: number | null;
  predominantPitch?: string | null;
}

function LegendRow({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <View style={styles.legendRow}>
      <View style={[styles.swatch, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
      <Text style={styles.legendValue}>{value}</Text>
    </View>
  );
}

export function RoofDiagram({ m }: { m: RoofDiagramMeasurements }) {
  return (
    <View>
      <View style={styles.wrap}>
        <Svg width={190} height={140} viewBox="0 0 190 140">
          {/* compass */}
          <G>
            <Line x1={16} y1={30} x2={16} y2={10} stroke={pdfTheme.textDim} strokeWidth={0.75} />
            <Path d="M12,15 L16,8 L20,15 Z" fill={pdfTheme.textDim} />
            <Text x={12} y={40} fill={pdfTheme.textDim}>
              N
            </Text>
          </G>

          {/* Main hip roof body */}
          <G>
            {/* eaves (outer rectangle) */}
            <Line x1={25} y1={30} x2={135} y2={30} stroke={COLORS.eave} strokeWidth={3} />
            <Line x1={25} y1={110} x2={135} y2={110} stroke={COLORS.eave} strokeWidth={3} />
            <Line x1={25} y1={30} x2={25} y2={110} stroke={COLORS.eave} strokeWidth={3} />
            {/* hips */}
            <Line x1={25} y1={30} x2={60} y2={70} stroke={COLORS.hip} strokeWidth={2.25} />
            <Line x1={135} y1={30} x2={110} y2={70} stroke={COLORS.hip} strokeWidth={2.25} />
            <Line x1={25} y1={110} x2={60} y2={70} stroke={COLORS.hip} strokeWidth={2.25} />
            {/* ridge */}
            <Line x1={60} y1={70} x2={110} y2={70} stroke={COLORS.ridge} strokeWidth={2.5} />
          </G>

          {/* Gable wing attached on the right, forming a valley */}
          <G>
            <Line x1={135} y1={45} x2={178} y2={45} stroke={COLORS.eave} strokeWidth={3} />
            <Line x1={135} y1={95} x2={178} y2={95} stroke={COLORS.eave} strokeWidth={3} />
            {/* rakes (gable end) */}
            <Line x1={178} y1={45} x2={165} y2={70} stroke={COLORS.rake} strokeWidth={2.25} />
            <Line x1={178} y1={95} x2={165} y2={70} stroke={COLORS.rake} strokeWidth={2.25} />
            {/* wing ridge */}
            <Line x1={135} y1={70} x2={165} y2={70} stroke={COLORS.ridge} strokeWidth={2.5} />
            {/* valleys where wing meets main roof */}
            <Line x1={135} y1={45} x2={110} y2={70} stroke={COLORS.valley} strokeWidth={2.25} />
            <Line x1={135} y1={95} x2={110} y2={70} stroke={COLORS.valley} strokeWidth={2.25} />
          </G>

          <Circle cx={60} cy={70} r={1.3} fill={pdfTheme.text} />
          <Circle cx={110} cy={70} r={1.3} fill={pdfTheme.text} />
        </Svg>

        <View style={styles.legend}>
          <LegendRow color={COLORS.eave} label="Eaves" value={`${num(m.eaves)} ft`} />
          <LegendRow color={COLORS.rake} label="Rakes" value={`${num(m.rakes)} ft`} />
          <LegendRow color={COLORS.ridge} label="Ridges" value={`${num(m.ridges)} ft`} />
          <LegendRow color={COLORS.hip} label="Hips" value={`${num(m.hips)} ft`} />
          <LegendRow color={COLORS.valley} label="Valleys" value={`${num(m.valleys)} ft`} />
          {m.predominantPitch && (
            <View style={styles.legendRow}>
              <View style={{ width: 10 }} />
              <Text style={styles.legendLabel}>Pitch</Text>
              <Text style={styles.legendValue}>{m.predominantPitch}</Text>
            </View>
          )}
        </View>
      </View>
      <Text style={styles.caption}>
        Schematic roof-plan diagram for illustration — not a survey of this property&apos;s exact footprint. Edge
        colors match the roof-report convention (eave/rake/ridge/hip/valley); figures are this claim&apos;s
        measured quantities.
      </Text>
    </View>
  );
}
