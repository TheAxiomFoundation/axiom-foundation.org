import { NextResponse } from "next/server";
import {
  getRuntimePackage,
  runCalculate,
  isRuntimeApiConfigured,
} from "@/lib/axiom/runtime/api";
import { clientKey, isRateLimited } from "../run/limiter";

export const dynamic = "force-dynamic";

const SLUG_RE = /^[a-z0-9-]{1,64}$/;
const INPUT_NAME_RE = /^[a-z0-9_]{1,64}$/;
const VARIABLE_RE = /^[\w.:#/–-]{1,140}$/;
const MAX_VALUES = 48;
const MAX_VARIABLES = 96;

/**
 * Scenario execution for the Plane: the caller names a program,
 * overrides input values by bare name, and asks for trace variables.
 * The server grafts the overrides onto the package's canonical
 * sample household — the household *shape* always comes from the
 * registry, never the browser — and executes. Values are grafted
 * onto every entity leaf carrying the key, which matches how the
 * graph's input nodes are named.
 */
export async function POST(request: Request) {
  if (!isRuntimeApiConfigured()) {
    return NextResponse.json(
      { error: "runtime_unconfigured" },
      { status: 503 }
    );
  }
  if (isRateLimited(clientKey(request))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  let body: {
    jurisdiction?: unknown;
    program_id?: unknown;
    values?: unknown;
    variables?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const jurisdiction = body.jurisdiction;
  const programId = body.program_id;
  if (
    typeof jurisdiction !== "string" ||
    typeof programId !== "string" ||
    !SLUG_RE.test(jurisdiction) ||
    !SLUG_RE.test(programId)
  ) {
    return NextResponse.json({ error: "invalid_program" }, { status: 400 });
  }

  const values: Record<string, number | boolean> = {};
  if (body.values && typeof body.values === "object") {
    for (const [key, value] of Object.entries(
      body.values as Record<string, unknown>
    )) {
      if (!INPUT_NAME_RE.test(key)) continue;
      if (typeof value !== "number" && typeof value !== "boolean") continue;
      if (typeof value === "number" && !Number.isFinite(value)) continue;
      values[key] = value;
      if (Object.keys(values).length >= MAX_VALUES) break;
    }
  }

  const variables = Array.isArray(body.variables)
    ? (body.variables as unknown[])
        .filter(
          (item): item is string =>
            typeof item === "string" && VARIABLE_RE.test(item)
        )
        .slice(0, MAX_VARIABLES)
    : [];

  const detail = await getRuntimePackage(jurisdiction, programId);
  if (!detail?.sample_request) {
    return NextResponse.json({ error: "package_not_found" }, { status: 404 });
  }

  const sample = structuredClone(detail.sample_request) as Record<
    string,
    unknown
  >;
  const matched = graftValues(sample.household, values);
  const baseVariables = Array.isArray(sample.variables)
    ? (sample.variables as string[])
    : (detail.default_outputs ?? []);
  sample.variables = [...new Set([...baseVariables, ...variables])];

  // Compiled samples ship as full entity dumps whose inputs the
  // engine does not rebind (verified 2026-07-22: editing any leaf
  // leaves outputs unchanged, while the API's abstract household
  // shape computes). When the graft finds no purchase, speak the
  // abstract shape instead: person + unit, scenario values as unit
  // fields — the mapping layer resolves them.
  let request_: Record<string, unknown> = sample;
  if (Object.keys(values).length > 0) {
    const { age, ...unitValues } = values;
    request_ = {
      program_id: programId,
      jurisdiction,
      household: {
        people: { person_1: { age: typeof age === "number" ? age : 40 } },
        spm_units: { unit_1: unitValues },
      },
      variables: sample.variables,
    };
  }

  const result = await runCalculate(request_);
  if (!result) {
    return NextResponse.json({ error: "calculate_failed" }, { status: 502 });
  }
  return NextResponse.json(
    {
      outputs: result.outputs,
      trace: result.trace ?? [],
      period: detail.default_period ?? null,
      applied: Object.keys(values),
      grafted: Object.keys(values).length > 0 ? "abstract" : "sample",
    },
    { headers: { "cache-control": "no-store" } }
  );
}

/** Replace every leaf whose key matches an override, at any depth of
 *  the household structure. Returns how many leaves matched. */
function graftValues(
  node: unknown,
  values: Record<string, number | boolean>
): number {
  if (!node || typeof node !== "object") return 0;
  let matched = 0;
  for (const [key, child] of Object.entries(node as Record<string, unknown>)) {
    if (
      key in values &&
      (typeof child === "number" || typeof child === "boolean")
    ) {
      (node as Record<string, unknown>)[key] = values[key];
      matched++;
    } else {
      matched += graftValues(child, values);
    }
  }
  return matched;
}
