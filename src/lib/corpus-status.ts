import { createHash, createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

const STATUS_REVALIDATE_SECONDS = 300;
const BUNDLED_STATUS_ROOT = "public/ops-status";

export const STATE_STATUTE_COMPLETION_KEY =
  "analytics/state-statute-completion-current.json";
export const REGULATION_COMPLETION_KEY =
  "analytics/regulation-completion-current.json";
export const SOURCE_DISCOVERY_KEY =
  "analytics/source-discovery-current.json";
export const ARTIFACT_REPORT_KEY = "analytics/artifact-report-current-r2.json";
export const VALIDATION_REPORT_KEY = "analytics/validate-release-current.json";
const DEFAULT_PROVISION_COUNTS_KEY = "snapshots/provision-counts-2026-05-02.json";
const ENCODING_STATUS_KEY = "supabase://encodings.encoding_runs";
const ENCODING_LOOKBACK_DAYS = 7;

export type CorpusArtifactSource =
  | "status-url"
  | "r2"
  | "local"
  | "bundled"
  | "supabase";

export interface CorpusCompletionRow {
  jurisdiction: string;
  name: string;
  status: string;
  supabase_count: number | null;
  release_provision_count: number | null;
  release_version: string | null;
  best_local_provision_count: number | null;
  best_local_version: string | null;
  local_complete: boolean;
  r2_complete: boolean | null;
  supabase_matches_release: boolean | null;
  next_action: string;
  mismatch_reasons: string[];
  source_access_status?: string | null;
  source_access_note?: string | null;
  validation_error_count: number;
  validation_warning_count: number;
  coverage_complete?: boolean;
  local_scope_count?: number;
  release_scope_present?: boolean;
  validation_codes?: string[];
}

export interface CorpusCompletionReport {
  complete: boolean;
  document_class?: string;
  expected_jurisdiction_count: number;
  productionized_and_validated_count: number;
  unfinished_count: number;
  release: string;
  status_counts: Record<string, number>;
  rows: CorpusCompletionRow[];
  unfinished_jurisdictions: string[];
  validation_report_ok: boolean | null;
  validation_report_path: string | null;
  supabase_counts_path: string | null;
  release_statute_scope_count?: number;
  release_regulation_scope_count?: number;
  validation_report_present?: boolean;
  validation_report_truncated?: boolean;
}

export type StateStatuteCompletionRow = CorpusCompletionRow;
export type RegulationCompletionRow = CorpusCompletionRow;
export type StateStatuteCompletionReport = CorpusCompletionReport;
export type RegulationCompletionReport = CorpusCompletionReport;

export interface ArtifactScopeRow {
  jurisdiction: string;
  document_class: string;
  version: string;
  provision_count: number;
  source_count: number;
  local_complete: boolean;
  r2_complete: boolean | null;
  coverage_complete: boolean;
  supabase_count: number | null;
  supabase_matches_provisions: boolean | null;
  mismatch_reasons: string[];
}

export interface ArtifactReport {
  release: string;
  scope_count: number;
  release_scope_count: number;
  local_count: number;
  remote_count: number;
  local_bytes: number;
  remote_bytes: number;
  mismatch_count: number;
  supabase_group_count: number;
  supabase_mismatch_count: number;
  rows: ArtifactScopeRow[];
}

export interface ValidationIssue {
  severity: "error" | "warning" | string;
  code: string;
  jurisdiction: string;
  document_class: string;
  version: string;
  message: string;
}

export interface ValidationReport {
  ok: boolean;
  release: string;
  scope_count: number;
  error_count: number;
  warning_count: number;
  issue_count: number;
  issues_truncated: boolean;
  issues: ValidationIssue[];
}

export interface ProvisionCountRow {
  jurisdiction: string;
  document_class: string;
  provision_count: number;
  body_count: number;
  top_level_count: number;
  rulespec_count: number;
  refreshed_at: string;
}

export interface ProvisionCountsSnapshot {
  refreshed_at: string | null;
  rows: ProvisionCountRow[];
}

export interface SourceDiscoveryDomainRow {
  host: string;
  url_count: number;
  ready_for_manifest_count: number;
  needs_review_count: number;
  excluded_count: number;
  release_scope_present_count: number;
  source_status_counts: Record<string, number>;
  disposition_counts: Record<string, number>;
  document_class_counts: Record<string, number>;
  jurisdiction_counts: Record<string, number>;
  sample_urls: string[];
}

export interface SourceDiscoveryReport {
  generated_at: string;
  source_name: string;
  input_paths: string[];
  raw_url_count: number;
  invalid_url_count: number;
  unique_url_count: number;
  release: string | null;
  release_scope_count: number;
  ready_for_manifest_count: number;
  needs_review_count: number;
  blocked_or_excluded_count: number;
  release_scope_present_count: number;
  source_status_counts: Record<string, number>;
  disposition_counts: Record<string, number>;
  document_class_counts: Record<string, number>;
  jurisdiction_counts: Record<string, number>;
  domain_rows: SourceDiscoveryDomainRow[];
  corpus_source_policy?: string;
}

export interface EncodingStatusRun {
  id: string;
  timestamp: string;
  citation: string | null;
  total_duration_ms: number | null;
  agent_type: string | null;
  agent_model: string | null;
  data_source: string | null;
  has_issues: boolean | null;
  session_id: string | null;
  encoder_version: string | null;
}

export interface EncodingStatusSession {
  id: string;
  started_at: string;
  ended_at: string | null;
  model: string | null;
  event_count: number;
  input_tokens: number;
  output_tokens: number;
  estimated_cost_usd: number;
  encoder_version: string | null;
}

export interface EncodingOpsStatus {
  refreshed_at: string;
  lookback_days: number;
  run_count: number | null;
  recent_run_count: number | null;
  issue_run_count: number | null;
  active_session_count: number | null;
  latest_runs: EncodingStatusRun[];
  latest_sessions: EncodingStatusSession[];
  latest_source_counts: Record<string, number>;
}

export interface CorpusStatusArtifact<T> {
  key: string;
  source: CorpusArtifactSource | null;
  value: T | null;
  error: string | null;
}

export interface CorpusStatusData {
  stateStatutes: CorpusStatusArtifact<StateStatuteCompletionReport>;
  regulations: CorpusStatusArtifact<RegulationCompletionReport>;
  artifactReport: CorpusStatusArtifact<ArtifactReport>;
  validationReport: CorpusStatusArtifact<ValidationReport>;
  provisionCounts: CorpusStatusArtifact<ProvisionCountsSnapshot>;
  sourceDiscovery: CorpusStatusArtifact<SourceDiscoveryReport>;
  encodingStatus: CorpusStatusArtifact<EncodingOpsStatus>;
}

export interface R2Config {
  endpoint: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export interface SupabaseRestConfig {
  url: string;
  anonKey: string;
}

interface ReadAttempt<T> {
  source: CorpusArtifactSource;
  value: T;
}

export async function getCorpusStatus(): Promise<CorpusStatusData> {
  const [
    stateStatutes,
    regulations,
    artifactReport,
    validationReport,
    sourceDiscovery,
  ] =
    await Promise.all([
      readCorpusJson<StateStatuteCompletionReport>(STATE_STATUTE_COMPLETION_KEY),
      readCorpusJson<RegulationCompletionReport>(REGULATION_COMPLETION_KEY),
      readCorpusJson<ArtifactReport>(ARTIFACT_REPORT_KEY),
      readCorpusJson<ValidationReport>(VALIDATION_REPORT_KEY),
      readCorpusJson<SourceDiscoveryReport>(SOURCE_DISCOVERY_KEY),
    ]);

  const provisionCountsKey =
    process.env.AXIOM_CORPUS_PROVISION_COUNTS_KEY ??
    provisionCountsKeyFromCompletionReports(regulations.value, stateStatutes.value) ??
    DEFAULT_PROVISION_COUNTS_KEY;

  const [provisionCounts, encodingStatus] = await Promise.all([
    readCorpusJson<ProvisionCountsSnapshot>(provisionCountsKey),
    readEncodingStatus(),
  ]);

  return {
    stateStatutes,
    regulations,
    artifactReport,
    validationReport,
    provisionCounts,
    sourceDiscovery,
    encodingStatus,
  };
}

export function provisionCountsKeyFromStateReport(
  report: StateStatuteCompletionReport | null
): string | null {
  return provisionCountsKeyFromCompletionReports(report);
}

export function provisionCountsKeyFromCompletionReports(
  ...reports: Array<CorpusCompletionReport | null>
): string | null {
  for (const report of reports) {
    if (report?.supabase_counts_path) {
      return corpusKeyFromPath(report.supabase_counts_path);
    }
  }
  return null;
}

export function corpusKeyFromPath(value: string): string {
  const normalized = value.replaceAll("\\", "/");
  const marker = "data/corpus/";
  const markerIndex = normalized.indexOf(marker);
  if (markerIndex >= 0) {
    return normalized.slice(markerIndex + marker.length);
  }
  return normalized.replace(/^\/+/, "");
}

async function readCorpusJson<T>(key: string): Promise<CorpusStatusArtifact<T>> {
  const errors: string[] = [];

  const statusBaseUrl = process.env.AXIOM_CORPUS_STATUS_BASE_URL;
  if (statusBaseUrl) {
    try {
      return {
        key,
        ...(await readFromStatusUrl<T>(statusBaseUrl, key)),
        error: null,
      };
    } catch (error) {
      errors.push(errorMessage(error));
    }
  }

  const r2Config = getR2Config();
  if (r2Config) {
    try {
      return {
        key,
        ...(await readFromR2<T>(r2Config, key)),
        error: null,
      };
    } catch (error) {
      errors.push(errorMessage(error));
    }
  }

  const localRoot = cleanEnvValue(process.env.AXIOM_CORPUS_LOCAL_ROOT);
  if (localRoot) {
    try {
      return {
        key,
        ...(await readFromLocal<T>(localRoot, key)),
        error: null,
      };
    } catch (error) {
      errors.push(errorMessage(error));
    }
  } else if (!shouldReadBundledStatus()) {
    errors.push("AXIOM_CORPUS_LOCAL_ROOT is not configured");
  }

  if (shouldReadBundledStatus()) {
    try {
      return {
        key,
        ...(await readFromBundled<T>(key)),
        error: null,
      };
    } catch (error) {
      errors.push(errorMessage(error));
    }
  }

  return {
    key,
    source: null,
    value: null,
    error: errors.length > 0 ? errors.join(" | ") : "No corpus status source configured",
  };
}

async function readEncodingStatus(): Promise<CorpusStatusArtifact<EncodingOpsStatus>> {
  try {
    return {
      key: ENCODING_STATUS_KEY,
      source: "supabase",
      value: await readEncodingStatusFromSupabase(),
      error: null,
    };
  } catch (error) {
    return {
      key: ENCODING_STATUS_KEY,
      source: null,
      value: null,
      error: errorMessage(error),
    };
  }
}

async function readEncodingStatusFromSupabase(): Promise<EncodingOpsStatus> {
  const config = getSupabaseRestConfig();
  if (!config) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured");
  }

  const since = new Date(
    Date.now() - ENCODING_LOOKBACK_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  const [
    runCount,
    recentRunCount,
    issueRunCount,
    activeSessionCount,
    latestRuns,
    latestSessions,
  ] = await Promise.all([
    readSupabaseCount(config, "encodings", "encoding_runs"),
    readSupabaseCount(config, "encodings", "encoding_runs", {
      timestamp: `gte.${since}`,
    }),
    readSupabaseCount(config, "encodings", "encoding_runs", {
      has_issues: "eq.true",
    }),
    readSupabaseCount(config, "telemetry", "sdk_sessions", {
      ended_at: "is.null",
    }),
    readSupabaseRows<EncodingStatusRun>(config, "encodings", "encoding_runs", {
      select:
        "id,timestamp,citation,total_duration_ms,agent_type,agent_model,data_source,has_issues,session_id,encoder_version",
      order: "timestamp.desc",
      limit: "12",
    }),
    readSupabaseRows<EncodingStatusSession>(config, "telemetry", "sdk_sessions", {
      select:
        "id,started_at,ended_at,model,event_count,input_tokens,output_tokens,estimated_cost_usd,encoder_version",
      order: "started_at.desc",
      limit: "8",
    }),
  ]);

  return {
    refreshed_at: new Date().toISOString(),
    lookback_days: ENCODING_LOOKBACK_DAYS,
    run_count: runCount,
    recent_run_count: recentRunCount,
    issue_run_count: issueRunCount,
    active_session_count: activeSessionCount,
    latest_runs: latestRuns,
    latest_sessions: latestSessions,
    latest_source_counts: summarizeLatestSources(latestRuns),
  };
}

async function readSupabaseRows<T>(
  config: SupabaseRestConfig,
  schema: string,
  table: string,
  query: Record<string, string>
): Promise<T[]> {
  const response = await fetch(supabaseRestUrl(config, table, query), {
    headers: supabaseRestHeaders(config, schema),
    next: { revalidate: STATUS_REVALIDATE_SECONDS },
  } as RequestInit);

  if (!response.ok) {
    throw new Error(`Supabase returned ${response.status} for ${schema}.${table}`);
  }

  const value = await response.json();
  if (!Array.isArray(value)) {
    throw new Error(`Supabase returned a non-array payload for ${schema}.${table}`);
  }
  return value as T[];
}

async function readSupabaseCount(
  config: SupabaseRestConfig,
  schema: string,
  table: string,
  filters: Record<string, string> = {}
): Promise<number | null> {
  const response = await fetch(
    supabaseRestUrl(config, table, {
      select: "id",
      limit: "1",
      ...filters,
    }),
    {
      headers: {
        ...supabaseRestHeaders(config, schema),
        Prefer: "count=exact",
      },
      next: { revalidate: STATUS_REVALIDATE_SECONDS },
    } as RequestInit
  );

  if (!response.ok) {
    throw new Error(`Supabase returned ${response.status} for ${schema}.${table}`);
  }

  return countFromContentRange(response.headers.get("content-range"));
}

export function countFromContentRange(value: string | null): number | null {
  const match = value?.match(/\/(\d+)$/);
  return match ? Number(match[1]) : null;
}

export function supabaseRestUrl(
  config: SupabaseRestConfig,
  table: string,
  query: Record<string, string>
): string {
  const url = new URL(`/rest/v1/${table}`, ensureTrailingSlash(config.url));
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

function supabaseRestHeaders(
  config: SupabaseRestConfig,
  schema: string
): Record<string, string> {
  return {
    apikey: config.anonKey,
    Authorization: `Bearer ${config.anonKey}`,
    "Accept-Profile": schema,
  };
}

async function readFromStatusUrl<T>(
  baseUrl: string,
  key: string
): Promise<ReadAttempt<T>> {
  const url = new URL(corpusKeyFromPath(key), ensureTrailingSlash(baseUrl));
  const response = await fetch(url, {
    next: { revalidate: STATUS_REVALIDATE_SECONDS },
  } as RequestInit);
  if (!response.ok) {
    throw new Error(`Status URL returned ${response.status} for ${key}`);
  }
  return { source: "status-url", value: (await response.json()) as T };
}

async function readFromR2<T>(
  config: R2Config,
  key: string
): Promise<ReadAttempt<T>> {
  const request = buildR2GetRequest(config, corpusKeyFromPath(key));
  const response = await fetch(request.url, {
    headers: request.headers,
    next: { revalidate: STATUS_REVALIDATE_SECONDS },
  } as RequestInit);
  if (!response.ok) {
    throw new Error(`R2 returned ${response.status} for ${key}`);
  }
  return { source: "r2", value: (await response.json()) as T };
}

async function readFromLocal<T>(
  localRoot: string,
  key: string
): Promise<ReadAttempt<T>> {
  const filePath = path.join(localRoot, corpusKeyFromPath(key));
  const text = await readFile(filePath, "utf8");
  return { source: "local", value: JSON.parse(text) as T };
}

async function readFromBundled<T>(key: string): Promise<ReadAttempt<T>> {
  const filePath = path.join(
    process.cwd(),
    BUNDLED_STATUS_ROOT,
    corpusKeyFromPath(key)
  );
  const text = await readFile(filePath, "utf8");
  return { source: "bundled", value: JSON.parse(text) as T };
}

function shouldReadBundledStatus(): boolean {
  const configured = cleanEnvValue(process.env.AXIOM_CORPUS_BUNDLED_STATUS);
  if (configured) {
    return configured !== "0" && configured.toLowerCase() !== "false";
  }
  return process.env.VERCEL === "1" || process.env.VERCEL === "true";
}

function getR2Config(): R2Config | null {
  const endpoint = cleanEnvValue(
    process.env.AXIOM_CORPUS_R2_ENDPOINT ?? process.env.R2_ENDPOINT
  );
  const bucket = cleanEnvValue(
    process.env.AXIOM_CORPUS_R2_BUCKET ?? process.env.R2_BUCKET
  );
  const accessKeyId = cleanEnvValue(
    process.env.AXIOM_CORPUS_R2_ACCESS_KEY_ID ?? process.env.R2_ACCESS_KEY_ID
  );
  const secretAccessKey = cleanEnvValue(
    process.env.AXIOM_CORPUS_R2_SECRET_ACCESS_KEY ??
      process.env.R2_SECRET_ACCESS_KEY
  );

  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    return null;
  }

  return { endpoint, bucket, accessKeyId, secretAccessKey };
}

function getSupabaseRestConfig(): SupabaseRestConfig | null {
  const url = cleanEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey = cleanEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (!url || !anonKey) {
    return null;
  }

  return { url, anonKey };
}

function summarizeLatestSources(
  runs: EncodingStatusRun[]
): Record<string, number> {
  return runs.reduce<Record<string, number>>((counts, run) => {
    const key = run.data_source ?? "unknown";
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

export function buildR2GetRequest(
  config: R2Config,
  key: string,
  now = new Date()
): { url: string; headers: Record<string, string> } {
  const endpoint = config.endpoint.trim().replace(/\/+$/, "");
  const endpointUrl = new URL(endpoint);
  const bucket = config.bucket.trim();
  const accessKeyId = config.accessKeyId.trim();
  const secretAccessKey = config.secretAccessKey.trim();
  const canonicalUri = `/${encodeS3Path(bucket)}/${encodeS3Path(key)}`;
  const url = `${endpoint}${canonicalUri}`;
  const amzDate = toAmzDate(now);
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = "UNSIGNED-PAYLOAD";
  const credentialScope = `${dateStamp}/auto/s3/aws4_request`;
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
  const canonicalHeaders =
    `host:${endpointUrl.host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n`;
  const canonicalRequest = [
    "GET",
    canonicalUri,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");
  const signingKey = getSigningKey(secretAccessKey, dateStamp);
  const signature = createHmac("sha256", signingKey)
    .update(stringToSign, "utf8")
    .digest("hex");

  return {
    url,
    headers: {
      Authorization:
        `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, ` +
        `SignedHeaders=${signedHeaders}, Signature=${signature}`,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
    },
  };
}

function getSigningKey(secretAccessKey: string, dateStamp: string): Buffer {
  const kDate = hmac(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = hmac(kDate, "auto");
  const kService = hmac(kRegion, "s3");
  return hmac(kService, "aws4_request");
}

function hmac(key: string | Buffer, value: string): Buffer {
  return createHmac("sha256", key).update(value, "utf8").digest();
}

function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function toAmzDate(date: Date): string {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

function encodeS3Path(value: string): string {
  return value.split("/").map(encodeURIComponent).join("/");
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function errorMessage(error: unknown): string {
  return redactSensitiveError(error instanceof Error ? error.message : String(error));
}

function cleanEnvValue(value: string | undefined): string | undefined {
  const cleaned = value?.trim();
  return cleaned || undefined;
}

function redactSensitiveError(message: string): string {
  return message
    .replace(
      /AWS4-HMAC-SHA256 Credential=[^"]+/g,
      "AWS4-HMAC-SHA256 Credential=[redacted]"
    )
    .replace(/Signature=[0-9a-f]+/gi, "Signature=[redacted]")
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/g, "Bearer [redacted]");
}
