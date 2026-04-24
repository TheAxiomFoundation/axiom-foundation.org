"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSiblings } from "@/lib/atlas/resolver";
import type { Rule } from "@/lib/supabase";

interface SiblingStripProps {
  rule: Rule;
}

/**
 * Lateral-navigation strip for a rule view. Loads same-parent
 * siblings, highlights the current one, and binds ← / → keyboard
 * shortcuts for prev/next hops — the natural reading flow for legal
 * subsections.
 *
 * Keys fire only when no editable element is focused, so typing in
 * the command palette or a future inline editor won't hijack them.
 * The palette's own dialog captures its own arrow keys before they
 * bubble to the window, so there's no conflict with ⌘K navigation.
 */
export function SiblingStrip({ rule }: SiblingStripProps) {
  const router = useRouter();
  const [siblings, setSiblings] = useState<Rule[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSiblings(rule)
      .then((rows) => {
        if (!cancelled) setSiblings(rows);
      })
      .catch(() => {
        // A transient supabase failure should degrade the strip to
        // "no siblings shown", not blow up the page.
        if (!cancelled) setSiblings([]);
      });
    return () => {
      cancelled = true;
    };
  }, [rule]);

  const index =
    siblings?.findIndex((s) => s.citation_path === rule.citation_path) ?? -1;
  const prev = index > 0 ? siblings?.[index - 1] : null;
  const next =
    siblings && index >= 0 && index < siblings.length - 1
      ? siblings[index + 1]
      : null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (
          tag === "INPUT" ||
          tag === "TEXTAREA" ||
          target.isContentEditable
        ) {
          return;
        }
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowLeft" && prev?.citation_path) {
        e.preventDefault();
        router.push(`/atlas/${prev.citation_path}`);
      } else if (e.key === "ArrowRight" && next?.citation_path) {
        e.preventDefault();
        router.push(`/atlas/${next.citation_path}`);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next, router]);

  if (!siblings || siblings.length <= 1 || index < 0) {
    return null;
  }

  // Windowed view: show up to 3 before and 3 after the current rule.
  const WINDOW = 3;
  const start = Math.max(0, index - WINDOW);
  const end = Math.min(siblings.length, index + WINDOW + 1);
  const slice = siblings.slice(start, end);
  const hasLeftOverflow = start > 0;
  const hasRightOverflow = end < siblings.length;

  return (
    <nav
      aria-label="Sibling rules"
      className="flex items-center gap-2 px-6 py-2 border-b border-[var(--color-rule)] bg-[var(--color-paper)] overflow-x-auto"
    >
      {prev?.citation_path ? (
        <Link
          href={`/atlas/${prev.citation_path}`}
          aria-label="Previous sibling"
          className="inline-flex items-center justify-center w-7 h-7 shrink-0 rounded border border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:outline-offset-2"
        >
          <svg
            viewBox="0 0 20 20"
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 15l-5-5 5-5" />
          </svg>
        </Link>
      ) : (
        <span
          aria-hidden="true"
          className="inline-block w-7 h-7 shrink-0 rounded border border-[var(--color-rule-subtle)]"
        />
      )}

      {hasLeftOverflow && (
        <span className="font-mono text-xs text-[var(--color-ink-muted)]">
          …
        </span>
      )}

      <ol className="flex items-center gap-1 m-0 p-0 list-none">
        {slice.map((sib) => {
          const isCurrent = sib.citation_path === rule.citation_path;
          const label = siblingLabel(sib);
          if (isCurrent) {
            return (
              <li key={sib.id}>
                <span
                  aria-current="true"
                  className="inline-flex items-center px-2 py-0.5 font-mono text-xs text-[var(--color-accent)] border border-[var(--color-accent)] bg-[var(--color-accent-light)] rounded-sm whitespace-nowrap"
                >
                  {label}
                </span>
              </li>
            );
          }
          return (
            <li key={sib.id}>
              <Link
                href={`/atlas/${sib.citation_path ?? ""}`}
                className="inline-flex items-center px-2 py-0.5 font-mono text-xs text-[var(--color-ink-muted)] border border-[var(--color-rule)] bg-transparent rounded-sm whitespace-nowrap hover:text-[var(--color-accent)] hover:border-[var(--color-accent)] transition-colors focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:outline-offset-2"
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ol>

      {hasRightOverflow && (
        <span className="font-mono text-xs text-[var(--color-ink-muted)]">
          …
        </span>
      )}

      {next?.citation_path ? (
        <Link
          href={`/atlas/${next.citation_path}`}
          aria-label="Next sibling"
          className="inline-flex items-center justify-center w-7 h-7 shrink-0 rounded border border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:outline-offset-2"
        >
          <svg
            viewBox="0 0 20 20"
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M8 5l5 5-5 5" />
          </svg>
        </Link>
      ) : (
        <span
          aria-hidden="true"
          className="inline-block w-7 h-7 shrink-0 rounded border border-[var(--color-rule-subtle)]"
        />
      )}

      <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)] whitespace-nowrap">
        {index + 1} of {siblings.length}
      </span>
    </nav>
  );
}

/**
 * Best-effort short label for a sibling button — the last segment of
 * the citation_path so ``us/statute/26/32/b/1`` renders as ``1``,
 * ``us/statute/26/32`` renders as ``§32``. Statute-section siblings
 * get a ``§`` prefix to read naturally; subsections stay bare.
 */
function siblingLabel(rule: Rule): string {
  const path = rule.citation_path ?? "";
  const parts = path.split("/").filter(Boolean);
  if (parts.length === 0) return rule.heading || "—";
  const tail = parts[parts.length - 1];
  // Top-level sections under a statute title read better with "§".
  if (parts.length === 4 && parts[1] === "statute") {
    return `§ ${tail}`;
  }
  return tail;
}
