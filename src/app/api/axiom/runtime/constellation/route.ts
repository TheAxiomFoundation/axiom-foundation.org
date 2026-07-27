import { NextResponse } from "next/server";
import { runtimeProxyGet } from "@/lib/axiom/runtime/api";

/**
 * The launcher's constellation data: every ready package with REAL
 * interconnection weights — how many of its rules live in shared
 * federal law versus its own jurisdiction. All state SNAPs draw on
 * 7 USC 2014 / 7 CFR 273; the TANFs on their federal spine; the
 * constellation renders that honestly, with edge weight = the count
 * of federal rules the program actually composes.
 *
 * Fetching every package graph is expensive (~8 MB upstream), so the
 * computed summary is cached in-instance for an hour and served with
 * a long cache-control.
 */

interface ConstellationProgram {
  jurisdiction: string;
  program_id: string;
  family: string | null;
  federal_rules: number;
  own_rules: number;
  total_rules: number;
  headline: string | null;
  /** A deterministic miniature of the program's actual graph — up to
   *  44 rule-dots in unit space; shared=true marks federal rules (the
   *  touching points with the rest of the corpus). */
  outline: Array<{ x: number; y: number; shared: boolean }>;
  /** The program's most-consumed shared federal rules — the named
   *  touching points. */
  touchpoints: string[];
}

/** Deterministic hash → two unit floats, so every reload draws the
 *  same outline for the same rule. */
function hashPoint(id: string): { x: number; y: number } {
  let h1 = 5381;
  let h2 = 52711;
  for (let i = 0; i < id.length; i++) {
    h1 = (h1 * 33) ^ id.charCodeAt(i);
    h2 = (h2 * 31) ^ id.charCodeAt(i);
  }
  return {
    x: ((h1 >>> 0) % 1000) / 1000,
    y: ((h2 >>> 0) % 1000) / 1000,
  };
}

const TTL_MS = 60 * 60 * 1000;
let cache: { at: number; body: { programs: ConstellationProgram[] } } | null =
  null;

function familyOf(programId: string): string | null {
  if (programId.includes("snap")) return "snap";
  if (programId.includes("tanf") || programId === "tca") return "tanf";
  return null;
}

export async function GET() {
  if (cache && Date.now() - cache.at < TTL_MS) {
    return NextResponse.json(cache.body, {
      headers: { "cache-control": "public, max-age=3600" },
    });
  }

  const list = await runtimeProxyGet("/runtime/packages");
  const packages =
    (
      list.body as {
        data?: {
          packages?: Array<{
            jurisdiction: string;
            program_id: string;
            status: string;
            default_outputs?: string[];
            certified_node_count?: number;
          }>;
        };
      }
    ).data?.packages ?? [];

  const programs: ConstellationProgram[] = [];
  for (const pkg of packages) {
    if (pkg.status !== "ready") continue;
    // Zero-certified programs are absent from the overview — and the
    // registry says so up front, sparing the (multi-MB) graph fetch.
    if (pkg.certified_node_count === 0) continue;
    const graphResponse = await runtimeProxyGet(
      `/runtime/packages/${encodeURIComponent(pkg.jurisdiction)}/${encodeURIComponent(pkg.program_id)}/graph`,
    );
    const graph = (
      graphResponse.body as {
        data?: { graph?: { rules?: Array<{ legalId: string }> } };
      }
    ).data?.graph;
    const rules = (graph?.rules ?? []) as Array<{
      legalId: string;
      name?: string;
      ruleDeps?: string[];
    }>;
    // A gated graph can come back 200-but-empty (artifact exists,
    // nothing certified) — same absence as a zero count.
    if (rules.length === 0) continue;
    let federal = 0;
    let own = 0;
    for (const rule of rules) {
      if (rule.legalId.startsWith("us:")) federal += 1;
      else if (rule.legalId.startsWith(`${pkg.jurisdiction}:`)) own += 1;
    }
    // Miniature outline: a deterministic sample of the real rules.
    const sampled = rules.filter(
      (_, index) => index % Math.max(1, Math.ceil(rules.length / 44)) === 0,
    );
    const outline = sampled.map((rule) => ({
      ...hashPoint(rule.legalId),
      shared: rule.legalId.startsWith("us:"),
    }));
    // Touching points: the shared federal rules this program leans on
    // hardest (by in-package consumer count).
    const consumerCount = new Map<string, number>();
    for (const rule of rules) {
      for (const dep of rule.ruleDeps ?? []) {
        if (dep.startsWith("us:")) {
          consumerCount.set(dep, (consumerCount.get(dep) ?? 0) + 1);
        }
      }
    }
    const nameById = new Map(rules.map((rule) => [rule.legalId, rule.name]));
    const touchpoints = [...consumerCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id]) => nameById.get(id) ?? id.split("#").pop() ?? id)
      .filter((name): name is string => Boolean(name));
    programs.push({
      jurisdiction: pkg.jurisdiction,
      program_id: pkg.program_id,
      family: familyOf(pkg.program_id),
      federal_rules: federal,
      own_rules: own,
      total_rules: rules.length,
      headline: pkg.default_outputs?.[0] ?? null,
      outline,
      touchpoints,
    });
  }

  const body = { programs };
  cache = { at: Date.now(), body };
  return NextResponse.json(body, {
    headers: { "cache-control": "public, max-age=3600" },
  });
}
