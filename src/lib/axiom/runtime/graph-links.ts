/**
 * Deep links from a section page into the rule-graph viewer — the
 * interim section→graph bridge until the DAG pane lands in-app (F3).
 * The viewer accepts ?program=<jurisdiction>/<program_id> to select a
 * program and ?focus=<fileLegalId prefix> to pre-select the rules
 * derived from the provision the reader came from.
 *
 * Pure module: safe to import from client components.
 */

const DEFAULT_VIEWER_BASE = "https://rulespec-graph-viewer.vercel.app";

const CITATION_TO_REPO_BUCKET: Readonly<Record<string, string>> =
  Object.freeze({
    statute: "statutes",
    regulation: "regulations",
    policy: "policies",
  });

/**
 * Engine fileLegalId prefix for a corpus citation path:
 * ``us/statute/7/2017`` → ``us:statutes/7/2017``. Mirrors the repo
 * naming rules (plural buckets; federal-regulation titles carry the
 * ``-cfr`` suffix the corpus drops).
 */
export function graphFocusForCitationPath(
  citationPath: string
): string | null {
  const segments = citationPath.split("/").filter(Boolean);
  if (segments.length < 3) return null;
  const [slug, docType, ...rest] = segments;
  const bucket = CITATION_TO_REPO_BUCKET[docType] ?? docType;
  if (
    slug === "us" &&
    docType === "regulation" &&
    rest[0] &&
    !rest[0].endsWith("-cfr")
  ) {
    rest[0] = `${rest[0]}-cfr`;
  }
  return `${slug}:${bucket}/${rest.join("/")}`;
}

/**
 * Full legal ID for one rule: repo file path (already bucket-rooted,
 * ``-cfr`` included where applicable) + ``#`` + rule name. This is
 * the ``?focus=`` form that selects a single node in the viewer.
 */
export function ruleGraphFocus(
  jurisdictionSlug: string,
  filePath: string,
  ruleName: string
): string {
  return `${jurisdictionSlug}:${filePath.replace(/\.yaml$/, "")}#${ruleName}`;
}

const DEFAULT_BUILDER_BASE = "https://dashboard-builder-flax.vercel.app";

/**
 * Deep link into the dashboard builder with this rule preselected as
 * an output — "use this encoding in a calculator". The builder
 * resolves which curated program contains the rule, so no program
 * coordinates are needed here.
 */
export function builderUrlForRule(ruleLegalId: string): string {
  const base = (
    process.env.NEXT_PUBLIC_BUILDER_URL ?? DEFAULT_BUILDER_BASE
  ).replace(/\/$/, "");
  return `${base}/?output=${encodeURIComponent(ruleLegalId)}`;
}

export function graphViewerUrl(
  program: { jurisdiction: string; programId: string },
  focus: string | null
): string {
  const base = (
    process.env.NEXT_PUBLIC_GRAPH_VIEWER_URL ?? DEFAULT_VIEWER_BASE
  ).replace(/\/$/, "");
  const params = new URLSearchParams();
  const country = program.jurisdiction.split("-")[0];
  if (country && country !== "us") params.set("country", country);
  params.set("program", `${program.jurisdiction}/${program.programId}`);
  if (focus) params.set("focus", focus);
  return `${base}/?${params.toString()}`;
}
