import type { RuleReference } from "@/lib/supabase";

/**
 * One top-level subsection extracted from a regulation/statute body.
 * Bodies stored in ``corpus.provisions`` carry CFR/USC-style ``(a)``,
 * ``(b)``, ``(c)``… labels at paragraph starts but the corpus tree
 * doesn't always have separate rows for them. This module pulls the
 * structure out of the body itself so the source-text panel can
 * render a navigable subsection list without depending on extra
 * corpus ingestion.
 */
export interface BodySubsection {
  /** ``a``, ``b``, ``1``, ``i`` … (no parentheses). ``null`` for
   *  any leading prose that appears before the first label. */
  label: string | null;
  /** Verbatim text — paragraphs separated by ``\n\n`` exactly as
   *  they appeared in the original body. */
  text: string;
  /** Byte offset of this subsection's first character in the
   *  original body. Used to re-offset citation references when each
   *  subsection is rendered as its own ``RuleBody`` block. */
  offset: number;
}

const LABEL_RE = /(^|\n\n)\(([a-z0-9]{1,3})\)\s/gi;

/**
 * Split a body into top-level CFR-labelled subsections. Returns
 * ``null`` when fewer than two top-level labels are found — the
 * caller then falls back to inline rendering since there's no
 * meaningful TOC to build.
 */
export function splitBodyIntoSubsections(
  body: string
): BodySubsection[] | null {
  if (!body) return null;
  type Match = { index: number; label: string };
  const matches: Match[] = [];
  for (const m of body.matchAll(LABEL_RE)) {
    if (m.index == null) continue;
    // ``index`` points at the ``\n\n`` (or BOF). Move it forward to
    // the ``(`` so the slice starts at the actual label.
    const labelStart = m[1].length === 0 ? m.index : m.index + m[1].length;
    matches.push({ index: labelStart, label: m[2] });
  }
  if (matches.length < 2) return null;

  const out: BodySubsection[] = [];
  // Any prose before the first label becomes a labelless leading
  // chunk so it still renders.
  if (matches[0].index > 0) {
    const text = body.slice(0, matches[0].index).trim();
    if (text) out.push({ label: null, text, offset: 0 });
  }
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end = i + 1 < matches.length ? matches[i + 1].index : body.length;
    const text = body.slice(start, end).replace(/\n+$/, "");
    out.push({ label: matches[i].label, text, offset: start });
  }
  return out;
}

/**
 * Translate body-relative refs into per-subsection refs. Any ref
 * whose span sits cleanly inside a single subsection is preserved
 * with offsets rebased into that subsection. Refs that straddle a
 * subsection boundary are dropped — better to skip a citation link
 * than render a half-spliced one.
 */
export function refsForSubsection(
  subsection: BodySubsection,
  refs: RuleReference[]
): RuleReference[] {
  const out: RuleReference[] = [];
  const start = subsection.offset;
  const end = start + subsection.text.length;
  for (const ref of refs) {
    if (ref.start_offset < start) continue;
    if (ref.end_offset > end) continue;
    out.push({
      ...ref,
      start_offset: ref.start_offset - start,
      end_offset: ref.end_offset - start,
    });
  }
  return out;
}
