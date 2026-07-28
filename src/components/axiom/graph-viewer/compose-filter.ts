import type { ProgramGraph, RuleNode } from "./types";

/**
 * Isolated-node filter for composed graphs: a rule with zero deps
 * (no rules, no inputs, no relations) that nothing else references
 * is a standalone definition — the "Foster Care" glossary class. On
 * a composed canvas they're wallpaper; hide them and report how
 * many, so the view can say so honestly.
 *
 * Two honest exceptions:
 * - A subtree that is ENTIRELY standalone definitions (a glossary
 *   page opened from the field) filters nothing — an empty canvas
 *   would be a lie.
 * - Program (?program=) graphs never come through here; they're
 *   already frontier-pruned upstream.
 */
export function filterStandaloneRules(graph: ProgramGraph): {
  graph: ProgramGraph;
  hiddenCount: number;
} {
  const referenced = new Set<string>();
  for (const rule of graph.rules) {
    for (const dep of rule.ruleDeps) referenced.add(dep);
  }
  const isStandalone = (rule: RuleNode) =>
    rule.ruleDeps.length === 0 &&
    rule.inputDeps.length === 0 &&
    (rule.relationDeps?.length ?? 0) === 0 &&
    !referenced.has(rule.legalId);

  const hiddenCount = graph.rules.filter(isStandalone).length;
  if (hiddenCount === 0 || hiddenCount === graph.rules.length) {
    return { graph, hiddenCount: 0 };
  }
  const kept = graph.rules.filter((rule) => !isStandalone(rule));
  const keptIds = new Set(kept.map((rule) => rule.legalId));
  return {
    graph: {
      ...graph,
      rules: kept,
      ownOutputs: graph.ownOutputs.filter((id) => keptIds.has(id)),
      terminalOutputs: graph.terminalOutputs.filter((id) =>
        keptIds.has(id),
      ),
    },
    hiddenCount,
  };
}

/**
 * Root-first selection for a composed graph: the terminal root with
 * the largest dependency closure — the box the subtree rolls up
 * into (matches the census's headlineRule when present, but always
 * computed from the graph itself, never trusted from an index).
 * Ties break lexicographically for determinism.
 */
export function composeRootOutput(graph: ProgramGraph): string | null {
  const byId = new Map(graph.rules.map((rule) => [rule.legalId, rule]));
  const candidates = (
    graph.terminalOutputs.length > 0
      ? graph.terminalOutputs
      : graph.ownOutputs
  ).filter((id) => byId.has(id));
  const pool =
    candidates.length > 0 ? candidates : graph.rules.map((r) => r.legalId);
  let best: string | null = null;
  let bestSize = -1;
  for (const id of pool) {
    const seen = new Set<string>();
    const stack = [id];
    while (stack.length > 0) {
      const current = stack.pop()!;
      if (seen.has(current)) continue;
      seen.add(current);
      const rule = byId.get(current);
      if (rule) stack.push(...rule.ruleDeps);
    }
    if (
      seen.size > bestSize ||
      (seen.size === bestSize && best !== null && id < best)
    ) {
      bestSize = seen.size;
      best = id;
    }
  }
  return best;
}
