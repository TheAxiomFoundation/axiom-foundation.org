"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { RuleReference } from "@/lib/supabase";

/**
 * Render a rule's body text with outgoing citations spliced in as
 * clickable links.
 *
 * The server-side extractor gives us ``(start_offset, end_offset)``
 * spans computed against the same body string stored in
 * ``corpus.provisions.body``, so splicing is a single pass: emit the
 * plain-text chunks between refs, wrap each ref's text in an anchor.
 *
 * Refs whose offsets fall outside the body (stale or mismatched),
 * whose spans overlap a previously emitted ref, or whose spans are
 * zero-width are silently skipped — better to lose a link than
 * render garbled text. splice() sorts its input, so the caller can
 * pass refs in any order.
 *
 * A ``?mark=start-end`` query param (used by incoming-reference
 * clicks — see ReferencesPanel) triggers a highlighted ``<mark>``
 * wrapper around the matching byte range and a scroll-into-view on
 * mount so the reader lands on the exact citing passage.
 */

interface RuleBodyProps {
  body: string;
  refs: RuleReference[];
}

interface Range {
  start: number;
  end: number;
}

interface Segment {
  offset: number;
  text: string;
  kind: "plain" | "ref";
  ref?: RuleReference;
}

function spliceRefs(body: string, refs: RuleReference[]): Segment[] {
  const out: Segment[] = [];
  let cursor = 0;
  const sorted = [...refs].sort((a, b) => a.start_offset - b.start_offset);
  for (const ref of sorted) {
    if (
      ref.start_offset < cursor ||
      ref.end_offset > body.length ||
      ref.end_offset <= ref.start_offset
    ) {
      continue;
    }
    if (ref.start_offset > cursor) {
      out.push({
        offset: cursor,
        text: body.slice(cursor, ref.start_offset),
        kind: "plain",
      });
    }
    out.push({
      offset: ref.start_offset,
      text: body.slice(ref.start_offset, ref.end_offset),
      kind: "ref",
      ref,
    });
    cursor = ref.end_offset;
  }
  if (cursor < body.length) {
    out.push({
      offset: cursor,
      text: body.slice(cursor),
      kind: "plain",
    });
  }
  return out;
}

/**
 * Split any segment that straddles ``range`` into (pre, overlap, post)
 * so the overlapping slice can be wrapped in a ``<mark>``. Keeps the
 * segment's kind / ref intact across the split — a citation link that
 * happens to lie inside the marked range stays a citation link.
 */
function applyMark(segments: Segment[], range: Range | null): Array<Segment & { marked: boolean }> {
  if (!range) return segments.map((s) => ({ ...s, marked: false }));
  const out: Array<Segment & { marked: boolean }> = [];
  for (const seg of segments) {
    const end = seg.offset + seg.text.length;
    if (range.end <= seg.offset || range.start >= end) {
      out.push({ ...seg, marked: false });
      continue;
    }
    const ovStart = Math.max(range.start, seg.offset);
    const ovEnd = Math.min(range.end, end);
    const local = (p: number) => p - seg.offset;
    if (seg.offset < ovStart) {
      out.push({ ...seg, text: seg.text.slice(0, local(ovStart)), marked: false });
    }
    out.push({
      ...seg,
      offset: ovStart,
      text: seg.text.slice(local(ovStart), local(ovEnd)),
      marked: true,
    });
    if (ovEnd < end) {
      out.push({
        ...seg,
        offset: ovEnd,
        text: seg.text.slice(local(ovEnd)),
        marked: false,
      });
    }
  }
  return out;
}

function parseMark(raw: string | null): Range | null {
  if (!raw) return null;
  const m = raw.match(/^(\d+)-(\d+)$/);
  if (!m) return null;
  const start = Number(m[1]);
  const end = Number(m[2]);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) {
    return null;
  }
  return { start, end };
}

function Citation({ ref, text }: { ref: RuleReference; text: string }) {
  // Incoming refs carry offsets into the citing (target) body; pass them
  // through as a ``mark`` query so the target page lands on the exact
  // passage.
  const markQuery =
    ref.direction === "incoming"
      ? `?mark=${ref.start_offset}-${ref.end_offset}`
      : "";
  const href = `/axiom/${ref.other_citation_path}${markQuery}`;
  const title = ref.target_resolved
    ? `${ref.other_citation_path}${ref.other_heading ? ` — ${ref.other_heading}` : ""}`
    : `${ref.other_citation_path} — not yet ingested`;
  const classes = ref.target_resolved
    ? "text-[var(--color-accent)] underline decoration-[var(--color-rule)] underline-offset-2 hover:decoration-[var(--color-accent)] transition-colors"
    : "text-[var(--color-ink-secondary)] underline decoration-dotted decoration-[var(--color-rule)] underline-offset-2";
  return (
    <Link href={href} className={classes} title={title}>
      {text}
    </Link>
  );
}

export function RuleBody({ body, refs }: RuleBodyProps) {
  const searchParams = useSearchParams();
  const markString = searchParams?.get("mark") ?? null;
  const markRange = parseMark(markString);
  const firstMarkRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!markRange) return;
    const el = firstMarkRef.current;
    if (!el) return;
    // Defer one frame so layout has settled before we measure /
    // scroll — the body is rendered after a Supabase fetch and
    // the rail's sticky positioning can shift things mid-mount.
    const handle = window.requestAnimationFrame(() => {
      const headerOffset = 96; // nav bar height; scroll above the mark
      const rect = el.getBoundingClientRect();
      const top = window.scrollY + rect.top - headerOffset;
      window.scrollTo({ top, behavior: "smooth" });
      // Brief flash so the user clearly sees where they landed.
      el.classList.add("axiom-mark-flash");
      window.setTimeout(() => el.classList.remove("axiom-mark-flash"), 1600);
    });
    return () => window.cancelAnimationFrame(handle);
    // markString (a primitive) is the right dependency — the parsed
    // object would be a new reference every render and re-fire the
    // effect for no reason.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markString]);

  if (!body) return null;

  const segments = applyMark(
    spliceRefs(body, refs),
    markRange && markRange.end <= body.length ? markRange : null
  );

  // Precompute the index of the first marked segment so the ref
  // callback doesn't rely on a mutated closure variable during map
  // — cleaner under React 19's concurrent rendering.
  const firstMarkIndex = segments.findIndex((s) => s.marked);

  return (
    <div
      data-testid="rule-body-inline"
      className="text-[0.95rem] text-[var(--color-ink-secondary)] leading-[1.8] whitespace-pre-wrap"
      style={{ fontFamily: "var(--f-serif)" }}
    >
      {segments.map((seg, i) => {
        const inner =
          seg.kind === "ref" && seg.ref ? (
            <Citation ref={seg.ref} text={seg.text} />
          ) : (
            seg.text
          );
        if (!seg.marked) {
          return <span key={`${i}-${seg.offset}`}>{inner}</span>;
        }
        const isFirst = i === firstMarkIndex;
        return (
          <mark
            key={`${i}-${seg.offset}`}
            ref={(el) => {
              if (isFirst) firstMarkRef.current = el;
            }}
            className="axiom-mark bg-[rgba(146,64,14,0.18)] text-[var(--color-ink)] px-1 -mx-0.5 rounded-sm shadow-[0_0_0_1px_rgba(146,64,14,0.35)] decoration-[var(--color-accent)]"
          >
            {inner}
          </mark>
        );
      })}
    </div>
  );
}
