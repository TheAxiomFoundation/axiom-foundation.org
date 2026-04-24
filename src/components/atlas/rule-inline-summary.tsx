"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { Rule, RuleReference } from "@/lib/supabase";
import { RuleBody } from "./rule-body";

interface RuleInlineSummaryProps {
  rule: Rule;
  /**
   * The rule's ingested children (if any). At container rules we
   * render them as an outline + atomic preview blocks so the reader
   * can see the structure instead of a 10k-char wall of prose.
   */
  children: Rule[];
  /**
   * Outgoing references for this rule. When we render the full body
   * via RuleBody (stub-body or ``?mark=`` present), the refs are
   * spliced as inline citation links.
   */
  outgoingRefs?: RuleReference[];
}

/**
 * Returns true when a rule's own body is essentially just its label
 * ("(d) Married individuals", "(2) Limitation", …) with no
 * substantive prose. Strips the "(id)" prefix + any repeated heading
 * before checking what's left, so a rule with a real sentence is
 * not misclassified just because it's short.
 */
function isStubBody(rule: Rule): boolean {
  const body = rule.body?.replace(/\s+/g, " ").trim();
  if (!body) return true;
  const tail = rule.citation_path?.split("/").pop() ?? "";
  let stripped = body;
  if (tail) {
    const re = new RegExp(
      `^\\(\\s*${tail.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}\\s*\\)\\s*`,
      "i"
    );
    stripped = stripped.replace(re, "");
  }
  const heading = rule.heading?.trim();
  if (heading && stripped.toLowerCase().startsWith(heading.toLowerCase())) {
    stripped = stripped.slice(heading.length);
  }
  return stripped.trim().length < 20;
}

function trimBodyTail(tail: string): string {
  return tail.trim().replace(/^[\s—–-]+/, "").trim();
}

/**
 * Short label + cleaned body for a child rule rendered inline on the
 * parent page. We strip the leading "(id) heading" prefix from body
 * so we don't repeat the label beside its content.
 */
function childReaderChunk(child: Rule): {
  id: string;
  label: string;
  body: string;
} {
  const tail = child.citation_path?.split("/").pop() ?? "";
  const heading = child.heading?.trim() ?? "";
  const id = tail || "·";
  let body = (child.body ?? "").trim();
  const idRe = new RegExp(
    `^\\(\\s*${id.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}\\s*\\)\\s*`,
    "i"
  );
  body = body.replace(idRe, "");
  if (heading && body.toLowerCase().startsWith(heading.toLowerCase())) {
    body = body.slice(heading.length);
  }
  body = trimBodyTail(body);
  return { id, label: heading || `(${id})`, body };
}

const PREVIEW_CHAR_LIMIT = 320;

function truncatePreview(text: string): { preview: string; truncated: boolean } {
  if (text.length <= PREVIEW_CHAR_LIMIT) {
    return { preview: text, truncated: false };
  }
  const cut = text.slice(0, PREVIEW_CHAR_LIMIT);
  const lastSpace = cut.lastIndexOf(" ");
  const stop = lastSpace > PREVIEW_CHAR_LIMIT * 0.6 ? lastSpace : PREVIEW_CHAR_LIMIT;
  return { preview: cut.slice(0, stop).trimEnd() + "…", truncated: true };
}

function RuleOutline({
  childRules,
}: {
  childRules: Rule[];
}) {
  const items = childRules
    .map((child) => {
      const tail = child.citation_path?.split("/").pop() ?? "";
      return {
        id: child.id,
        tail,
        href: `/atlas/${child.citation_path ?? ""}`,
        heading: child.heading?.trim() || "Untitled",
        hasRac: child.has_rac,
      };
    })
    .filter((item) => item.tail.length > 0 && item.href !== "/atlas/");

  if (items.length === 0) return null;

  return (
    <nav
      aria-label="Subsections"
      className="mb-6 px-5 py-4 bg-[var(--color-paper)] border border-[var(--color-rule)] rounded-md"
    >
      <div className="flex items-baseline justify-between mb-3 gap-4">
        <span className="eyebrow">In this section</span>
        <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)]">
          {items.length} subsection{items.length === 1 ? "" : "s"}
        </span>
      </div>
      <ol className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 m-0 p-0 list-none">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className="group flex items-baseline gap-2 py-1 text-sm text-[var(--color-ink-secondary)] no-underline hover:text-[var(--color-accent)] transition-colors"
            >
              <span className="shrink-0 font-mono text-xs text-[var(--color-accent)] tabular-nums">
                ({item.tail})
              </span>
              <span className="truncate">{item.heading}</span>
              {item.hasRac && (
                <span
                  aria-hidden="true"
                  className="ml-auto shrink-0 font-mono text-[10px] text-[var(--color-accent)] border border-[var(--color-accent)] rounded px-1 py-px uppercase tracking-wider"
                >
                  RAC
                </span>
              )}
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  );
}

function ChildPreview({ child }: { child: Rule }) {
  const chunk = childReaderChunk(child);
  const { preview, truncated } = truncatePreview(chunk.body);
  const href = `/atlas/${child.citation_path ?? ""}`;
  const isEmptyPreview = preview.trim().length === 0;

  return (
    <section className="flex gap-5">
      <Link
        href={href}
        aria-label={`Open ${chunk.id}`}
        className="shrink-0 pt-[0.35em] font-mono text-xs text-[var(--color-accent)] tabular-nums no-underline hover:underline decoration-[var(--color-accent)]"
      >
        ({chunk.id})
      </Link>
      <div className="flex-1 min-w-0">
        {chunk.label && (
          <Link
            href={href}
            className="block mb-1 font-medium text-[var(--color-ink)] no-underline hover:text-[var(--color-accent)] transition-colors"
            style={{ fontFamily: "var(--f-serif)" }}
          >
            {chunk.label}
          </Link>
        )}
        {!isEmptyPreview && (
          <p
            className="m-0 text-[1rem] leading-[1.8] text-[var(--color-ink-secondary)] whitespace-pre-wrap"
            style={{ fontFamily: "var(--f-serif)" }}
          >
            {preview}
          </p>
        )}
        {(truncated || isEmptyPreview) && (
          <Link
            href={href}
            className="inline-flex items-center gap-1 mt-2 font-mono text-[11px] uppercase tracking-wider text-[var(--color-accent)] no-underline hover:underline"
          >
            {isEmptyPreview ? "Open subsection" : "Continue reading"}
            <span aria-hidden="true">→</span>
          </Link>
        )}
      </div>
    </section>
  );
}

/**
 * Container-rule hero content. Shows:
 *   - an atomic outline of the rule's children (each one a drill-in
 *     link), and
 *   - by default, per-child preview blocks (first ~320 chars +
 *     "Continue reading →"), so the page reads as a structured table
 *     of contents rather than a wall of prose.
 *
 * When a ``?mark=`` query is present (e.g. from an incoming-reference
 * click), we flip to rendering the rule's full body via ``RuleBody``
 * — so the cited passage can still scroll into view and highlight.
 * That's the only mode where mark makes sense: the offsets in the DB
 * index into the parent's body, which is the concatenation of child
 * subsections, so we can't reliably translate them to any single
 * child preview.
 *
 * For rules whose own body is just a label stub ("(d) Married
 * individuals"), we fall through to a condensed chunk view of each
 * child's body inline — this is a different code path from the
 * browsable outline, used when the rule has children but no
 * structural outline to surface.
 */
export function RuleInlineSummary({
  rule,
  children,
  outgoingRefs,
}: RuleInlineSummaryProps) {
  const searchParams = useSearchParams();
  const hasMark = !!searchParams?.get("mark");
  const bodyIsStub = isStubBody(rule);

  const showFullBody = hasMark && !bodyIsStub && !!rule.body;
  const showChildPreviews = !showFullBody && children.length > 0;

  return (
    <div data-testid="rule-inline-summary" className="max-w-[720px]">
      {children.length > 0 && <RuleOutline childRules={children} />}

      {showFullBody && rule.body && (
        <RuleBody body={rule.body} refs={outgoingRefs ?? []} />
      )}

      {showChildPreviews && (
        <div className="space-y-8">
          {children.map((child) => (
            <ChildPreview key={child.id} child={child} />
          ))}
        </div>
      )}

      {/* Fallback: no children, substantive body — just render it. */}
      {children.length === 0 && !bodyIsStub && rule.body && (
        <RuleBody body={rule.body} refs={outgoingRefs ?? []} />
      )}
    </div>
  );
}
