export function chapterlessSectionAlias(pathPrefix: string): string | null {
  const parts = pathPrefix.split("/");
  if (parts.length < 5) return null;
  const terminalIndex = parts.length - 1;
  const chapterIndex = terminalIndex - 1;
  if (!/^chapter-[^/]+$/i.test(parts[chapterIndex])) return null;
  return [...parts.slice(0, chapterIndex), parts[terminalIndex]].join("/");
}

export function citationPathLookupCandidates(citationPath: string): string[] {
  const candidates = [citationPath];
  const alias = chapterlessSectionAlias(citationPath);
  if (alias && alias !== citationPath) candidates.push(alias);
  return candidates;
}

/**
 * GOV.UK documents fork across two taxonomies: the corpus ingests
 * them as ``uk/guidance/govuk/*`` (they are public guidance), while
 * rulespec-uk must keep their encodings under ``policies/`` — the
 * engine's atomic module roots have no ``guidance`` — which mirrors
 * to ``uk/policy/govuk/*``. Until the two agree, each side's path
 * maps to its twin: the reader resolves policy URLs against the
 * guidance corpus rows, and the encoding rail finds policy-mirrored
 * files for guidance pages.
 */
export function ukGovukTaxonomyTwin(citationPath: string): string | null {
  if (citationPath.startsWith("uk/policy/govuk/")) {
    return `uk/guidance/govuk/${citationPath.slice("uk/policy/govuk/".length)}`;
  }
  if (citationPath.startsWith("uk/guidance/govuk/")) {
    return `uk/policy/govuk/${citationPath.slice("uk/guidance/govuk/".length)}`;
  }
  return null;
}
