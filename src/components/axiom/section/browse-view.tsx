import Link from "next/link";
import type { BrowsePageData } from "@/lib/axiom/browse-page";

/** Source labels arrive in every shape — ALL-CAPS USC title names,
 *  section headings leaking into title rows. Title-case the shouty
 *  ones for display; the raw label stays in the tooltip. */
function displayLabel(label: string): string {
  const letters = label.replace(/[^A-Za-z]/g, "");
  if (letters.length > 4 && letters === letters.toUpperCase()) {
    return label
      .toLowerCase()
      .replace(/(^|[\s(-])([a-z])/g, (m, pre, ch) => pre + ch.toUpperCase());
  }
  return label;
}

/**
 * v2 browse page — the levels above a section (jurisdiction, doc
 * type, title) rendered in the reader's visual language: breadcrumb
 * row, a quiet header, and a single reading-width list of children.
 * Search lives in the nav's top right. Bare citation-path hrefs are canonical;
 * the proxy sends section depth to the reader and browse depth back
 * here.
 */

function Breadcrumbs({ data }: { data: BrowsePageData }) {
  // Ancestors only — the current level is the page title, not a
  // crumb. At /us that leaves just "Axiom".
  const ancestors = data.breadcrumbs.slice(0, -1);
  if (ancestors.length === 0) return null;
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-[var(--color-ink-muted)]">
        {ancestors.map((item, index) => (
          <li key={item.href} className="flex items-center gap-1.5">
            {index > 0 && <span aria-hidden>/</span>}
            <Link
              href={item.href}
              className="hover:text-[var(--color-ink)] transition-colors"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Transient-failure state: the URL is valid; the navigation index
 *  didn't answer in time. Distinct from notFound so crawlers and
 *  users never see a valid level as nonexistent. */
export function BrowseUnavailable({ path }: { path: string }) {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 pt-24 pb-16">
      <div
        data-testid="browse-unavailable"
        className="rounded-md border border-[var(--color-rule)] bg-[var(--color-paper-elevated)] p-8 text-center"
      >
        <p className="font-mono text-[11px] uppercase tracking-wider text-[var(--color-ink-muted)]">
          {path}
        </p>
        <p
          className="mt-3 text-base text-[var(--color-ink)]"
          style={{ fontFamily: "var(--f-serif)" }}
        >
          Navigation data is temporarily unavailable
        </p>
        <p className="mt-2 text-sm text-[var(--color-ink-muted)] leading-relaxed">
          The index didn't answer in time — this level exists, the
          backend hiccupped.
        </p>
        <a
          href={`/${path}`}
          className="mt-5 inline-block rounded border border-[var(--color-rule)] px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-[var(--color-ink-secondary)] no-underline hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors"
        >
          reload
        </a>
      </div>
    </div>
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
    <div className="mx-auto w-full max-w-2xl px-4 pt-24 pb-16">
      <div className="mb-10">
        <Breadcrumbs data={data} />
        <h1
          className="mt-5 text-3xl font-semibold text-[var(--color-ink)]"
          style={{ fontFamily: "var(--f-serif)" }}
        >
          {displayLabel(heading ?? "")}
        </h1>
      </div>

      {data.nodes.length === 0 ? (
        <p className="text-sm text-[var(--color-ink-muted)] leading-relaxed">
          Nothing has been ingested at this level yet.
        </p>
      ) : (
        <ol
          data-testid="browse-list"
          className="divide-y divide-[var(--color-rule)] border-t border-b border-[var(--color-rule)]"
        >
          {data.nodes.map((node) => {
            // A label that just repeats the segment carries no
            // information: bare numbers become "Title N" (statute/
            // regulation levels), and the number column only renders
            // when the label says something different.
            const raw = displayLabel(node.label);
            const bareNumber =
              raw === node.segment && /^\d/.test(node.segment);
            const label =
              bareNumber &&
              (data.segments[1] === "statute" ||
                data.segments[1] === "regulation")
                ? `Title ${node.segment}`
                : raw;
            const showChip =
              /\d/.test(node.segment) && label !== node.segment && !bareNumber;
            return (
              <li key={node.segment}>
                <Link
                  // Canonical citation-path hrefs where known: deep
                  // containers flatten children out of their own path
                  // (…/subpart-C lists …/1302/30), so appending the
                  // segment would 404.
                  href={
                    node.rule?.citation_path
                      ? `/${node.rule.citation_path}`
                      : `/${basePath}/${node.segment}`
                  }
                  title={node.label}
                  className="group flex items-baseline gap-4 py-3.5 no-underline"
                >
                  {showChip && (
                    <span className="w-12 shrink-0 text-right font-mono text-[12px] text-[var(--color-ink-muted)] group-hover:text-[var(--color-accent)] transition-colors">
                      {node.segment}
                    </span>
                  )}
                  <span className="min-w-0 flex-1 truncate text-[15px] text-[var(--color-ink-secondary)] group-hover:text-[var(--color-ink)] transition-colors">
                    {label}
                  </span>
                  <span className="flex shrink-0 items-baseline gap-3 font-mono text-[11px] text-[var(--color-ink-muted)]">
                    {node.hasRuleSpec && (
                      <span
                        className="text-[var(--color-accent)]"
                        title="Has RuleSpec encodings"
                      >
                        encoded
                      </span>
                    )}
                    <span
                      aria-hidden
                      className="text-[var(--color-ink-muted)] opacity-0 transition-opacity group-hover:opacity-100 group-hover:text-[var(--color-accent)]"
                    >
                      →
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
      {(data.hasMore || data.page > 0) && (
        <nav
          aria-label="Browse pages"
          className="mt-6 flex items-center justify-between font-mono text-[11px] uppercase tracking-wider"
        >
          {data.page > 0 ? (
            <Link
              href={`/${basePath}${data.page - 1 > 0 ? `?page=${data.page - 1}` : ""}`}
              className="text-[var(--color-ink-muted)] no-underline hover:text-[var(--color-accent)]"
            >
              ← previous
            </Link>
          ) : (
            <span />
          )}
          {data.hasMore && (
            <Link
              href={`/${basePath}?page=${data.page + 1}`}
              className="text-[var(--color-ink-muted)] no-underline hover:text-[var(--color-accent)]"
            >
              more →
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
