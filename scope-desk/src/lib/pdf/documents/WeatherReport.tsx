import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { DocShellV2 } from "@/lib/pdf/DocShellV2";
import { tableStyles } from "@/lib/pdf/DocShell";
import type { ClaimDetail } from "@/lib/types";
import { dateStr } from "@/lib/format";
import { BarChart } from "@/lib/pdf/diagrams/BarChart";
import { pdfTheme } from "@/lib/pdf/theme";

const EVIDENCE_LABELS: Record<string, string> = {
  area_reported: "Event reported in the area",
  radar_indicated: "Radar-indicated storm near property",
  verified_report_at_coordinate: "Verified report at property coordinates",
  confirmed_property_damage: "Confirmed physical damage to this property",
};

const CONFIDENCE_COLORS: Record<string, string> = {
  high: "#3f7d4f",
  medium: "#c07a2e",
  low: "#8a3b3b",
};

const badgeStyles = StyleSheet.create({
  badge: { alignSelf: "flex-start", borderRadius: 3, paddingVertical: 2, paddingHorizontal: 5 },
  badgeText: { fontSize: 7, color: "#ffffff", textTransform: "capitalize" },
});

const styles = StyleSheet.create({
  chartNote: { fontSize: 6.5, color: pdfTheme.textDim, fontStyle: "italic", marginTop: -2, marginBottom: 4 },
});

function ConfidenceBadge({ level }: { level: string }) {
  const color = CONFIDENCE_COLORS[level] ?? pdfTheme.textDim;
  return (
    <View style={[badgeStyles.badge, { backgroundColor: color }]}>
      <Text style={badgeStyles.badgeText}>{level}</Text>
    </View>
  );
}

export function WeatherReportDoc({ claim }: { claim: ClaimDetail }) {
  const events = [...claim.weatherEvents].sort((a, b) => +new Date(b.eventDate) - +new Date(a.eventDate));

  const MAX_CHART_ROWS = 10;

  const hailEvents = events.filter((ev) => ev.hailSizeInches != null).sort((a, b) => (b.hailSizeInches ?? 0) - (a.hailSizeInches ?? 0));
  const hailChartData = hailEvents.slice(0, MAX_CHART_ROWS).map((ev) => ({
    label: dateStr(ev.eventDate),
    value: ev.hailSizeInches ?? 0,
    displayValue: `${ev.hailSizeInches}" hail`,
  }));

  const windEvents = events.filter((ev) => ev.windSpeedMph != null).sort((a, b) => (b.windSpeedMph ?? 0) - (a.windSpeedMph ?? 0));
  const windChartData = windEvents.slice(0, MAX_CHART_ROWS).map((ev) => ({
    label: dateStr(ev.eventDate),
    value: ev.windSpeedMph ?? 0,
    displayValue: `${ev.windSpeedMph} mph`,
  }));

  return (
    <DocShellV2
      claim={claim}
      docTitle="Weather-History Report"
      sections={["Hail Size by Event", "Wind Speed by Event", "Event Log"]}
      preparedBy={claim.estimator}
      disclaimer="Sourced from NOAA / NWS / NCEI records as available. A nearby reported weather event does not, by itself, establish that damage occurred at this property; see the evidence level noted for each entry."
      infoLeft={[
        { label: "Property", value: `${claim.property.addressLine1}, ${claim.property.city}, ${claim.property.state} ${claim.property.zip}` },
        { label: "Date of Loss (claimed)", value: dateStr(claim.dateOfLoss) },
      ]}
      infoRight={[{ label: "Claim Number", value: claim.claimNumber ?? "" }]}
    >
      {events.length === 0 ? (
        <Text style={tableStyles.cell}>No weather events have been recorded for this job yet.</Text>
      ) : (
        <>
          {hailChartData.length > 0 && (
            <>
              <Text style={tableStyles.sectionHeading}>Hail Size by Event</Text>
              <BarChart data={hailChartData} barColor="#2f5f8a" />
              {hailEvents.length > MAX_CHART_ROWS && (
                <Text style={styles.chartNote}>
                  Showing the {MAX_CHART_ROWS} largest of {hailEvents.length} recorded hail events; see the full event
                  log below.
                </Text>
              )}
            </>
          )}
          {windChartData.length > 0 && (
            <>
              <Text style={tableStyles.sectionHeading}>Wind Speed by Event</Text>
              <BarChart data={windChartData} barColor={pdfTheme.gold} />
              {windEvents.length > MAX_CHART_ROWS && (
                <Text style={styles.chartNote}>
                  Showing the {MAX_CHART_ROWS} highest of {windEvents.length} recorded wind events; see the full
                  event log below.
                </Text>
              )}
            </>
          )}
          <Text style={tableStyles.sectionHeading}>Event Log</Text>
        <View style={tableStyles.table}>
          <View style={tableStyles.headRow}>
            <Text style={[tableStyles.headCell, { width: "12%" }]}>Date</Text>
            <Text style={[tableStyles.headCell, { width: "10%" }]}>Type</Text>
            <Text style={[tableStyles.headCell, { width: "16%" }]}>Hail / Wind</Text>
            <Text style={[tableStyles.headCell, { width: "24%" }]}>Evidence Level</Text>
            <Text style={[tableStyles.headCell, { width: "10%" }]}>Confidence</Text>
            <Text style={[tableStyles.headCell, { width: "28%" }]}>Source</Text>
          </View>
          {events.map((ev, idx) => (
            <View key={ev.id} style={[tableStyles.row, idx % 2 === 1 ? tableStyles.rowAlt : {}]} wrap={false}>
              <Text style={[tableStyles.cell, { width: "12%" }]}>{dateStr(ev.eventDate)}</Text>
              <Text style={[tableStyles.cell, { width: "10%" }]}>{ev.eventType}</Text>
              <Text style={[tableStyles.cell, { width: "16%" }]}>
                {ev.hailSizeInches ? `${ev.hailSizeInches}" hail` : ""}
                {ev.windSpeedMph ? ` ${ev.windSpeedMph} mph` : ""}
              </Text>
              <Text style={[tableStyles.cell, { width: "24%" }]}>{EVIDENCE_LABELS[ev.evidenceLevel] ?? ev.evidenceLevel}</Text>
              <View style={{ width: "10%" }}>
                <ConfidenceBadge level={ev.confidenceLevel} />
              </View>
              <View style={{ width: "28%" }}>
                <Text style={tableStyles.cell}>{ev.source}</Text>
                {ev.sourceUrl && <Text style={tableStyles.cellDim}>{ev.sourceUrl}</Text>}
              </View>
            </View>
          ))}
        </View>
        </>
      )}
    </DocShellV2>
  );
}
