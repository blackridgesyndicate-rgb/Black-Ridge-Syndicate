import type { Accessory, Measurement, PriceListItem } from "@prisma/client";
import { computeDerivedQuantities } from "@/lib/calc/measurements";
import { d, toMoney, round2, roundMoney, lineTotal, lineTotalUnrounded, percentOf, sumMoney, type RoundingMode } from "@/lib/calc/money";

export { round2 } from "@/lib/calc/money";

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
  rcvUnrounded: number;
  depreciationAmount: number;
  acv: number;
}

/**
 * Recomputes all money fields for a single line item using decimal-safe
 * arithmetic throughout (no intermediate float multiplication/division).
 * Pure function — safe to call on every edit. `rcvUnrounded` preserves the
 * pre-rounding value for audit even though `rcv` (rounded per `roundingMode`)
 * is the figure used everywhere else in the app.
 */
export function computeLineItemFinancials(input: {
  quantity: number;
  unitPrice: number;
  taxable: boolean;
  taxableMaterialAmount: number | null; // null = derive default (full line amount when taxable)
  taxRatePercent: number;
  depreciationPercent: number;
  roundingMode?: RoundingMode;
}): LineItemFinancials {
  const mode = input.roundingMode ?? "nearest_cent";
  const total = d(input.quantity).times(d(input.unitPrice));
  const taxableMaterialAmount = toMoney(
    input.taxableMaterialAmount != null ? d(input.taxableMaterialAmount) : input.taxable ? total : d(0),
    mode
  );
  const taxAmount = percentOf(taxableMaterialAmount, input.taxRatePercent);
  const rcvDecimal = total.plus(d(taxAmount));
  const rcv = toMoney(rcvDecimal, mode);
  const depreciationAmount = percentOf(lineTotal(input.quantity, input.unitPrice), input.depreciationPercent);
  const acv = toMoney(rcvDecimal.minus(d(depreciationAmount)), mode);
  return {
    taxableMaterialAmount,
    taxAmount,
    rcv,
    rcvUnrounded: rcvDecimal.toNumber(),
    depreciationAmount,
    acv,
  };
}

export interface InsuranceSummary {
  lineItemSubtotal: number;
  materialSalesTax: number;
  overheadProfit: number;
  rcv: number;
  depreciation: number;
  acv: number;
  deductible: number;
  priorPayments: number;
  netClaim: number;
  recoverableDepreciation: number;
  remainingBalance: number;
}

/**
 * Every sum below runs through decimal-safe arithmetic (sumMoney/percentOf)
 * rather than reduce()-ing raw floats, so a multi-page estimate's totals
 * can't drift from the sum of what's printed on each line.
 */
export function computeInsuranceSummary(
  lineItems: { quantity: number; unitPrice: number; taxAmount: number; rcv: number; depreciationAmount: number; acv: number; included: boolean }[],
  deductible: number,
  priorPayments: number,
  overheadProfitPercent = 0,
  roundingMode: RoundingMode = "nearest_cent"
): InsuranceSummary {
  const included = lineItems.filter((li) => li.included);
  const lineItemSubtotal = sumMoney(
    included.map((li) => lineTotalUnrounded(li.quantity, li.unitPrice)),
    roundingMode
  );
  const materialSalesTax = sumMoney(included.map((li) => li.taxAmount), roundingMode);
  const overheadProfit = percentOf(lineItemSubtotal, overheadProfitPercent);
  const rcv = toMoney(d(sumMoney(included.map((li) => li.rcv), roundingMode)).plus(d(overheadProfit)), roundingMode);
  const depreciation = sumMoney(included.map((li) => li.depreciationAmount), roundingMode);
  const acv = toMoney(d(rcv).minus(d(depreciation)), roundingMode);
  const netClaim = toMoney(d(acv).minus(d(deductible)).minus(d(priorPayments)), roundingMode);
  const recoverableDepreciation = roundMoney(depreciation, roundingMode);
  const remainingBalance = toMoney(d(rcv).minus(d(deductible)).minus(d(priorPayments)).minus(d(netClaim)), roundingMode);
  return {
    lineItemSubtotal,
    materialSalesTax,
    overheadProfit,
    rcv,
    depreciation,
    acv,
    deductible: roundMoney(deductible, roundingMode),
    priorPayments: roundMoney(priorPayments, roundingMode),
    netClaim,
    recoverableDepreciation,
    remainingBalance,
  };
}

export interface RetailSummary {
  baseContract: number;
  upgradesTotal: number;
  discount: number;
  materialSalesTax: number;
  permitAllowance: number;
  overheadProfit: number;
  totalContractPrice: number;
  depositAmount: number;
  progressPaymentAmount: number;
  finalBalance: number;
}

/**
 * Retail proposals never carry ACV, depreciation, deductible, prior
 * payments, or carrier-comparison figures — this summary shape deliberately
 * has no fields for them so a retail PDF can't accidentally render
 * insurance-only language.
 */
export function computeRetailSummary(
  lineItems: { quantity: number; unitPrice: number; taxAmount: number; isUpgrade: boolean; included: boolean }[],
  opts: {
    discountAmount?: number;
    permitAllowance?: number;
    overheadProfitPercent?: number;
    depositPercent?: number;
    progressPaymentPercent?: number;
    roundingMode?: RoundingMode;
  } = {}
): RetailSummary {
  const mode = opts.roundingMode ?? "nearest_cent";
  const included = lineItems.filter((li) => li.included);
  const base = included.filter((li) => !li.isUpgrade);
  const upgrades = included.filter((li) => li.isUpgrade);

  const baseContract = sumMoney(base.map((li) => lineTotalUnrounded(li.quantity, li.unitPrice)), mode);
  const upgradesTotal = sumMoney(upgrades.map((li) => lineTotalUnrounded(li.quantity, li.unitPrice)), mode);
  const materialSalesTax = sumMoney(included.map((li) => li.taxAmount), mode);
  const discount = roundMoney(opts.discountAmount ?? 0, mode);
  const permitAllowance = roundMoney(opts.permitAllowance ?? 0, mode);
  const overheadProfit = percentOf(d(baseContract).plus(d(upgradesTotal)).toNumber(), opts.overheadProfitPercent ?? 0);

  const totalContractPrice = toMoney(
    d(baseContract)
      .plus(d(upgradesTotal))
      .plus(d(materialSalesTax))
      .plus(d(permitAllowance))
      .plus(d(overheadProfit))
      .minus(d(discount)),
    mode
  );

  const depositAmount = percentOf(totalContractPrice, opts.depositPercent ?? 0);
  const progressPaymentAmount = percentOf(totalContractPrice, opts.progressPaymentPercent ?? 0);
  const finalBalance = toMoney(
    d(totalContractPrice).minus(d(depositAmount)).minus(d(progressPaymentAmount)),
    mode
  );

  return {
    baseContract,
    upgradesTotal,
    discount,
    materialSalesTax,
    permitAllowance,
    overheadProfit,
    totalContractPrice,
    depositAmount,
    progressPaymentAmount,
    finalBalance,
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
  retailTierKeys: string | null;
  isUpgrade: boolean;
}

/** Builds the initial set of line items for a brand-new estimate revision from the (already
 * state/tier-resolved) price list. `reportType` picks between the price list's insurance-specific,
 * retail-specific, or default unit price — see PriceListItem.insuranceUnitPrice/retailUnitPrice. */
export function buildInitialLineItems(
  priceList: PriceListItem[],
  measurement: Measurement | null,
  accessories: Accessory[],
  wastePercent: number,
  taxRatePercent: number,
  defaultDepreciationPercent: number,
  reportType: "insurance" | "retail" = "insurance"
): InitialLineItem[] {
  return priceList
    .filter((p) => p.active)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((p, idx) => {
      const effectiveMeasurement =
        measurement && p.calcRule?.includes("install") ? { ...measurement, wastePercent } : measurement;
      const calcQty = calculateQuantityForRule(p.calcRule, effectiveMeasurement, accessories);
      const quantity = calcQty ?? 0;
      const unitPrice =
        (reportType === "insurance" ? p.insuranceUnitPrice : p.retailUnitPrice) ?? p.defaultUnitPrice;
      const financials = computeLineItemFinancials({
        quantity,
        unitPrice,
        taxable: p.taxable,
        taxableMaterialAmount: null,
        taxRatePercent: p.taxable ? taxRatePercent : 0,
        depreciationPercent: reportType === "retail" ? 0 : p.defaultDepreciationPercent || defaultDepreciationPercent,
      });
      return {
        category: p.category,
        description: p.description,
        unit: p.unit,
        quantity,
        calculatedQuantity: calcQty,
        quantityOverridden: false,
        unitPrice,
        taxable: p.taxable,
        taxRatePercent: p.taxable ? taxRatePercent : 0,
        codeCitation: p.codeCitation ?? null,
        included: true,
        sortOrder: idx,
        priceListItemCode: p.code,
        depreciationPercent: reportType === "retail" ? 0 : p.defaultDepreciationPercent || defaultDepreciationPercent,
        retailTierKeys: p.retailTierKeys ?? null,
        isUpgrade: p.standardOrUpgrade === "upgrade",
        ...financials,
      };
    });
}
