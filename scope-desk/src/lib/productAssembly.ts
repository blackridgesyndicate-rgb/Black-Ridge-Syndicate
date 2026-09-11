import "server-only";
import type { PriceListItem } from "@prisma/client";
import { db } from "@/lib/db";
import { mergeByState } from "@/lib/productAssemblyCore";

export { REASON_SELECTED_LABELS } from "@/lib/productReasons";
export { REGIONALLY_REVIEWED_STATES, isRegionallyReviewed, filterForRetailTier, mergeByState } from "@/lib/productAssemblyCore";

/**
 * Resolves the effective price-list catalog for a claim's property state:
 * a state-scoped row (state === property.state) takes precedence over the
 * universal fallback row of the same `code`. Properties outside a
 * regionally-reviewed state silently use the universal assembly — callers
 * should surface that (see `isRegionallyReviewed`) rather than presenting
 * it as state-specific.
 *
 * This is the single implementation of "editable product assemblies... by
 * state" — a new state gets real regional pricing/products simply by
 * adding state-scoped PriceListItem rows through the price-list admin UI;
 * no code change is required.
 */
export async function resolvePriceListForState(state: string | null | undefined): Promise<PriceListItem[]> {
  const all = await db.priceListItem.findMany({ where: { active: true } });
  return mergeByState(all, state);
}
