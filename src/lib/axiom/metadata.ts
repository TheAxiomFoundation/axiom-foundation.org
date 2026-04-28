import { supabaseCorpus, type Rule } from "@/lib/supabase";
import { citationPathPrefixes } from "./resolver";

/**
 * Canonical base URL for absolute links in OpenGraph, sitemap, and
 * JSON-LD. Overridable via NEXT_PUBLIC_SITE_URL for previews.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://axiom-foundation.org";

/**
 * Shape the viewer + external share surfaces consume for a single
 * rule. Server-rendered so the OpenGraph preview has real text and
 * not a "loading…" placeholder.
 */
export interface AxiomRuleMetadata {
  rule: Rule | null;
  title: string;
  description: string;
  canonicalUrl: string;
  citationPath: string;
  jurisdiction: string | null;
  docType: string | null;
}

function firstSentence(text: string, maxLen = 200): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (trimmed.length <= maxLen) return trimmed;
  const cut = trimmed.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trim() + "…";
}

/**
 * Fetch the rule at a citation_path (or the deepest ingested
 * ancestor) and build human-readable title + description strings.
 *
 * Called from ``generateMetadata`` on the server so Axiom rule URLs
 * render as first-class shareable objects — the OG preview shows the
 * actual citation and a snippet of body text, not a generic header.
 */
export async function getAxiomRuleMetadata(
  segments: string[] | undefined
): Promise<AxiomRuleMetadata> {
  const citationPath = (segments ?? []).join("/");
  const canonicalUrl = citationPath
    ? `${SITE_URL}/axiom/${citationPath}`
    : `${SITE_URL}/axiom`;

  if (!citationPath) {
    return {
      rule: null,
      title: "Axiom — Axiom Foundation",
      description:
        "Browse every atomic rule in the encoded legal code: source text, RuleSpec encoding, and the citation graph that ties them together.",
      canonicalUrl,
      citationPath: "",
      jurisdiction: null,
      docType: null,
    };
  }

  const prefixes = citationPathPrefixes(citationPath);
  const { data } = await supabaseCorpus
    .from("provisions")
    .select("*")
    .in("citation_path", prefixes);

  const byPath = new Map<string, Rule>();
  for (const row of (data as Rule[] | null) ?? []) {
    if (row.citation_path) byPath.set(row.citation_path, row);
  }
  let rule: Rule | null = null;
  for (const prefix of prefixes) {
    const hit = byPath.get(prefix);
    if (hit) {
      rule = hit;
      break;
    }
  }

  if (!rule) {
    return {
      rule: null,
      title: `${citationPath} — Axiom`,
      description:
        "This citation is not yet ingested in the Axiom. View other atomic rules in the encoded legal code.",
      canonicalUrl,
      citationPath,
      jurisdiction: null,
      docType: null,
    };
  }

  const heading = rule.heading?.trim();
  const body = rule.body?.trim();
  const citationLabel = rule.citation_path ?? citationPath;
  const title = heading
    ? `${citationLabel} — ${heading} · Axiom`
    : `${citationLabel} · Axiom`;
  const description = body
    ? firstSentence(body)
    : heading
      ? `Atomic rule: ${heading}. Source text and encoding in Axiom.`
      : `Atomic rule at ${citationLabel} — view source and encoding in Axiom.`;

  return {
    rule,
    title,
    description,
    canonicalUrl,
    citationPath,
    jurisdiction: rule.jurisdiction,
    docType: rule.doc_type,
  };
}

/**
 * JSON-LD for a rule — uses schema.org's Legislation type so search
 * engines and downstream citation tools (Zotero, Perplexity, LLMs
 * with retrieval) recognise the object properly.
 */
export function buildLegislationJsonLd(meta: AxiomRuleMetadata): object | null {
  if (!meta.rule) return null;
  const citationLabel = meta.rule.citation_path ?? meta.citationPath;
  return {
    "@context": "https://schema.org",
    "@type": "Legislation",
    name: meta.rule.heading || citationLabel,
    alternateName: citationLabel,
    identifier: citationLabel,
    legislationIdentifier: citationLabel,
    legislationJurisdiction: meta.rule.jurisdiction || undefined,
    legislationType:
      meta.rule.doc_type === "regulation"
        ? "Regulation"
        : meta.rule.doc_type === "legislation"
          ? "Act"
          : "Statute",
    url: meta.canonicalUrl,
    inLanguage: inferLanguage(meta.rule.jurisdiction),
    text: meta.rule.body || undefined,
    dateModified: meta.rule.updated_at || undefined,
  };
}

function inferLanguage(jurisdiction: string | null): string {
  if (!jurisdiction) return "en";
  // Canadian federal code exists in en + fr; default to en.
  return "en";
}
