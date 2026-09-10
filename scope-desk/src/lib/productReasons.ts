/** Plain constants shared between server product-assembly logic and client
 * admin UI — kept in a file with no "server-only" import so it's safe in
 * client components too. */
export const REASON_SELECTED_LABELS: Record<string, string> = {
  legally_required_code: "Legally required by code",
  required_by_manufacturer: "Required by manufacturer instructions",
  required_for_warranty: "Required for selected warranty",
  system_compatibility: "Necessary for system compatibility",
  recommended_climate_performance: "Recommended for climate/performance",
  optional_upgrade: "Optional customer upgrade",
  company_standard: "Company installation standard",
};
