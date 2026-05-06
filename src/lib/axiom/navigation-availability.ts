/**
 * Jurisdictions that exist in the corpus but do not yet have a
 * generated navigation_nodes tree. Keep this list small and explicit:
 * once the corpus generator emits roots for a jurisdiction, remove it.
 */
export const HIDDEN_NAVIGATION_JURISDICTIONS = new Set(["canada"]);

export function isNavigationJurisdictionEnabled(slug: string): boolean {
  return !HIDDEN_NAVIGATION_JURISDICTIONS.has(slug);
}
