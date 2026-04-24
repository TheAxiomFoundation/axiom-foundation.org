"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { Rule, RuleReference } from "@/lib/supabase";
import { RuleBody } from "./rule-body";
import { useRuleDescendants } from "@/hooks/use-rule-descendants";
import {
  buildRuleTree,
  hasSubstantiveBody,
  stripBodyLabel,
  type RuleTreeNode,
} from "@/lib/atlas/rule-tree";

interface RuleInlineSummaryProps {
  rule: Rule;
  /**
   * The rule's immediate children (already fetched upstream). Used
   * to seed the outline + to render even before the deeper descendant
   * query resolves, so the page isn't blank on first paint.
   */
  children: Rule[];
  /**
   * Outgoing references for this rule. When we render the rule's
   * full body via RuleBody (only when ``?mark=…`` is present —
   * otherwise we render the atomic tree), refs are spliced as
   * inline citation links.
   */
  outgoingRefs?: RuleReference[];
}

function RuleOutline({ childRules }: { childRules: Rule[] }) {
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
      className="mb-8 px-5 py-4 bg-[var(--color-paper)] border border-[var(--color-rule)] rounded-md"
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

/**
 * Render a single node of the atomic tree: label + heading + body
 * (if substantive) + its children recursively. Depth drives the
 * left indentation so the hierarchy reads at a glance.
 */
function TreeNode({
  node,
  depth,
}: {
  node: RuleTreeNode;
  depth: number;
}) {
  const { rule } = node;
  const tail = rule.citation_path?.split("/").pop() ?? "";
  const heading = rule.heading?.trim();
  const body = stripBodyLabel(rule);
  const hasBody = body.length > 0;
  const href = `/atlas/${rule.citation_path ?? ""}`;

  // Left indent per depth level. Depth 0 is the root (never rendered
  // here — the parent page owns that header), so the first recursive
  // level renders flush-left.
  const indentPx = Math.max(0, depth - 1) * 20;

  return (
    <section
      className="flex gap-4"
      style={indentPx > 0 ? { marginLeft: indentPx } : undefined}
    >
      <Link
        href={href}
        aria-label={heading ? `Open ${heading}` : `Open subsection ${tail}`}
        className="shrink-0 pt-[0.25em] font-mono text-xs text-[var(--color-accent)] tabular-nums no-underline hover:underline"
      >
        ({tail || "·"})
      </Link>
      <div className="flex-1 min-w-0">
        {heading && (
          <Link
            href={href}
            className="block mb-1 font-medium text-[var(--color-ink)] no-underline hover:text-[var(--color-accent)] transition-colors"
            style={{ fontFamily: "var(--f-serif)" }}
          >
            {heading}
          </Link>
        )}
        {hasBody && (
          <p
            className="m-0 text-[1rem] leading-[1.8] text-[var(--color-ink-secondary)] whitespace-pre-wrap"
            style={{ fontFamily: "var(--f-serif)" }}
          >
            {body}
          </p>
        )}
        {node.children.length > 0 && (
          <div className="mt-4 space-y-5">
            {node.children.map((child) => (
              <TreeNode key={child.rule.id} node={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function useTreeOrSeed(
  rule: Rule,
  immediateChildren: Rule[]
): RuleTreeNode {
  const { descendants, loading } = useRuleDescendants(rule.id);
  // If the deep descendant query is still in flight, fall back to the
  // immediate-children list as a scaffold so the page paints real
  // structure on first frame — then swap in the full tree when it
  // lands. This avoids the flash-to-nothing problem.
  if (loading && descendants.length === 0) {
    return buildRuleTree(rule, immediateChildren);
  }
  return buildRuleTree(
    rule,
    descendants.length > 0 ? descendants : immediateChildren
  );
}

/**
 * Container-rule hero: renders the atomic tree of the current rule
 * (all descendants, not just the first level) so the page shows the
 * FULL text of the section, broken down per subsection. Every atomic
 * label is a drill-in link into the descendant's own atlas page —
 * where that descendant's own encoding + refs live.
 *
 * When ``?mark=`` is present (incoming-reference flow), we flip back
 * to rendering the rule's own body via RuleBody so the cited passage
 * can scroll-and-highlight against the parent body's offsets.
 */
export function RuleInlineSummary({
  rule,
  children,
  outgoingRefs,
}: RuleInlineSummaryProps) {
  const searchParams = useSearchParams();
  const hasMark = !!searchParams?.get("mark");
  const ruleHasBody = hasSubstantiveBody(rule);

  // In citation/mark mode, render the full body (it's where the
  // highlight's offsets resolve). Otherwise render the atomic tree
  // for a structured, drill-in-able reading experience.
  if (hasMark && ruleHasBody && rule.body) {
    return (
      <div data-testid="rule-inline-summary" className="max-w-[720px]">
        {children.length > 0 && <RuleOutline childRules={children} />}
        <RuleBody body={rule.body} refs={outgoingRefs ?? []} />
      </div>
    );
  }

  // No children → plain body (rare for a container page, but safe).
  if (children.length === 0) {
    if (!ruleHasBody || !rule.body) return null;
    return (
      <div data-testid="rule-inline-summary" className="max-w-[720px]">
        <RuleBody body={rule.body} refs={outgoingRefs ?? []} />
      </div>
    );
  }

  return (
    <RuleInlineTree
      rule={rule}
      immediateChildren={children}
    />
  );
}

/**
 * True when the rule's own body already contains every immediate
 * child's body text concatenated (as most section-level USC rules
 * do — rule.body is the full section text including subsections).
 * Rendering it AND the children recursively would duplicate.
 *
 * Detection: the stripped body contains an "(X)" marker matching
 * any child's citation-path tail. If so, treat it as concatenated.
 */
function bodyConcatenatesChildren(
  strippedBody: string,
  children: Rule[]
): boolean {
  if (!strippedBody) return false;
  for (const child of children) {
    const tail = child.citation_path?.split("/").pop();
    if (!tail) continue;
    const marker = `(${tail})`;
    if (strippedBody.includes(marker)) return true;
  }
  return false;
}

function RuleInlineTree({
  rule,
  immediateChildren,
}: {
  rule: Rule;
  immediateChildren: Rule[];
}) {
  const tree = useTreeOrSeed(rule, immediateChildren);
  const strippedBody = stripBodyLabel(rule);
  // Render the root body only when it carries stand-alone content
  // — e.g. an introductory sentence before a list of enumerated
  // subsections. When the body already has the children
  // concatenated (section-level USC bodies are assembled that way),
  // we skip the body to avoid repeating the text.
  const showRootBody =
    strippedBody.length > 0 &&
    !bodyConcatenatesChildren(strippedBody, immediateChildren);

  return (
    <div data-testid="rule-inline-summary" className="max-w-[720px]">
      <RuleOutline childRules={immediateChildren} />
      {showRootBody && (
        <p
          className="mb-8 text-[1rem] leading-[1.8] text-[var(--color-ink-secondary)] whitespace-pre-wrap"
          style={{ fontFamily: "var(--f-serif)" }}
        >
          {strippedBody}
        </p>
      )}
      <div className="space-y-8">
        {tree.children.map((child) => (
          <TreeNode key={child.rule.id} node={child} depth={1} />
        ))}
      </div>
    </div>
  );
}
