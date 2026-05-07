import { supabaseCorpus, type Rule } from "@/lib/supabase";
import { AXIOM_APP_URL, SITE_URL } from "@/lib/urls";
import { citationPathLookupCandidates } from "./citation-path-aliases";
import { citationPathPrefixes } from "./resolver";

/**
 * Canonical base URL for Axiom app links in OpenGraph, sitemap, and
 * JSON-LD. Overridable via NEXT_PUBLIC_AXIOM_APP_URL for previews.
 */
export { AXIOM_APP_URL, SITE_URL };

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

const METADATA_QUERY_TIMEOUT_MS = 1200;

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
    ? `${AXIOM_APP_URL}/${citationPath}`
    : AXIOM_APP_URL;

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

  const lookupCandidates = citationPathLookupCandidates(citationPath);
  const prefixes = uniqueCitationPaths([
    ...lookupCandidates,
    ...citationPathPrefixes(citationPath),
  ]);
  const result = await withTimeout(
    supabaseCorpus
      .from("current_provisions")
      .select("*")
      .in("citation_path", prefixes),
    METADATA_QUERY_TIMEOUT_MS,
    null
  );
  const data = result?.data ?? null;

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
  const isAliasHit =
    !!rule.citation_path &&
    rule.citation_path !== citationPath &&
    lookupCandidates.includes(rule.citation_path);
  const resolvedCanonicalUrl = isAliasHit
    ? `${AXIOM_APP_URL}/${rule.citation_path}`
    : canonicalUrl;
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
    canonicalUrl: resolvedCanonicalUrl,
    citationPath,
    jurisdiction: rule.jurisdiction,
    docType: rule.doc_type,
  };
}

function uniqueCitationPaths(paths: string[]): string[] {
  return Array.from(new Set(paths));
}

function withTimeout<T>(
  promise: PromiseLike<T>,
  ms: number,
  fallback: T
): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(fallback);
      }
    );
  });
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
