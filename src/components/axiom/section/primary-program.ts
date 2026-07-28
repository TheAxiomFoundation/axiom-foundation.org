import type { SectionPageData } from "@/lib/axiom/section-page";

/**
 * The one program context shared by Graph and Build for a section:
 * the strongest-coverage ready program (data.programs is
 * ruleCount-sorted). A single selection rule keeps every action on
 * the page addressing the same jurisdiction.
 */
export function primaryProgram(
  programs: SectionPageData["programs"]
): SectionPageData["programs"][number] | null {
  return (
    programs.find((program) => program.status === "ready") ??
    programs[0] ??
    null
  );
}
