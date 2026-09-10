import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { pdfTheme } from "@/lib/pdf/theme";

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", marginBottom: 5 },
  label: { fontSize: 7.5, color: pdfTheme.text, width: 110 },
  track: { flex: 1, height: 9, backgroundColor: pdfTheme.bgTint, borderWidth: 1, borderColor: pdfTheme.border },
  fill: { height: "100%" },
  value: { fontSize: 7.5, color: pdfTheme.textDim, width: 90, textAlign: "right" },
});

export interface BarChartDatum {
  label: string;
  value: number;
  displayValue: string;
  color?: string;
}

/** A simple horizontal bar chart — every bar's length is proportional to `value`. */
export function BarChart({ data, barColor = pdfTheme.gold }: { data: BarChartDatum[]; barColor?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <View style={{ marginTop: 6 }}>
      {data.map((d, i) => (
        <View key={i} style={styles.row}>
          <Text style={styles.label}>{d.label}</Text>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.max(2, (d.value / max) * 100)}%`, backgroundColor: d.color ?? barColor }]} />
          </View>
          <Text style={styles.value}>{d.displayValue}</Text>
        </View>
      ))}
    </View>
  );
}
