import type { PriceListItem } from "@prisma/client";

/**
 * Pure product-assembly logic with no server-only/DB dependency, so it can
 * be used from both the Next.js server (via productAssembly.ts) and plain
 * Node contexts like prisma/seed.ts.
 */

/**
 * States whose pricing/product data has been reviewed for that market.
 * Today this is only Illinois — the seeded universal (state=null) price
 * list was calibrated from a real Illinois contractor estimate. Any other
 * state currently falls back to that same universal data unreviewed; add a
 * real state="XX" override for a code via the price-list editor and that
 * state's assembly becomes reviewed the same way (no code change needed).
 */
export const REGIONALLY_REVIEWED_STATES = ["IL"];

export function mergeByState(all: PriceListItem[], state: string | null | undefined): PriceListItem[] {
  const normalizedState = state?.toUpperCase() || null;
  const byCode = new Map<string, PriceListItem>();
  // Universal rows first, then state-specific rows overwrite them by code.
  for (const item of all.filter((i) => !i.state)) {
    byCode.set(item.code, item);
  }
  if (normalizedState) {
    for (const item of all.filter((i) => i.state === normalizedState)) {
      byCode.set(item.code, item);
    }
  }
  return [...byCode.values()].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function isRegionallyReviewed(state: string | null | undefined): boolean {
  return !!state && REGIONALLY_REVIEWED_STATES.includes(state.toUpperCase());
}

/** Filters a resolved catalog down to items available for a retail tier
 * (null retailTierKeys = base scope, included in every tier). */
export function filterForRetailTier(items: PriceListItem[], tierKey: string | null | undefined): PriceListItem[] {
  if (!tierKey) return items;
  return items.filter((item) => {
    if (!item.retailTierKeys) return true;
    return item.retailTierKeys.split(",").map((k) => k.trim()).includes(tierKey);
  });
}
