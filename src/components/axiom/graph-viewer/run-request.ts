import { fileLegalIdOf } from "./citations";

/**
 * The calculate request for a run: compose mode speaks the
 * run-by-root shape — every value the user typed travels verbatim
 * as `facts` — while package programs keep their coordinates and
 * `values`. One pure builder so the round trip is testable.
 */
export function buildRunRequestBody(
  composeFocus: string | null,
  program: { jurisdiction: string; programId: string } | null,
  scenario: Record<string, number | boolean>,
  variables: string[],
): Record<string, unknown> {
  if (composeFocus) {
    return {
      root: fileLegalIdOf(composeFocus),
      facts: scenario,
      variables,
    };
  }
  return {
    jurisdiction: program?.jurisdiction ?? "us",
    program_id: program?.programId ?? "",
    values: scenario,
    variables,
  };
}

/**
 * A stable identity for "the values a run computed": entries sorted
 * by name so insertion order never fakes an edit. The viewer keeps
 * the key of the LAST explicit run; a differing key of the current
 * scenario marks the results sheet stale — it never fires a run.
 */
export function scenarioKey(
  scenario: Record<string, number | boolean>,
): string {
  return JSON.stringify(
    Object.entries(scenario).sort(([a], [b]) => a.localeCompare(b)),
  );
}
