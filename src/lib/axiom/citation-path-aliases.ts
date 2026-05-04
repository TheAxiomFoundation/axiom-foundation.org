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
