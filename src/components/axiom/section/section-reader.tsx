import Link from "next/link";
import {
  railChunksFromProvisions,
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
import { CitationPreviewLayer } from "./citation-preview";
import { SubsectionActions } from "./subsection-actions";
import { ActionStrip } from "./action-strip";
import {
  builderUrlForRule,
  composeGraphViewerUrl,
  fileGraphFocus,
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
  // Bare citation-path hrefs are canonical: the proxy routes
  // section-depth paths to this reader and browse levels to the v1
  // tree browser.
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
  data,
  sectionFocus,
}: {
  provision: SectionProvision;
  data: SectionPageData;
  sectionFocus: string | null;
}) {
  const { rule, anchor, designator, relativeDepth } = provision;
  const heading = rule.heading?.trim();
  const HeadingTag = relativeDepth === 1 ? "h2" : "h3";
  const isTopLevel = relativeDepth === 1;
  // Top-level provisions get everything a body chunk gets — focus
  // highlight, action row, encoded-rule chips, and a real subsection
  // URL on the designator — so the two column shapes behave the same
  // for readers.
  const focused = isTopLevel && data.focusAnchor === anchor;
  const provisionRules = isTopLevel
    ? data.encodedRules.filter((entry) => entry.anchors.includes(anchor))
    : [];
  const { graphHref, builderHref } = focused
    ? subsectionActionHrefs(data, anchor, provisionRules)
    : { graphHref: null, builderHref: null };
  return (
    <section
      id={anchor}
      className={`group scroll-mt-24 ${focused ? FOCUSED_SUBSECTION_CLASS : ""}`}
    >
      <HeadingTag
        className={`flex items-baseline gap-2 text-[var(--color-ink)] ${
          isTopLevel
            ? "mt-10 text-lg font-semibold"
            : "mt-6 text-base font-medium"
        }`}
      >
        {isTopLevel ? (
          <Link
            href={`/${data.citationPath}/${anchor}`}
            className="font-mono text-[0.85em] text-[var(--color-ink-muted)] hover:text-[var(--color-accent)] transition-colors"
            title={`Open ${data.citationPath}/${anchor}`}
          >
            {designator}
          </Link>
        ) : (
          <span className="font-mono text-[0.85em] text-[var(--color-ink-muted)]">
            {designator}
          </span>
        )}
        {heading && <span>{heading}</span>}
        <AnchorLink anchor={anchor} />
      </HeadingTag>
      {focused && (
        <SubsectionActions
          citationLabel={formatLegalCitation(data.citationPath, anchor)}
          href={`/${data.citationPath}/${anchor}`}
          graphHref={graphHref}
          builderHref={builderHref}
        />
      )}
      {rule.body && (
        <div className="mt-2">
          <RuleBody
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
 * Action-row targets for one top-level subsection: the covering
 * program's graph focused on it, and its first encoded rule as a
 * builder output. Shared by both column shapes (body chunks and
 * corpus provisions) so deep links behave identically.
 */
/**
 * The one program context shared by Run, Graph and Build for a
 * section: the strongest-coverage ready program (data.programs is
 * ruleCount-sorted). Run previously preferred ready programs while
 * Graph took programs[0] regardless of status — the two actions
 * could silently address different jurisdictions.
 */
export function primaryProgram(
  programs: SectionPageData["programs"]
): SectionPageData["programs"][number] | null {
  return (
    programs.find((program) => program.status === "ready") ??
    programs[0] ??
    null
  );
}

function subsectionActionHrefs(
  data: SectionPageData,
  anchor: string,
  subsectionRules: SectionPageData["encodedRules"]
): { graphHref: string | null; builderHref: string | null } {
  const sectionFocus = graphFocusForCitationPath(data.citationPath);
  const slug = data.citationPath.split("/")[0];
  const graphProgram =
    data.programs.find(
      (program) =>
        program.status === "ready" && program.anchors.includes(anchor)
    ) ??
    data.programs.find((program) => program.anchors.includes(anchor)) ??
    primaryProgram(data.programs);
  const inPrograms = new Set(
    data.programs.flatMap((program) => program.ruleNames)
  );
  const sorted = [...subsectionRules].sort(
    (a, b) => Number(b.kind === "derived") - Number(a.kind === "derived")
  );
  // No package covers this section: compose the graph on demand from
  // the subsection's encoded file instead of dropping the link.
  const composeRule = sorted.find((rule) => data.ruleFiles[rule.name]);
  const graphHref =
    graphProgram && sectionFocus
      ? graphViewerUrl(graphProgram, `${sectionFocus}/${anchor}`)
      : composeRule && slug
        ? composeGraphViewerUrl(
            fileGraphFocus(slug, data.ruleFiles[composeRule.name])
          )
        : null;
  // Builder gets the section-level legal id: its deep-link handler
  // scopes the output picker to this provision and the user selects
  // which rules become outputs there — no per-rule link picking here.
  const builderHref =
    sectionFocus && subsectionRules.length > 0
      ? builderUrlForRule(sectionFocus)
      : null;
  return { graphHref, builderHref };
}

/**
 * Builder target for the header strip: the section-level legal id.
 * The builder resolves a program containing the section's rules and
 * lands on its output picker scoped to this provision, where the
 * user selects which rulespec rules become calculator outputs.
 */
function stripBuilderHref(data: SectionPageData): string | null {
  const sectionFocus = graphFocusForCitationPath(data.citationPath);
  if (!sectionFocus || data.encodedRules.length === 0) return null;
  return builderUrlForRule(sectionFocus);
}

/**
 * Header-strip graph target when no compiled package covers this
 * section: compose the graph on demand from the section's encoded
 * file (the viewer's ?compose= mode, backed by the encodings mirror).
 */
function stripComposeHref(data: SectionPageData): string | null {
  const rule = data.encodedRules.find((entry) => data.ruleFiles[entry.name]);
  if (!rule) return null;
  const slug = data.citationPath.split("/")[0];
  return composeGraphViewerUrl(
    fileGraphFocus(slug, data.ruleFiles[rule.name])
  );
}

const FOCUSED_SUBSECTION_CLASS =
  "rounded-md -mx-3 px-3 pb-3 shadow-[0_0_0_1px_rgba(146,64,14,0.35)] bg-[rgba(146,64,14,0.05)]";

function ChunkBlock({
  chunk,
  data,
}: {
  chunk: BodyChunk;
  data: SectionPageData;
}) {
  const focused = data.focusAnchor === chunk.anchor;
  const sectionFocus = graphFocusForCitationPath(data.citationPath);
  const chunkRules = data.encodedRules.filter((rule) =>
    rule.anchors.includes(chunk.anchor)
  );
  const { graphHref, builderHref } = focused
    ? subsectionActionHrefs(data, chunk.anchor, chunkRules)
    : { graphHref: null, builderHref: null };
  return (
    <section
      id={chunk.anchor}
      className={`group scroll-mt-24 ${focused ? FOCUSED_SUBSECTION_CLASS : ""}`}
    >
      <h2 className="mt-8 flex items-baseline gap-2">
        <Link
          href={`/${data.citationPath}/${chunk.anchor}`}
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
          href={`/${data.citationPath}/${chunk.anchor}`}
          graphHref={graphHref}
          builderHref={builderHref}
        />
      )}
      <div className="mt-1">
        <RuleBody
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
          href={`/${data.prev.citationPath}`}
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
          href={`/${data.next.citationPath}`}
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
    <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-10 px-4 pt-24 pb-16 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[200px_minmax(0,1fr)_360px]">
      <aside className="hidden xl:block">
        <div className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto pr-2">
          <SectionToc entries={data.toc} />
        </div>
      </aside>

      <article data-testid="section-reader">
        <CitationPreviewLayer />
        {data.focusAnchor && <FocusScroll anchor={data.focusAnchor} />}
        <div className="mb-4">
          <Breadcrumbs data={data} />
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
          </div>
          <ActionStrip
            encodedRuleCount={data.encodedRules.length}
            graphHref={(() => {
              const program = primaryProgram(data.programs);
              return program && sectionFocus
                ? graphViewerUrl(program, sectionFocus)
                : stripComposeHref(data);
            })()}
            builderHref={stripBuilderHref(data)}
            citationLabel={formatLegalCitation(data.citationPath)}
            href={`/${data.citationPath}`}
          />
        </header>

        {data.bodyChunks.length > 0 ? (
          <>
            {data.intro && (
              <div className="mt-6">
                <RuleBody
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
            data={data}
            sectionFocus={sectionFocus}
          />
        ))}

        {data.truncated && (
          <p className="mt-8 text-sm text-[var(--color-ink-muted)]">
            This section is unusually large; deeper subsections were cut
            off. Open a subsection via its designator link — for example{" "}
            {data.toc[0] ? (
              <Link
                href={`/${data.citationPath}/${data.toc[0].anchor.split("-")[0]}`}
                className="underline decoration-[var(--color-rule)] underline-offset-2 hover:text-[var(--color-ink)]"
              >
                {data.toc[0].label.split(" ")[0]}
              </Link>
            ) : (
              "its heading"
            )}{" "}
            — to read its full text.
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
          chunks={
            data.bodyChunks.length > 0
              ? data.bodyChunks.map((chunk) => ({
                  anchor: chunk.anchor,
                  designator: chunk.designator,
                  label: chunk.label,
                  text: chunk.text,
                }))
              : railChunksFromProvisions(data.provisions)
          }
          encodedRules={data.encodedRules}
          outgoing={outgoing}
          incoming={incoming}
          programs={data.programs}
          ruleFiles={data.ruleFiles}
        />
      </aside>
    </div>
  );
}
