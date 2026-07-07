/**
 * App-surface visibility for rulespec-* repos.
 *
 * A rulespec repo may declare `.axiom/registry.toml`:
 *
 *   [registry]
 *   app_visibility = "experimental"
 *
 * Repos marked experimental are excluded from public app surfaces (the
 * encoded-search index sync, the runtime encoded-search fallback, and —
 * via the mirrored map in axiom-corpus — navigation encoding badges).
 * An absent file, absent key, or unrecognized value means "public", so
 * established repos need no marker and a fetch hiccup cannot hide a live
 * country. Parsed line-wise (not a full TOML parser) — keep the marker in
 * the simple `app_visibility = "value"` form.
 */
export type AppVisibility = "public" | "experimental";

export function parseAppVisibility(tomlText: string | null): AppVisibility {
  if (!tomlText) return "public";
  for (const line of tomlText.split(/\r?\n/)) {
    const match = line.match(/^\s*app_visibility\s*=\s*"([a-z]+)"\s*(?:#.*)?$/);
    if (match) return match[1] === "experimental" ? "experimental" : "public";
  }
  return "public";
}
