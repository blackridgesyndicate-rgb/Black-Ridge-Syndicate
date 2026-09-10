import type { Accessory, Measurement, PriceListItem } from "@prisma/client";
import { computeDerivedQuantities } from "@/lib/calc/measurements";

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Given a price-list item's calcRule key, determine the system-suggested
 * starting quantity from the claim's current measurements/accessories.
 * Returns null when the rule requires manual entry (no formula applies).
 */
export function calculateQuantityForRule(
  calcRule: string | null,
  measurement: Measurement | null,
  accessories: Accessory[]
): number | null {
  if (!calcRule) return null;
  const countAccessory = (type: string) =>
    accessories.filter((a) => a.type === type).reduce((sum, a) => sum + a.quantity, 0);

  if (!measurement) {
    // Some rules only need accessories, not the measurement record.
    switch (calcRule) {
      case "pipe_jack_count":
        return countAccessory("pipe_jack");
      case "kickout_diverter_count":
        return countAccessory("kickout_diverter");
      case "chimney_flashing_count":
        return countAccessory("chimney_flashing");
      case "roof_vent_count":
        return countAccessory("turtle_box_vent") + countAccessory("powered_vent");
      case "ridge_vent_lf":
        return countAccessory("ridge_vent");
      case "satellite_reset_count":
        return countAccessory("satellite_dish");
      case "counterflashing_lf":
        return countAccessory("counterflashing");
      case "wall_flashing_lf":
        return countAccessory("wall_flashing");
      case "gutter_lf":
        return countAccessory("gutter");
      case "downspout_count":
        return countAccessory("downspout");
      default:
        return null;
    }
  }

  const d = computeDerivedQuantities(measurement);

  switch (calcRule) {
    case "removal_squares":
      return round2(d.removalSquares);
    case "removal_high_roof_squares":
      return round2(d.highRoofRemovalSquares);
    case "install_squares":
      return round2(d.installSquares);
    case "install_high_roof_squares":
      return round2(d.highRoofInstallSquares);
    case "steep_slope_squares":
      return round2(d.steepSlopeSquares);
    case "ice_water_barrier_squares":
      return round2(d.eaveIceBarrierSquares + d.valleyMembraneSquares);
    case "ice_water_barrier_sf":
      // SF is the unit convention real insurance price lists (e.g.
      // Xactimate) use for ice & water barrier, rather than "squares".
      return round2(d.iceWaterBarrierSqFt);
    case "underlayment_remaining_squares":
      return round2(d.remainingUnderlaymentSquares);
    case "starter_lf":
      return round2(d.starterLengthFt);
    case "gutter_apron_lf":
      return round2(d.gutterApronLengthFt);
    case "rake_drip_edge_lf":
      return round2(d.rakeDripEdgeLengthFt);
    case "hip_ridge_cap_lf":
      return round2(d.ridgeCapLengthFt);
    case "step_flashing_lf":
      return round2(measurement.stepFlashingLength ?? 0);
    case "apron_flashing_lf":
      return round2(measurement.apronFlashingLength ?? 0);
    case "pipe_jack_count":
      return countAccessory("pipe_jack");
    case "kickout_diverter_count":
      return countAccessory("kickout_diverter");
    case "chimney_flashing_count":
      return countAccessory("chimney_flashing");
    case "roof_vent_count":
      return countAccessory("turtle_box_vent") + countAccessory("powered_vent");
    case "ridge_vent_lf":
      return countAccessory("ridge_vent");
    case "satellite_reset_count":
      return countAccessory("satellite_dish");
    case "decking_replacement_sqft":
      return countAccessory("decking_replacement");
    case "counterflashing_lf":
      return countAccessory("counterflashing");
    case "wall_flashing_lf":
      return countAccessory("wall_flashing");
    case "gutter_lf":
      return countAccessory("gutter");
    case "downspout_count":
      return countAccessory("downspout");
    default:
      return null;
  }
}

export interface LineItemFinancials {
  taxableMaterialAmount: number;
  taxAmount: number;
  rcv: number;
  depreciationAmount: number;
  acv: number;
}

/** Recomputes all money fields for a single line item. Pure function — safe to call on every edit. */
export function computeLineItemFinancials(input: {
  quantity: number;
  unitPrice: number;
  taxable: boolean;
  taxableMaterialAmount: number | null; // null = derive default (full line amount when taxable)
  taxRatePercent: number;
  depreciationPercent: number;
}): LineItemFinancials {
  const lineTotal = input.quantity * input.unitPrice;
  const taxableMaterialAmount = round2(
    input.taxableMaterialAmount ?? (input.taxable ? lineTotal : 0)
  );
  const taxAmount = round2(taxableMaterialAmount * (input.taxRatePercent / 100));
  const rcv = round2(lineTotal + taxAmount);
  const depreciationAmount = round2(lineTotal * (input.depreciationPercent / 100));
  const acv = round2(rcv - depreciationAmount);
  return { taxableMaterialAmount, taxAmount, rcv, depreciationAmount, acv };
}

export interface InsuranceSummary {
  lineItemSubtotal: number;
  materialSalesTax: number;
  rcv: number;
  depreciation: number;
  acv: number;
  deductible: number;
  priorPayments: number;
  netClaim: number;
  recoverableDepreciation: number;
  remainingBalance: number;
}

export function computeInsuranceSummary(
  lineItems: { quantity: number; unitPrice: number; taxAmount: number; rcv: number; depreciationAmount: number; acv: number; included: boolean }[],
  deductible: number,
  priorPayments: number
): InsuranceSummary {
  const included = lineItems.filter((li) => li.included);
  const lineItemSubtotal = round2(included.reduce((s, li) => s + li.quantity * li.unitPrice, 0));
  const materialSalesTax = round2(included.reduce((s, li) => s + li.taxAmount, 0));
  const rcv = round2(included.reduce((s, li) => s + li.rcv, 0));
  const depreciation = round2(included.reduce((s, li) => s + li.depreciationAmount, 0));
  const acv = round2(included.reduce((s, li) => s + li.acv, 0));
  const netClaim = round2(acv - deductible - priorPayments);
  const recoverableDepreciation = round2(depreciation);
  const remainingBalance = round2(rcv - deductible - priorPayments - netClaim);
  return {
    lineItemSubtotal,
    materialSalesTax,
    rcv,
    depreciation,
    acv,
    deductible: round2(deductible),
    priorPayments: round2(priorPayments),
    netClaim,
    recoverableDepreciation,
    remainingBalance,
  };
}

export interface InitialLineItem {
  category: string;
  description: string;
  unit: string;
  quantity: number;
  calculatedQuantity: number | null;
  quantityOverridden: boolean;
  unitPrice: number;
  taxable: boolean;
  taxRatePercent: number;
  codeCitation: string | null;
  included: boolean;
  sortOrder: number;
  priceListItemCode: string | null;
  depreciationPercent: number;
  notes?: string | null;
  taxableMaterialAmount: number;
  taxAmount: number;
  rcv: number;
  depreciationAmount: number;
  acv: number;
}

/** Builds the initial set of line items for a brand-new estimate revision from the active price list. */
export function buildInitialLineItems(
  priceList: PriceListItem[],
  measurement: Measurement | null,
  accessories: Accessory[],
  wastePercent: number,
  taxRatePercent: number,
  defaultDepreciationPercent: number
): InitialLineItem[] {
  return priceList
    .filter((p) => p.active)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((p, idx) => {
      const effectiveMeasurement =
        measurement && p.calcRule?.includes("install") ? { ...measurement, wastePercent } : measurement;
      const calcQty = calculateQuantityForRule(p.calcRule, effectiveMeasurement, accessories);
      const quantity = calcQty ?? 0;
      const financials = computeLineItemFinancials({
        quantity,
        unitPrice: p.defaultUnitPrice,
        taxable: p.taxable,
        taxableMaterialAmount: null,
        taxRatePercent: p.taxable ? taxRatePercent : 0,
        depreciationPercent: p.defaultDepreciationPercent || defaultDepreciationPercent,
      });
      return {
        category: p.category,
        description: p.description,
        unit: p.unit,
        quantity,
        calculatedQuantity: calcQty,
        quantityOverridden: false,
        unitPrice: p.defaultUnitPrice,
        taxable: p.taxable,
        taxRatePercent: p.taxable ? taxRatePercent : 0,
        codeCitation: p.codeCitation ?? null,
        included: true,
        sortOrder: idx,
        priceListItemCode: p.code,
        depreciationPercent: p.defaultDepreciationPercent || defaultDepreciationPercent,
        ...financials,
      };
    });
}
