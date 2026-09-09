import type { Measurement } from "@prisma/client";

/**
 * Derived roofing quantities computed from a Measurement record.
 * All calculations follow the rules specified for Black Ridge Scope Desk:
 *  - Removal quantity (SQ)      = roof area / 100
 *  - Installation quantity (SQ) = measured squares * (1 + waste%)
 *  - Eave ice-barrier (SQ)      = eave length * membrane width / 100
 *  - Valley membrane (SQ)       = valley length * membrane width / 100
 *  - Remaining underlayment(SQ) = roof area - ice & water coverage, in squares
 *  - Starter (LF)                = eaves + rakes (unless overridden)
 *  - Gutter apron (LF)            = eaves
 *  - Rake drip edge (LF)          = rakes
 *  - Ridge cap (LF)                = ridges + hips
 */
export interface DerivedQuantities {
  measuredSquares: number;
  removalSquares: number;
  installSquares: number;
  highRoofRemovalSquares: number;
  highRoofInstallSquares: number;
  steepSlopeSquares: number;
  eaveIceBarrierSquares: number;
  valleyMembraneSquares: number;
  remainingUnderlaymentSquares: number;
  starterLengthFt: number;
  gutterApronLengthFt: number;
  rakeDripEdgeLengthFt: number;
  ridgeCapLengthFt: number;
}

function n(v: number | null | undefined): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

export function computeDerivedQuantities(m: Measurement): DerivedQuantities {
  const roofArea = n(m.roofAreaSqFt);
  const measuredSquares = m.measuredSquares != null ? n(m.measuredSquares) : roofArea / 100;
  const waste = n(m.wastePercent) / 100;
  const membraneWidth = m.membraneWidthFeet != null ? n(m.membraneWidthFeet) : 3;

  const removalSquares = roofArea / 100;
  const installSquares = measuredSquares * (1 + waste);

  const highRoofArea = n(m.twoStoryAreaSqFt);
  const highRoofRemovalSquares = highRoofArea / 100;
  const highRoofInstallSquares = (highRoofArea / 100) * (1 + waste);

  const steepSlopeSquares = n(m.steepSlopeAreaSqFt) / 100;

  const eaveIceBarrierSqFt = n(m.eaves) * membraneWidth;
  const eaveIceBarrierSquares = eaveIceBarrierSqFt / 100;

  const valleyMembraneSqFt = n(m.valleys) * membraneWidth;
  const valleyMembraneSquares = valleyMembraneSqFt / 100;

  const remainingUnderlaymentSqFt = Math.max(0, roofArea - eaveIceBarrierSqFt - valleyMembraneSqFt);
  const remainingUnderlaymentSquares = remainingUnderlaymentSqFt / 100;

  const starterLengthFt = n(m.eaves) + n(m.rakes);
  const gutterApronLengthFt = n(m.eaves);
  const rakeDripEdgeLengthFt = n(m.rakes);
  const ridgeCapLengthFt = n(m.ridges) + n(m.hips);

  return {
    measuredSquares,
    removalSquares,
    installSquares,
    highRoofRemovalSquares,
    highRoofInstallSquares,
    steepSlopeSquares,
    eaveIceBarrierSquares,
    valleyMembraneSquares,
    remainingUnderlaymentSquares,
    starterLengthFt,
    gutterApronLengthFt,
    rakeDripEdgeLengthFt,
    ridgeCapLengthFt,
  };
}
