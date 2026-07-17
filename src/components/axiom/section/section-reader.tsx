import Link from "next/link";
import {
  refsForChunk,
  type BodyChunk,
  type SectionPageData,
  type SectionProvision,
} from "@/lib/axiom/section-page";
import { buildInlineReferences } from "@/lib/axiom/inline-references";
import { RuleBody } from "@/components/axiom/rule-body";
import { SectionToc } from "./section-toc";
import { FocusScroll } from "./focus-scroll";
import { EncodingRail } from "./encoding-rail";
import { CitationJump } from "./citation-jump";
import { CitationPreviewLayer } from "./citation-preview";
import { TraceProvider } from "./trace-context";
import { ChunkTraceChips } from "./chunk-trace";
import { SubsectionActions } from "./subsection-actions";
import {
  builderUrlForRule,
  graphFocusForCitationPath,
  graphViewerUrl,
  ruleGraphFocus,
} from "@/lib/axiom/runtime/graph-links";
import { formatLegalCitation } from "@/lib/axiom/citation/format";

/**
 * Server-rendered reading column for a section and its full
 * descendant subtree — the v2 replacement for the client-monolith
 * detail panel. Interactivity is limited to islands: RuleBody
 * (?mark= highlighting) and SectionToc (scroll-spy).
 */

function formatDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function Breadcrumbs({ data }: { data: SectionPageData }) {
  // Section-depth crumbs and deeper (jurisdiction/doctype/title/
  // section = 4+ segments) stay in the v2 reader; title and above go
  // to the v1 tree browser, which remains the browse surface until
  // v2 grows browse pages.
  const v2Href = (href: string) => {
    const path = href.replace(/^\//, "");
    return path.split("/").length >= 4 ? `/axiom/v2/${path}` : href;
  };
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-[var(--color-ink-muted)]">
        {data.breadcrumbs.map((item, index) => (
          <li key={item.href} className="flex items-center gap-1">
            {index > 0 && <span aria-hidden>/</span>}
            {index === data.breadcrumbs.length - 1 ? (
              <span aria-current="page" className="text-[var(--color-ink-secondary)]">
                {item.label}
              </span>
            ) : (
              <Link
                href={v2Href(item.href)}
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

function AnchorLink({ anchor }: { anchor: string }) {
  return (
    <a
      href={`#${anchor}`}
      aria-label={`Link to subsection ${anchor}`}
      className="opacity-0 transition-opacity group-hover:opacity-100 text-[var(--color-ink-muted)] hover:text-[var(--color-accent)] font-mono text-sm"
    >
      #
    </a>
  );
}

function ProvisionBlock({
  provision,
  citationPath,
  sectionFocus,
}: {
  provision: SectionProvision;
  citationPath: string;
  sectionFocus: string | null;
}) {
  const { rule, anchor, designator, relativeDepth } = provision;
  const heading = rule.heading?.trim();
  const HeadingTag = relativeDepth === 1 ? "h2" : "h3";
  return (
    <section id={anchor} className="group scroll-mt-24">
      <HeadingTag
        className={`flex items-baseline gap-2 text-[var(--color-ink)] ${
          relativeDepth === 1
            ? "mt-10 text-lg font-semibold"
            : "mt-6 text-base font-medium"
        }`}
      >
        <span className="font-mono text-[0.85em] text-[var(--color-ink-muted)]">
          {designator}
        </span>
        {heading && <span>{heading}</span>}
        <AnchorLink anchor={anchor} />
      </HeadingTag>
      {relativeDepth === 1 && (
        <ChunkTraceChips anchor={anchor} sectionFocus={sectionFocus} />
      )}
      {rule.body && (
        <div className="mt-2">
          <RuleBody
            hrefPrefix="/axiom/v2"
            body={rule.body}
            refs={[]}
            citationPath={rule.citation_path ?? undefined}
            testId={null}
          />
        </div>
      )}
    </section>
  );
}

/**
 * Chips tying a subsection to the rules that encode it. Each chip
 * scrolls the encoding rail to that rule's card (#rule-<name> —
 * RuleSpecTab expands the card on that hash).
 */
function EncodedRuleChips({ rules }: { rules: SectionPageData["encodedRules"] }) {
  if (rules.length === 0) return null;
  return (
    <p className="mt-1.5 flex flex-wrap items-center gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)]">
        Encoded as
      </span>
      {rules.map((rule) => (
        <a
          key={rule.name}
          href={`#rule-${rule.name}`}
          title={rule.kind ? `${rule.kind} rule — view in encoding rail` : "View in encoding rail"}
          className="rounded border border-[var(--color-rule)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--color-ink-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors"
        >
          {rule.name}
        </a>
      ))}
    </p>
  );
}

function ChunkBlock({
  chunk,
  data,
}: {
  chunk: BodyChunk;
  data: SectionPageData;
}) {
  const focused = data.focusAnchor === chunk.anchor;
  const chunkRules = data.encodedRules.filter((rule) =>
    rule.anchors.includes(chunk.anchor)
  );
  // Deep-linked landings get the action row at the heading they were
  // sent to: cite / graph / builder, computed from the same coverage
  // data the rail uses.
  const sectionFocus = graphFocusForCitationPath(data.citationPath);
  const slug = data.citationPath.split("/")[0];
  const subsectionFocus = sectionFocus ? `${sectionFocus}/${chunk.anchor}` : null;
  const graphProgram =
    data.programs.find((program) => program.anchors.includes(chunk.anchor)) ??
    data.programs[0] ??
    null;
  const graphHref =
    focused && graphProgram && subsectionFocus
      ? graphViewerUrl(graphProgram, subsectionFocus)
      : null;
  const builderRule = chunkRules.find((rule) => data.ruleFiles[rule.name]);
  const builderHref =
    focused && builderRule
      ? builderUrlForRule(
          ruleGraphFocus(
            slug,
            data.ruleFiles[builderRule.name],
            builderRule.name
          )
        )
      : null;
  return (
    <section
      id={chunk.anchor}
      className={`group scroll-mt-24 ${
        focused
          ? "rounded-md -mx-3 px-3 pb-3 shadow-[0_0_0_1px_rgba(146,64,14,0.35)] bg-[rgba(146,64,14,0.05)]"
          : ""
      }`}
    >
      <h2 className="mt-8 flex items-baseline gap-2">
        <Link
          href={`/axiom/v2/${data.citationPath}/${chunk.anchor}`}
          className="font-mono text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-accent)] transition-colors"
          title={`Open ${data.citationPath}/${chunk.anchor}`}
        >
          {chunk.designator}
        </Link>
        <AnchorLink anchor={chunk.anchor} />
      </h2>
      {focused && (
        <SubsectionActions
          citationLabel={formatLegalCitation(data.citationPath, chunk.anchor)}
          href={`/axiom/v2/${data.citationPath}/${chunk.anchor}`}
          graphHref={graphHref}
          builderHref={builderHref}
        />
      )}
      <EncodedRuleChips rules={chunkRules} />
      <ChunkTraceChips anchor={chunk.anchor} sectionFocus={sectionFocus} />
      <div className="mt-1">
        <RuleBody
          hrefPrefix="/axiom/v2"
          body={chunk.text}
          refs={refsForChunk(data.rootRefs, chunk.text)}
          citationPath={data.root.citation_path ?? undefined}
          testId={null}
        />
      </div>
    </section>
  );
}

function NeighborNav({ data }: { data: SectionPageData }) {
  if (!data.prev && !data.next) return null;
  return (
    <nav
      aria-label="Adjacent sections"
      className="mt-12 flex justify-between gap-4 border-t border-[var(--color-rule)] pt-5 text-sm"
    >
      {data.prev ? (
        <Link
          href={`/axiom/v2/${data.prev.citationPath}`}
          rel="prev"
          className="max-w-[45%] truncate text-[var(--color-ink-secondary)] hover:text-[var(--color-ink)] transition-colors"
        >
          ← {data.prev.label}
        </Link>
      ) : (
        <span />
      )}
      {data.next ? (
        <Link
          href={`/axiom/v2/${data.next.citationPath}`}
          rel="next"
          className="max-w-[45%] truncate text-right text-[var(--color-ink-secondary)] hover:text-[var(--color-ink)] transition-colors"
        >
          {data.next.label} →
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}

export function SectionReader({ data }: { data: SectionPageData }) {
  const heading = data.root.heading?.trim();
  const effective = formatDate(data.root.effective_date);
  const outgoing = buildInlineReferences(
    data.root.body,
    data.citationPath,
    data.rootRefs
  ).filter((ref) => ref.direction === "outgoing");
  const incoming = data.rootRefs.filter(
    (ref) => ref.direction === "incoming"
  );
  const sectionFocus = graphFocusForCitationPath(data.citationPath);

  return (
    <TraceProvider>
    <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-10 px-4 pt-24 pb-16 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[200px_minmax(0,1fr)_360px]">
      <aside className="hidden xl:block">
        <div className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto pr-2">
          <SectionToc entries={data.toc} />
        </div>
      </aside>

      <article data-testid="section-reader">
        <CitationPreviewLayer />
        {data.focusAnchor && <FocusScroll anchor={data.focusAnchor} />}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Breadcrumbs data={data} />
          <CitationJump />
        </div>

        <header className="border-b border-[var(--color-rule)] pb-5">
          <p className="font-mono text-[12px] uppercase tracking-wider text-[var(--color-ink-muted)]">
            {data.citationPath}
          </p>
          {heading && (
            <h1
              className="mt-2 text-2xl font-semibold text-[var(--color-ink)]"
              style={{ fontFamily: "var(--f-serif)" }}
            >
              {heading}
            </h1>
          )}
          <div className="mt-2 flex flex-wrap gap-4 text-[12px] text-[var(--color-ink-muted)]">
            {effective && <span>Effective {effective}</span>}
            {data.root.source_url && (
              <a
                href={data.root.source_url}
                target="_blank"
                rel="noreferrer"
                className="underline decoration-[var(--color-rule)] underline-offset-2 hover:text-[var(--color-ink)] transition-colors"
              >
                Official source
              </a>
            )}
            {(data.encoding || data.root.has_rulespec) && (
              <span className="text-[var(--color-accent)]">
                {data.encodedRules.length > 0
                  ? `Encoded · ${data.encodedRules.length} rules`
                  : "Encoded"}
              </span>
            )}
          </div>
        </header>

        {data.bodyChunks.length > 0 ? (
          <>
            {data.intro && (
              <div className="mt-6">
                <RuleBody
                  hrefPrefix="/axiom/v2"
                  body={data.intro}
                  refs={refsForChunk(data.rootRefs, data.intro)}
                  citationPath={data.root.citation_path ?? undefined}
                />
              </div>
            )}
            {data.bodyChunks.map((chunk) => (
              <ChunkBlock key={chunk.anchor} chunk={chunk} data={data} />
            ))}
          </>
        ) : (
          data.root.body && (
            <div className="mt-6">
              <RuleBody
                hrefPrefix="/axiom/v2"
                body={data.root.body}
                refs={data.rootRefs}
                citationPath={data.root.citation_path ?? undefined}
              />
            </div>
          )
        )}

        {data.provisions.map((provision) => (
          <ProvisionBlock
            key={provision.rule.id}
            provision={provision}
            citationPath={data.citationPath}
            sectionFocus={sectionFocus}
          />
        ))}

        {data.truncated && (
          <p className="mt-8 text-sm text-[var(--color-ink-muted)]">
            This section is unusually large; deeper subsections were cut
            off. Use the tree browser to reach them.
          </p>
        )}

        <NeighborNav data={data} />
      </article>

      {/* Encoding + citation-graph rail. Pinned on xl+ so the
          encoding stays in view while the source scrolls — the
          "prove faithfulness" pairing from the v1 detail panel. */}
      <aside className="lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
        <EncodingRail
          encoding={data.encoding}
          jurisdiction={data.root.jurisdiction}
          citationPath={data.root.citation_path}
          isRepealed={Boolean(data.root.repeal_date)}
          chunks={data.bodyChunks.map((chunk) => ({
            anchor: chunk.anchor,
            designator: chunk.designator,
            label: chunk.label,
            text: chunk.text,
          }))}
          encodedRules={data.encodedRules}
          outgoing={outgoing}
          incoming={incoming}
          programs={data.programs}
          ruleFiles={data.ruleFiles}
        />
      </aside>
    </div>
    </TraceProvider>
  );
}
