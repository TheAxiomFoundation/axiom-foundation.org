import Link from "next/link";
import type { BrowsePageData } from "@/lib/axiom/browse-page";

/**
 * v2 browse page — the levels above a section (jurisdiction, doc
 * type, title) rendered in the reader's visual language: breadcrumb
 * row, a quiet header, and a single reading-width list of children.
 * Search lives in the nav's top right. Bare citation-path hrefs are canonical;
 * the proxy sends section depth to the reader and browse depth back
 * here.
 */

function Breadcrumbs({ data }: { data: BrowsePageData }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-[var(--color-ink-muted)]">
        {data.breadcrumbs.map((item, index) => (
          <li key={item.href} className="flex items-center gap-1">
            {index > 0 && <span aria-hidden>/</span>}
            {index === data.breadcrumbs.length - 1 ? (
              <span
                aria-current="page"
                className="text-[var(--color-ink-secondary)]"
              >
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="hover:text-[var(--color-ink)] transition-colors"
              >
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function BrowseView({ data }: { data: BrowsePageData }) {
  const heading =
    data.currentRule?.heading?.trim() ||
    (data.segments.length === 1
      ? data.jurisdictionLabel
      : data.breadcrumbs.at(-1)?.label ?? data.segments.at(-1));
  const basePath = data.segments.join("/");

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-24 pb-16">
      <div className="mb-4">
        <Breadcrumbs data={data} />
      </div>

      <header className="border-b border-[var(--color-rule)] pb-5">
        <p className="font-mono text-[12px] uppercase tracking-wider text-[var(--color-ink-muted)]">
          {basePath}
        </p>
        <h1
          className="mt-2 text-2xl font-semibold text-[var(--color-ink)]"
          style={{ fontFamily: "var(--f-serif)" }}
        >
          {heading}
        </h1>
      </header>

      {data.nodes.length === 0 ? (
        <p className="mt-8 text-sm text-[var(--color-ink-muted)] leading-relaxed">
          Nothing has been ingested at this level yet.
        </p>
      ) : (
        <ol data-testid="browse-list" className="mt-6 space-y-0.5">
          {data.nodes.map((node) => (
            <li key={node.segment}>
              <Link
                href={`/${basePath}/${node.segment}`}
                className="group flex items-baseline justify-between gap-3 rounded-sm px-2 py-2 no-underline transition-colors hover:bg-[var(--color-rule)]/30"
              >
                <span className="min-w-0 truncate text-sm text-[var(--color-ink-secondary)] group-hover:text-[var(--color-ink)]">
                  {node.label}
                </span>
                <span className="flex shrink-0 items-baseline gap-2 font-mono text-[10px] text-[var(--color-ink-muted)]">
                  {node.hasRuleSpec && (
                    <span
                      className="text-[var(--color-accent)]"
                      title="Has RuleSpec encodings"
                    >
                      encoded
                    </span>
                  )}
                  {typeof node.childCount === "number" &&
                    node.childCount > 0 && <span>{node.childCount}</span>}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
      {data.hasMore && (
        <p className="mt-4 font-mono text-[11px] uppercase tracking-wider text-[var(--color-ink-muted)]">
          Showing the first {data.nodes.length} — use ⌘K to jump directly.
        </p>
      )}
    </div>
  );
}
