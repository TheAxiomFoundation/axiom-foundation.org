import ukLegalNames from "./uk-legal-names.json";

/**
 * Display names for UK acts and statutory instruments.
 *
 * The UK corpus release ships provision leaves only — no container
 * rows — so the navigation index has nothing to label act-level
 * browse nodes or breadcrumbs with, and readers see "Ukpga / 1992 /
 * 4" where legislation.gov.uk would say "Social Security
 * Contributions and Benefits Act 1992". This registry names every
 * act/instrument the corpus currently touches; each title was taken
 * from the legislation.gov.uk data API for that instrument
 * (https://www.legislation.gov.uk/<class>/<year>/<number>/data.xml,
 * dc:title). It is a display-layer stopgap: once the corpus release
 * carries labelled container rows, rows win and this map retires.
 *
 * Keys are `<class>/<year>/<number>` (`ukpga/1992/4`).
 */
const NAMES: Record<string, string> = ukLegalNames;

/** legislation.gov.uk document classes the UK corpus uses. */
export const UK_LEGISLATION_CLASSES = new Set([
  "ukpga",
  "asp",
  "anaw",
  "uksi",
  "ssi",
  "wsi",
]);

/** Standard legislation.gov.uk names for its document classes. */
export const UK_DOC_CLASS_LABELS: Record<string, string> = {
  ukpga: "Public General Acts",
  asp: "Acts of the Scottish Parliament",
  anaw: "Acts of the National Assembly for Wales",
  uksi: "UK Statutory Instruments",
  ssi: "Scottish Statutory Instruments",
  wsi: "Welsh Statutory Instruments",
};

/**
 * The act/instrument title for a UK citation path (or path prefix)
 * of the form `uk/<doc type>/<class>/<year>/<number>[/...]`.
 * Returns null when the path is not act-deep or the instrument is
 * not in the registry.
 */
export function ukInstrumentNameForPath(
  citationPath: string
): string | null {
  const parts = citationPath.split("/");
  if (parts[0] !== "uk" || parts.length < 5) return null;
  if (!UK_LEGISLATION_CLASSES.has(parts[2])) return null;
  return NAMES[`${parts[2]}/${parts[3]}/${parts[4]}`] ?? null;
}

/**
 * Label for one UK path segment given its position, used by
 * breadcrumbs and browse rows: the doc class expands to its
 * legislation.gov.uk name, the instrument number to the registered
 * title. Segments this can't improve return null so callers keep
 * their existing formatting.
 */
export function ukSegmentLabel(
  segments: string[],
  index: number
): string | null {
  // segments are full URL segments: ["uk", "statute", "ukpga", "1992", "4", ...]
  if (segments[0] !== "uk") return null;
  const cls = segments[2];
  if (!cls || !UK_LEGISLATION_CLASSES.has(cls)) return null;
  if (index === 2) return UK_DOC_CLASS_LABELS[cls] ?? null;
  if (index === 4) {
    return ukInstrumentNameForPath(segments.slice(0, 5).join("/"));
  }
  return null;
}

/** Registry label for the node a citation path points at, or null. */
export function ukLabelForPath(citationPath: string): string | null {
  const segments = citationPath.split("/");
  return ukSegmentLabel(segments, segments.length - 1);
}
