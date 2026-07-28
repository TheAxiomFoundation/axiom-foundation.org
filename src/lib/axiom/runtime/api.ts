/**
 * Server-side client for the hosted Axiom API's runtime-package
 * surface: the package registry and per-program rule graphs. This is
 * the app's first integration with the hosted API — everything
 * executable (packages, graphs, later calculate) comes from here,
 * while corpus text stays on Supabase.
 *
 * Env-gated: without AXIOM_RUNTIME_API_KEY every call resolves to an
 * empty result and pages render exactly as before. The key must stay
 * server-side — client components consume derived data through
 * server props, never this module.
 */

const DEFAULT_BASE = "https://axiom-api-eta.vercel.app/v1";
const REQUEST_TIMEOUT_MS = 4000;
const CALCULATE_TIMEOUT_MS = 15000;
const REVALIDATE_SECONDS = 600;

export interface RuntimePackageSummary {
  program_id: string;
  jurisdiction: string;
  runtime_id: string;
  mode: "fixture" | "compiled";
  status: "ready" | "unavailable";
  default_outputs: string[];
  output_count?: number;
  entity_count?: number;
  input_count?: number;
}

/** Subset of the API's GraphRuleNode the app consumes. */
export interface GraphRuleNode {
  legalId: string;
  name: string;
  fileLegalId: string;
  kind: "derived" | "parameter";
  source: string | null;
  sourceUrl: string | null;
  ruleDeps: string[];
  inputDeps: string[];
}

export interface ProgramGraph {
  rules: GraphRuleNode[];
  ownOutputs: string[];
  terminalOutputs: string[];
}

/**
 * Configured means either a key (hosted API) or an explicit base
 * override (a local axiom-api instance, which runs without auth).
 */
export function isRuntimeApiConfigured(): boolean {
  return Boolean(
    process.env.AXIOM_RUNTIME_API_KEY || process.env.AXIOM_RUNTIME_API_BASE
  );
}

function apiBase(): string {
  return (process.env.AXIOM_RUNTIME_API_BASE ?? DEFAULT_BASE).replace(
    /\/$/,
    ""
  );
}

/**
 * Every 2xx payload is a `{ status: "ok", data: … }` envelope;
 * returns the endpoint payload or null on any transport, HTTP, or
 * envelope failure.
 */
async function runtimeGet<T>(path: string): Promise<T | null> {
  if (!isRuntimeApiConfigured()) return null;
  const key = process.env.AXIOM_RUNTIME_API_KEY;
  try {
    const response = await fetch(`${apiBase()}${path}`, {
      headers: key ? { "x-api-key": key } : undefined,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!response.ok) return null;
    const envelope = (await response.json()) as {
      status?: string;
      data?: T;
    };
    if (envelope.status !== "ok" || envelope.data === undefined) return null;
    return envelope.data;
  } catch {
    return null;
  }
}

export async function listRuntimePackages(): Promise<RuntimePackageSummary[]> {
  const data = await runtimeGet<{ packages: RuntimePackageSummary[] }>(
    "/runtime/packages"
  );
  return data?.packages ?? [];
}

export interface RuntimePackageDetail extends RuntimePackageSummary {
  default_period?: string;
  sample_request?: unknown;
  outputs?: Array<{ name: string; legal_id: string; alias_for?: string }>;
}

export async function getRuntimePackage(
  jurisdiction: string,
  programId: string
): Promise<RuntimePackageDetail | null> {
  const data = await runtimeGet<{ package: RuntimePackageDetail }>(
    `/runtime/packages/${encodeURIComponent(jurisdiction)}/${encodeURIComponent(
      programId
    )}`
  );
  return data?.package ?? null;
}

export interface CalculateTraceEntry {
  rule_id: string;
  variable: string;
  value: number | string | boolean | null;
  sources: string[];
}

export interface CalculateResult {
  outputs: Record<string, number | string | boolean | null>;
  trace?: CalculateTraceEntry[];
}

/** POST /v1/calculate. Uncached — every run executes. */
export async function runCalculate(
  request: unknown
): Promise<CalculateResult | null> {
  if (!isRuntimeApiConfigured()) return null;
  const key = process.env.AXIOM_RUNTIME_API_KEY;
  try {
    const response = await fetch(`${apiBase()}/calculate`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(key ? { "x-api-key": key } : {}),
      },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(CALCULATE_TIMEOUT_MS),
      cache: "no-store",
    });
    if (!response.ok) return null;
    const envelope = (await response.json()) as {
      status?: string;
      data?: CalculateResult;
    };
    if (envelope.status !== "ok" || !envelope.data?.outputs) return null;
    return envelope.data;
  } catch {
    return null;
  }
}

export async function getProgramGraph(
  jurisdiction: string,
  programId: string
): Promise<ProgramGraph | null> {
  const data = await runtimeGet<{ graph: ProgramGraph }>(
    `/runtime/packages/${encodeURIComponent(jurisdiction)}/${encodeURIComponent(
      programId
    )}/graph`
  );
  return data?.graph ?? null;
}
