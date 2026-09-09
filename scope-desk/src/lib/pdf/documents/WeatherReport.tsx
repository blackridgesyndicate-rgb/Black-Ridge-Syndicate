import { View, Text } from "@react-pdf/renderer";
import { DocShell, tableStyles } from "@/lib/pdf/DocShell";
import type { ClaimDetail } from "@/lib/types";
import { dateStr } from "@/lib/format";

const EVIDENCE_LABELS: Record<string, string> = {
  area_reported: "Event reported in the area",
  radar_indicated: "Radar-indicated storm near property",
  verified_report_at_coordinate: "Verified report at property coordinates",
  confirmed_property_damage: "Confirmed physical damage to this property",
};

export function WeatherReportDoc({ claim }: { claim: ClaimDetail }) {
  const events = [...claim.weatherEvents].sort((a, b) => +new Date(b.eventDate) - +new Date(a.eventDate));

  return (
    <DocShell
      docTitle="Weather-History Report"
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
              <Text style={[tableStyles.cell, { width: "10%" }]}>{ev.confidenceLevel}</Text>
              <View style={{ width: "28%" }}>
                <Text style={tableStyles.cell}>{ev.source}</Text>
                {ev.sourceUrl && <Text style={tableStyles.cellDim}>{ev.sourceUrl}</Text>}
              </View>
            </View>
          ))}
        </View>
      )}
    </DocShell>
  );
}
