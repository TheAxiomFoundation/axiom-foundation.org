"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ViewerDocument } from "@/lib/axiom-utils";
import type { RuleReference } from "@/lib/supabase";
import { RuleBody } from "./rule-body";
import {
  refsForSubsection,
  splitBodyIntoSubsections,
  type BodySubsection,
} from "@/lib/axiom/body-subsections";

/* v8 ignore start -- markdown table parsing, tested via integration */
function parseMarkdownTable(tableLines: string[]): {
  headers: string[];
  rows: string[][];
} | null {
  if (tableLines.length < 3) return null;

  const parseLine = (line: string) =>
    line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());

  const headers = parseLine(tableLines[0]);
  // Verify separator line
  const sep = tableLines[1];
  if (!/^\|[\s-|]+\|$/.test(sep)) return null;

  const rows = tableLines.slice(2).map(parseLine);
  return { headers, rows };
}

function RichText({ text }: { text: string }) {
  const lines = text.split("\n");
  const segments: Array<
    { type: "text"; content: string } | { type: "table"; headers: string[]; rows: string[][] }
  > = [];

  let i = 0;
  while (i < lines.length) {
    if (lines[i].startsWith("|") && i + 2 < lines.length && lines[i + 1].startsWith("|")) {
      // Collect consecutive table lines
      const tableStart = i;
      while (i < lines.length && lines[i].startsWith("|")) {
        i++;
      }
      const table = parseMarkdownTable(lines.slice(tableStart, i));
      if (table) {
        segments.push({ type: "table", ...table });
      } else {
        segments.push({ type: "text", content: lines.slice(tableStart, i).join("\n") });
      }
    } else {
      const textStart = i;
      while (i < lines.length && !lines[i].startsWith("|")) {
        i++;
      }
      segments.push({ type: "text", content: lines.slice(textStart, i).join("\n") });
    }
  }

  return (
    <div
      className="text-[1rem] text-[var(--color-ink-secondary)] leading-[1.8]"
      style={{ fontFamily: "var(--f-serif)" }}
    >
      {segments.map((seg, idx) => {
        if (seg.type === "text") {
          return (
            <p key={idx} className="whitespace-pre-wrap m-0">
              {seg.content}
            </p>
          );
        }
        return (
          <div key={idx} className="my-4 overflow-x-auto">
            <table className="border-collapse text-sm w-full">
              <thead>
                <tr className="border-b border-[var(--color-rule)]">
                  {seg.headers.map((h, hi) => (
                    <th
                      key={hi}
                      className="text-left px-3 py-2 text-[var(--color-ink-muted)] font-mono text-xs uppercase tracking-wider font-normal"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {seg.rows.map((row, ri) => (
                  <tr
                    key={ri}
                    className="border-b border-[var(--color-rule)] last:border-0"
                  >
                    {row.map((cell, ci) => (
                      <td
                        key={ci}
                        className="px-3 py-2 text-[var(--color-ink-secondary)]"
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
/* v8 ignore stop */

/**
 * Render a body-derived subsection list with a TOC at the top. Each
 * labelled subsection becomes its own anchored block so the TOC
 * links can scroll-jump within the page. Refs are re-offset per
 * subsection so citation splicing keeps working block-by-block.
 */
function BodySubsectionView({
  subsections,
  refs,
}: {
  subsections: BodySubsection[];
  refs: RuleReference[];
}) {
  const labelled = subsections.filter((s) => s.label !== null);
  return (
    <div>
      {labelled.length > 1 && (
        <nav
          aria-label="Subsections in this section"
          className="mb-8 px-5 py-4 bg-[var(--color-paper)] border border-[var(--color-rule)] rounded-md"
        >
          <div className="flex items-baseline justify-between mb-3 gap-4">
            <span className="eyebrow">In this section</span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)]">
              {labelled.length} subsection{labelled.length === 1 ? "" : "s"}
            </span>
          </div>
          <ul className="flex flex-wrap gap-x-3 gap-y-2 m-0 p-0 list-none">
            {labelled.map((s) => (
              <li key={s.label!}>
                <a
                  href={`#sub-${s.label}`}
                  className="font-mono text-xs text-[var(--color-accent)] no-underline hover:underline focus-visible:underline"
                >
                  ({s.label})
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
      <div className="space-y-7">
        {subsections.map((s, i) => (
          <section
            key={s.label ?? `lead-${i}`}
            id={s.label ? `sub-${s.label}` : undefined}
            className="scroll-mt-8"
          >
            <RuleBody body={s.text} refs={refsForSubsection(s, refs)} />
          </section>
        ))}
      </div>
    </div>
  );
}

export function SourceTab({
  document,
  outgoingRefs,
}: {
  document: ViewerDocument;
  outgoingRefs?: RuleReference[];
}) {
  const [hoveredSection, setHoveredSection] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // When the rule has a raw body (leaf rule), render it verbatim so any
  // outgoing citation refs slot in at their true offsets as inline links.
  // The existing subsection list is a fallback for rules whose content
  // lives in children.
  const renderInline = !!document.body;

  // Body-derived subsections: regulations whose corpus rows have no
  // children but whose body text carries CFR-style ``(a)``/``(b)``/...
  // labels. Pulling that structure out of the body itself gives the
  // reader a navigable subsection TOC even when corpus ingestion
  // didn't materialise the subsections as separate rows.
  const bodySubsections = useMemo(
    () => (document.body ? splitBodyIntoSubsections(document.body) : null),
    [document.body]
  );

  useEffect(() => {
    const target = document.highlightedSubsection;
    if (!target) return;
    const root = rootRef.current;
    if (!root) return;
    const el = root.querySelector(`[data-subsection-id="${target}"]`);
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ block: "center", behavior: "instant" });
    }
  }, [document.highlightedSubsection]);

  return (
    <div ref={rootRef} className="max-w-[720px] mx-auto">
      {document.contextText && (
        <aside
          data-testid="context-intro"
          className="mb-8 pl-5 border-l-2 border-[var(--color-rule)] italic text-[0.95rem] leading-relaxed text-[var(--color-ink-muted)]"
        >
          <RichText text={document.contextText} />
        </aside>
      )}

      {renderInline && bodySubsections ? (
        <BodySubsectionView
          subsections={bodySubsections}
          refs={outgoingRefs ?? []}
        />
      ) : renderInline ? (
        <RuleBody body={document.body!} refs={outgoingRefs ?? []} />
      ) : (
        <div className="space-y-7">
          {document.subsections.map((subsection) => {
            const isHighlighted =
              document.highlightedSubsection === subsection.id;
            const isHovered = hoveredSection === subsection.id;
            const containerClass = isHighlighted
              ? "flex gap-5 -mx-5 px-5 py-2 border-l-2 border-[var(--color-accent)] bg-[var(--color-accent-light)] rounded-r"
              : "flex gap-5 py-1 transition-colors";
            return (
              <section
                key={subsection.id}
                data-subsection-id={subsection.id}
                className={containerClass}
                onMouseEnter={() => setHoveredSection(subsection.id)}
                onMouseLeave={() => setHoveredSection(null)}
              >
                <span
                  className={`shrink-0 font-mono text-xs pt-[0.35em] tabular-nums transition-colors ${
                    isHighlighted || isHovered
                      ? "text-[var(--color-accent)]"
                      : "text-[var(--color-ink-muted)]"
                  }`}
                  aria-hidden="true"
                >
                  ({subsection.id})
                </span>
                <div className="flex-1 min-w-0">
                  <RichText text={subsection.text} />
                </div>
              </section>
            );
          })}
        </div>
      )}

      {document.sourcePath && (
        <div className="mt-8 pt-4 border-t border-[var(--color-rule)]">
          <span className="font-mono text-xs text-[var(--color-ink-muted)]">
            Source:{" "}
          </span>
          <code className="font-mono text-xs text-[var(--color-accent)] break-all">
            {document.sourcePath}
          </code>
        </div>
      )}
    </div>
  );
}
