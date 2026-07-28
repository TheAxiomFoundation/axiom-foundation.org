/**
 * Map calculate-trace sources onto the reading column. Trace entries
 * carry legal-id sources ("us:statutes/7/2017/a#snap_allotment");
 * relative to the section being read (its file-legal-id prefix,
 * "us:statutes/7/2017"), each source resolves to the top-level
 * subsection anchor it sits under — the hook the trace overlay hangs
 * computed values on.
 */

export interface TraceEntry {
  rule_id: string;
  variable: string;
  value: number | string | boolean | null;
  sources: string[];
}

/**
 * Top-level subsection anchor for one source, or null when the
 * source is outside the section (or at its root).
 */
export function anchorForTraceSource(
  source: string,
  sectionFocus: string
): string | null {
  const file = source.split("#")[0];
  if (!file.startsWith(`${sectionFocus}/`)) return null;
  const segment = file.slice(sectionFocus.length + 1).split("/")[0];
  return /^[a-z]{1,2}$/.test(segment) ? segment : null;
}

/** Trace entries grouped by the subsection anchor they trace to. */
export function traceByAnchor(
  trace: TraceEntry[],
  sectionFocus: string | null
): Map<string, TraceEntry[]> {
  const byAnchor = new Map<string, TraceEntry[]>();
  if (!sectionFocus) return byAnchor;
  for (const entry of trace) {
    const anchors = new Set<string>();
    for (const source of entry.sources) {
      const anchor = anchorForTraceSource(source, sectionFocus);
      if (anchor) anchors.add(anchor);
    }
    for (const anchor of anchors) {
      const list = byAnchor.get(anchor);
      if (list) list.push(entry);
      else byAnchor.set(anchor, [entry]);
    }
  }
  return byAnchor;
}
