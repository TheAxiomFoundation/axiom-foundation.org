import { NextResponse } from "next/server";
import {
  getRuntimePackage,
  runCalculate,
  isRuntimeApiConfigured,
} from "@/lib/axiom/runtime/api";
import { clientKey, isRateLimited } from "../run/limiter";

export const dynamic = "force-dynamic";

const SLUG_RE = /^[a-z0-9-]{1,64}$/;
const INPUT_NAME_RE = /^[a-z0-9_]{1,80}$/;
const VARIABLE_RE = /^[\w.:#/–-]{1,140}$/;
const MAX_VALUES = 64;
const MAX_VARIABLES = 96;

/**
 * Scenario execution for the Plane. The caller names a program,
 * answers inputs by their REAL registry names, and asks for trace
 * variables. Values are grafted onto the package's entity household
 * exactly where the registry says each input lives — every input
 * the law asks is settable, verified end to end (grafting
 * employee_wages_received moves gross income; household_size moves
 * the allotment table).
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
  // Values rejected for TYPE reasons (NaN/Infinity, wrong type) are
  // reported in `dropped` — silent filtering hid client bugs.
  const rejected: string[] = [];
  if (body.values && typeof body.values === "object") {
    for (const [key, value] of Object.entries(
      body.values as Record<string, unknown>
    )) {
      if (!INPUT_NAME_RE.test(key)) continue;
      if (
        (typeof value !== "number" && typeof value !== "boolean") ||
        (typeof value === "number" && !Number.isFinite(value))
      ) {
        rejected.push(key);
        continue;
      }
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

  const sample = structuredClone(detail.sample_request) as {
    household?: { entities?: Record<string, Record<string, Record<string, unknown>>> };
    variables?: unknown;
  } & Record<string, unknown>;
  const baseVariables = Array.isArray(sample.variables)
    ? (sample.variables as string[])
    : (detail.default_outputs ?? []);
  sample.variables = [...new Set([...baseVariables, ...variables])];

  // Graft each value onto the entity that owns the input per the
  // package registry — adding the key when the sample omits it.
  const applied: string[] = [];
  const entities = sample.household?.entities ?? {};
  for (const entity of detail.entities ?? []) {
    const container = entities[entity.entity];
    if (!container) continue;
    for (const input of entity.inputs ?? []) {
      if (!(input.name in values)) continue;
      for (const instance of Object.values(container)) {
        instance[input.name] = values[input.name];
      }
      applied.push(input.name);
    }
  }

  const result = await runCalculate(sample);
  if (result && "uncertified" in result) {
    // The engine refused because a requested variable isn't in the
    // certification ledger — a state the client must present, not a
    // transport failure. The client names what it asked for; the API
    // (and this route) never echo node ids.
    return NextResponse.json({ error: "uncertified_node" }, { status: 422 });
  }
  if (!result) {
    return NextResponse.json({ error: "calculate_failed" }, { status: 502 });
  }
  return NextResponse.json(
    {
      outputs: result.outputs,
      trace: result.trace ?? [],
      period: detail.default_period ?? null,
      provenance: result.provenance ?? null,
      applied,
      dropped: [
        ...Object.keys(values).filter((name) => !applied.includes(name)),
        ...rejected,
      ],
    },
    { headers: { "cache-control": "no-store" } }
  );
}
