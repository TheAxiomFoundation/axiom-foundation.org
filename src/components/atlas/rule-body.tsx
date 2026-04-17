"use client";

import Link from "next/link";
import type { RuleReference } from "@/lib/supabase";

/**
 * Render a rule's body text with outgoing citations spliced in as
 * clickable links.
 *
 * The server-side extractor gives us ``(start_offset, end_offset)``
 * spans computed against the same body string stored in
 * ``akn.rules.body``, so splicing is a single pass: emit the
 * plain-text chunks between refs, wrap each ref's text in an anchor.
 *
 * Refs whose offsets fall outside the body (stale or mismatched),
 * whose spans overlap a previously emitted ref, or whose spans are
 * zero-width are silently skipped — better to lose a link than
 * render garbled text. splice() sorts its input, so the caller can
 * pass refs in any order.
 */

interface RuleBodyProps {
  body: string;
  refs: RuleReference[];
}

type Part =
  | { kind: "plain"; text: string; key: string }
  | { kind: "ref"; text: string; key: string; ref: RuleReference };

function splice(body: string, refs: RuleReference[]): Part[] {
  const parts: Part[] = [];
  let cursor = 0;
  // Sort defensively: the extractor guarantees disjoint spans, but a
  // resort (e.g. after a second fetch) could put the hook's cached
  // refs temporarily out of order during a render.
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
      parts.push({
        kind: "plain",
        text: body.slice(cursor, ref.start_offset),
        key: `plain-${cursor}`,
      });
    }
    parts.push({
      kind: "ref",
      text: body.slice(ref.start_offset, ref.end_offset),
      key: `ref-${ref.start_offset}-${ref.end_offset}`,
      ref,
    });
    cursor = ref.end_offset;
  }
  if (cursor < body.length) {
    parts.push({
      kind: "plain",
      text: body.slice(cursor),
      key: `plain-${cursor}`,
    });
  }
  return parts;
}

function Citation({ ref, text }: { ref: RuleReference; text: string }) {
  const href = `/atlas/${ref.other_citation_path}`;
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
  if (!body) return null;
  const parts = splice(body, refs);
  return (
    <div
      data-testid="rule-body-inline"
      className="text-[0.95rem] text-[var(--color-ink-secondary)] leading-[1.8] whitespace-pre-wrap"
      style={{ fontFamily: "var(--f-serif)" }}
    >
      {parts.map((part) =>
        part.kind === "ref" ? (
          <Citation key={part.key} ref={part.ref} text={part.text} />
        ) : (
          <span key={part.key}>{part.text}</span>
        )
      )}
    </div>
  );
}
