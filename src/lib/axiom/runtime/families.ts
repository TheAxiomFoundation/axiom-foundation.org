import type { ProvisionProgramCoverage } from "@/lib/axiom/runtime/coverage";

/**
 * Family key for grouping: state-prefixed program ids fold into
 * their base program ("co-snap" in us-co → "snap"). Pure module —
 * usable from server components and the client rail alike.
 */
export function programFamily(program: ProvisionProgramCoverage): string {
  const state = program.jurisdiction.split("-")[1];
  return state && program.programId.startsWith(`${state}-`)
    ? program.programId.slice(state.length + 1)
    : program.programId;
}

/** "snap (7 jurisdictions) · tanf (2 jurisdictions)" for the header
 *  strip's status line. */
export function programFamilySummary(
  programs: ProvisionProgramCoverage[]
): string | null {
  if (programs.length === 0) return null;
  const families = new Map<string, number>();
  for (const program of programs) {
    const family = programFamily(program);
    families.set(family, (families.get(family) ?? 0) + 1);
  }
  return Array.from(families, ([family, count]) =>
    count === 1 ? family : `${family} (${count} jurisdictions)`
  ).join(" · ");
}
