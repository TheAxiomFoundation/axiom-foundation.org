import { listRuntimePackages } from "@/lib/axiom/runtime/api";

/**
 * Program-level coverage for the /coverage page: every executable
 * program family in the runtime registry and the jurisdictions it
 * runs in. State-prefixed program ids fold into their base family
 * ("co-snap" in us-co → "snap"), mirroring the reader's grouping.
 *
 * Returns [] when the runtime API is unconfigured or unavailable —
 * the page shows an explicit note, never a silent blank.
 */
export interface ProgramCoverage {
  family: string;
  jurisdictions: string[];
}

const CACHE_TTL_MS = 600_000;
let cached: { at: number; value: ProgramCoverage[] } | null = null;

/** Held back from the public census for now (2026-07). */
const HIDDEN_FAMILIES = new Set(["universal-credit"]);

/** Test hook: module-level cache must reset between tests. */
export function _resetProgramCoverageCache() {
  cached = null;
}

export async function getProgramCoverage(): Promise<ProgramCoverage[]> {
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.value;
  }
  const packages = await listRuntimePackages();
  const families = new Map<string, Set<string>>();
  for (const pkg of packages) {
    const state = pkg.jurisdiction.split("-")[1];
    const family =
      state && pkg.program_id.startsWith(`${state}-`)
        ? pkg.program_id.slice(state.length + 1)
        : pkg.program_id;
    const slugs = families.get(family) ?? new Set<string>();
    slugs.add(pkg.jurisdiction);
    families.set(family, slugs);
  }
  const value = [...families.entries()]
    .filter(([family]) => !HIDDEN_FAMILIES.has(family))
    .map(([family, slugs]) => ({
      family,
      jurisdictions: [...slugs].sort(),
    }))
    .sort(
      (a, b) =>
        b.jurisdictions.length - a.jurisdictions.length ||
        a.family.localeCompare(b.family)
    );
  // Never cache the empty/unavailable result.
  if (value.length > 0) cached = { at: Date.now(), value };
  return value;
}

/**
 * The signed side of the registry: packages compiled from certified
 * encodings (mode "compiled"), as opposed to fixture-backed previews.
 * Null when the runtime API is unconfigured/unavailable or nothing
 * compiled is live — callers hide the line rather than show zeros.
 */
export interface RegistryStats {
  compiledPrograms: number;
  certifiedRules: number;
}

export async function getRegistryStats(): Promise<RegistryStats | null> {
  const packages = await listRuntimePackages();
  const compiled = packages.filter(
    (pkg) => pkg.mode === "compiled" && pkg.status === "ready"
  );
  if (compiled.length === 0) return null;
  return {
    compiledPrograms: compiled.length,
    certifiedRules: compiled.reduce(
      (sum, pkg) => sum + (pkg.output_count ?? 0),
      0
    ),
  };
}
