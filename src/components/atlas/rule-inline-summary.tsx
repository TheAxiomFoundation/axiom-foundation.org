"use client";

import type { Rule, RuleReference } from "@/lib/supabase";
import { RuleBody } from "./rule-body";

interface RuleInlineSummaryProps {
  rule: Rule;
  /**
   * The rule's ingested children (if any). When the parent body is a
   * stub — e.g. "(d) Married individuals" with no substantive text —
   * we fall through to the children's bodies so the reader still has
   * substantive text to look at on the page.
   */
  children: Rule[];
  /**
   * Outgoing references for this rule. When the parent body is rendered
   * via RuleBody, refs are spliced as inline citation links and the
   * ``?mark=…`` query (set on incoming-reference clicks elsewhere)
   * is honoured for scroll-to-highlight.
   */
  outgoingRefs?: RuleReference[];
}

/**
 * Returns true when a rule's own body is essentially just its label
 * ("(d) Married individuals", "(2) Limitation", …) with no
 * substantive prose.
 *
 * Strips the leading "(id)" prefix and any repeat of the heading
 * before checking what's left — a rule whose body is just the label
 * plus heading is a stub; a rule with a real sentence of text is not,
 * regardless of length.
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
 * Given a child rule, produce a short human label and a serif body
 * chunk we can render inline on the parent page. We strip the
 * leading "(id) heading" prefix from the body so we don't repeat the
 * label beside the content.
 */
function childReaderChunk(child: Rule): {
  id: string;
  label: string;
  body: string;
} {
  const tail = child.citation_path?.split("/").pop() ?? "";
  const heading = child.heading?.trim() ?? "";
  const id = tail || "·";
  const rawBody = (child.body ?? "").trim();
  let body = rawBody;
  // Strip "(id)" prefix if present.
  const idRe = new RegExp(`^\\(\\s*${id.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}\\s*\\)\\s*`);
  body = body.replace(idRe, "");
  // Strip a leading repeat of the heading if present.
  if (heading && body.toLowerCase().startsWith(heading.toLowerCase())) {
    body = body.slice(heading.length);
  }
  body = trimBodyTail(body);
  return { id, label: heading || `(${id})`, body };
}

/**
 * A compact "you are here" card for container-rule pages — sections
 * and subsections that have their own heading/body *and* children.
 *
 * Shows the same Axiom header treatment as the full reader (eyebrow
 * → gradient citation → serif title) followed by a body preview.
 * No encoding rail, no agent drawer, no sibling strip — those belong
 * in the leaf view. Here the job is to orient the reader before they
 * drill into the children list below.
 *
 * Body is truncated to the first two paragraphs so the card stays
 * proportionate to the tree list beneath it. A subtle "continue
 * below" line nudges the reader to the children.
 */
export function RuleInlineSummary({
  rule,
  children,
  outgoingRefs,
}: RuleInlineSummaryProps) {
  const bodyIsStub = isStubBody(rule);

  // When the rule's own body is a stub, substitute the children's
  // body text so the page doesn't read as empty.
  const childChunks =
    bodyIsStub && children.length > 0
      ? children.map(childReaderChunk).filter((c) => c.body.length > 0)
      : [];

  return (
    <div data-testid="rule-inline-summary" className="max-w-[720px]">
      {!bodyIsStub && rule.body && (
        <RuleBody body={rule.body} refs={outgoingRefs ?? []} />
      )}

      {childChunks.length > 0 && (
        <div className="space-y-6">
          {childChunks.map((chunk) => (
            <section key={chunk.id} className="flex gap-5">
              <span className="shrink-0 pt-[0.35em] font-mono text-xs text-[var(--color-accent)] tabular-nums">
                ({chunk.id})
              </span>
              <div
                className="flex-1 text-[1rem] leading-[1.8] text-[var(--color-ink-secondary)] space-y-2"
                style={{ fontFamily: "var(--f-serif)" }}
              >
                {chunk.label && (
                  <p className="m-0 font-medium text-[var(--color-ink)]">
                    {chunk.label}
                  </p>
                )}
                <p className="m-0 whitespace-pre-wrap">{chunk.body}</p>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
