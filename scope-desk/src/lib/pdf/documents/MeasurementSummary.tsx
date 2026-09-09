import { View, Text } from "@react-pdf/renderer";
import { DocShell, tableStyles } from "@/lib/pdf/DocShell";
import type { ClaimDetail } from "@/lib/types";
import { computeDerivedQuantities } from "@/lib/calc/measurements";
import { num, dateStr } from "@/lib/format";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={tableStyles.row}>
      <Text style={[tableStyles.cell, { width: "60%" }]}>{label}</Text>
      <Text style={[tableStyles.cell, { width: "40%" }]}>{value}</Text>
    </View>
  );
}

export function MeasurementSummaryDoc({ claim }: { claim: ClaimDetail }) {
  const m = claim.measurement;
  const derived = m ? computeDerivedQuantities(m) : null;
  const pitchAreas = m?.pitchAreasJson ? JSON.parse(m.pitchAreasJson) : [];

  return (
    <DocShell
      docTitle="Roof Measurement Summary"
      disclaimer="Measurements are derived from the uploaded measurement report and/or field verification, subject to contractor review. This report is prepared by Black Ridge Roofing for internal estimating and homeowner reference."
      infoLeft={[
        { label: "Property", value: `${claim.property.addressLine1}, ${claim.property.city}, ${claim.property.state} ${claim.property.zip}` },
        { label: "Homeowner", value: claim.property.customer.name },
      ]}
      infoRight={[
        { label: "Inspection Date", value: dateStr(claim.inspectionDate) },
        { label: "Predominant Pitch", value: m?.predominantPitch ?? "" },
      ]}
    >
      {!m ? (
        <Text style={tableStyles.cell}>No measurement data has been entered for this job yet.</Text>
      ) : (
        <>
          <Text style={tableStyles.sectionHeading}>Roof Summary</Text>
          <View style={tableStyles.table}>
            <Row label="Total Roof Area" value={`${num(m.roofAreaSqFt)} sq ft`} />
            <Row label="Measured Squares" value={num(m.measuredSquares)} />
            <Row label="Roof Facets" value={num(m.facets, 0)} />
            <Row label="Waste Percentage" value={`${num(m.wastePercent)}%`} />
          </View>

          {pitchAreas.length > 0 && (
            <>
              <Text style={tableStyles.sectionHeading}>Pitch Breakdown</Text>
              <View style={tableStyles.table}>
                {pitchAreas.map((p: { pitch: string; areaSqFt: number }, i: number) => (
                  <Row key={i} label={`${p.pitch} pitch`} value={`${num(p.areaSqFt)} sq ft`} />
                ))}
              </View>
            </>
          )}

          <Text style={tableStyles.sectionHeading}>Linear Measurements</Text>
          <View style={tableStyles.table}>
            <Row label="Eaves" value={`${num(m.eaves)} ft`} />
            <Row label="Rakes" value={`${num(m.rakes)} ft`} />
            <Row label="Ridges" value={`${num(m.ridges)} ft`} />
            <Row label="Hips" value={`${num(m.hips)} ft`} />
            <Row label="Valleys" value={`${num(m.valleys)} ft`} />
            <Row label="Starter Length" value={`${num(m.starterLength)} ft`} />
            <Row label="Drip-Edge Length" value={`${num(m.dripEdgeLength)} ft`} />
            <Row label="Step Flashing" value={`${num(m.stepFlashingLength)} ft`} />
            <Row label="Apron Flashing" value={`${num(m.apronFlashingLength)} ft`} />
            <Row label="Leak-Barrier Length" value={`${num(m.leakBarrierLength)} ft`} />
            <Row label="Two-Story Roof Area" value={`${num(m.twoStoryAreaSqFt)} sq ft`} />
            <Row label="Steep-Slope Roof Area" value={`${num(m.steepSlopeAreaSqFt)} sq ft`} />
          </View>

          {derived && (
            <>
              <Text style={tableStyles.sectionHeading}>Calculated Material Quantities</Text>
              <View style={tableStyles.table}>
                <Row label="Removal (Squares)" value={num(derived.removalSquares)} />
                <Row label="Installation (Squares, incl. waste)" value={num(derived.installSquares)} />
                <Row label="High-Roof Removal (Squares)" value={num(derived.highRoofRemovalSquares)} />
                <Row label="High-Roof Installation (Squares)" value={num(derived.highRoofInstallSquares)} />
                <Row label="Steep-Slope (Squares)" value={num(derived.steepSlopeSquares)} />
                <Row label="Eave Ice &amp; Water Coverage (Squares)" value={num(derived.eaveIceBarrierSquares)} />
                <Row label="Valley Membrane Coverage (Squares)" value={num(derived.valleyMembraneSquares)} />
                <Row label="Remaining Underlayment (Squares)" value={num(derived.remainingUnderlaymentSquares)} />
                <Row label="Starter Quantity (LF)" value={num(derived.starterLengthFt)} />
                <Row label="Gutter Apron (LF)" value={num(derived.gutterApronLengthFt)} />
                <Row label="Rake Drip Edge (LF)" value={num(derived.rakeDripEdgeLengthFt)} />
                <Row label="Ridge Cap (LF)" value={num(derived.ridgeCapLengthFt)} />
              </View>
            </>
          )}
        </>
      )}
    </DocShell>
  );
}
