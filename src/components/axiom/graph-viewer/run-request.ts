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
