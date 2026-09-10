import Decimal from "decimal.js";

/**
 * Decimal-safe money arithmetic. Every financial calculation in the
 * estimating engine (line-item totals, tax, RCV/ACV, revision summaries)
 * should route through these helpers rather than raw `number` multiplication
 * or division — plain JS floats accumulate rounding error across chained
 * operations (e.g. qty * unitPrice * (1 + taxRate) - depreciation) in a way
 * that's invisible on any single line but compounds across a multi-page
 * estimate. Decimal.js computes in exact base-10 arithmetic; we only drop
 * back to `number` at the very end, once, via `toMoney`.
 */

export type RoundingMode = "nearest_cent" | "nearest_dollar";

/** Wraps a plain number/string as a Decimal, treating null/undefined/NaN as 0. */
export function d(value: number | string | null | undefined): Decimal {
  if (value == null) return new Decimal(0);
  const dec = new Decimal(typeof value === "number" && Number.isNaN(value) ? 0 : value);
  return dec.isFinite() ? dec : new Decimal(0);
}

/** Rounds a Decimal to a plain JS number using the given rounding mode. Half-up, as expected for currency. */
export function toMoney(value: Decimal, mode: RoundingMode = "nearest_cent"): number {
  const places = mode === "nearest_dollar" ? 0 : 2;
  return value.toDecimalPlaces(places, Decimal.ROUND_HALF_UP).toNumber();
}

/** Convenience: round a plain number the same way, for call sites that aren't yet decimal-native. */
export function round2(n: number): number {
  return toMoney(d(n), "nearest_cent");
}

export function roundMoney(n: number, mode: RoundingMode = "nearest_cent"): number {
  return toMoney(d(n), mode);
}

/** quantity * unitPrice, decimal-safe, rounded to cents. */
export function lineTotal(quantity: number, unitPrice: number): number {
  return toMoney(d(quantity).times(d(unitPrice)));
}

/** Unrounded quantity * unitPrice, for audit trails (rcvUnrounded etc). */
export function lineTotalUnrounded(quantity: number, unitPrice: number): number {
  return d(quantity).times(d(unitPrice)).toNumber();
}

/** amount * percent/100, decimal-safe, rounded to cents. */
export function percentOf(amount: number, percent: number): number {
  return toMoney(d(amount).times(d(percent)).dividedBy(100));
}

/** Sums a list of numbers using decimal arithmetic, rounded to cents. */
export function sumMoney(values: (number | null | undefined)[], mode: RoundingMode = "nearest_cent"): number {
  const total = values.reduce((acc: Decimal, v) => acc.plus(d(v)), new Decimal(0));
  return toMoney(total, mode);
}
