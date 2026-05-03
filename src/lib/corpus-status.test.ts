import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildR2GetRequest,
  countFromContentRange,
  corpusKeyFromPath,
  getCorpusStatus,
  provisionCountsKeyFromStateReport,
  supabaseRestUrl,
  type R2Config,
  type SupabaseRestConfig,
} from "./corpus-status";

const stateReport = {
  complete: false,
  expected_jurisdiction_count: 51,
  productionized_and_validated_count: 14,
  unfinished_count: 37,
  release: "current",
  status_counts: {},
  rows: [],
  unfinished_jurisdictions: [],
  validation_report_ok: true,
  validation_report_path: null,
  supabase_counts_path: "data/corpus/snapshots/provision-counts-test.json",
};

const artifactReport = {
  release: "current",
  scope_count: 1,
  release_scope_count: 1,
  local_count: 2,
  remote_count: 2,
  local_bytes: 10,
  remote_bytes: 10,
  mismatch_count: 0,
  supabase_group_count: 1,
  supabase_mismatch_count: 0,
  rows: [],
};

const validationReport = {
  ok: true,
  release: "current",
  scope_count: 1,
  error_count: 0,
  warning_count: 0,
  issue_count: 0,
  issues_truncated: false,
  issues: [],
};

const provisionCounts = {
  refreshed_at: "2026-05-03T12:00:00.000Z",
  rows: [],
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("corpus status helpers", () => {
  it("normalizes local data/corpus paths to artifact keys", () => {
    expect(
      corpusKeyFromPath("data/corpus/analytics/state-statute-completion-current.json")
    ).toBe("analytics/state-statute-completion-current.json");
    expect(
      corpusKeyFromPath(
        "/Users/maxghenis/TheAxiomFoundation/axiom-corpus/data/corpus/snapshots/provision-counts-2026-05-02.json"
      )
    ).toBe("snapshots/provision-counts-2026-05-02.json");
  });

  it("derives provision count snapshot keys from the state completion report", () => {
    expect(
      provisionCountsKeyFromStateReport({
        complete: false,
        expected_jurisdiction_count: 51,
        productionized_and_validated_count: 14,
        unfinished_count: 37,
        release: "current",
        status_counts: {},
        rows: [],
        unfinished_jurisdictions: [],
        validation_report_ok: true,
        validation_report_path: null,
        supabase_counts_path:
          "data/corpus/snapshots/provision-counts-2026-05-02.json",
      })
    ).toBe("snapshots/provision-counts-2026-05-02.json");
  });

  it("builds an authenticated R2 GET request without placing secrets in the URL", () => {
    const config: R2Config = {
      endpoint: "https://example.r2.cloudflarestorage.com",
      bucket: "axiom-corpus",
      accessKeyId: "access-key",
      secretAccessKey: "secret-key",
    };

    const request = buildR2GetRequest(
      config,
      "analytics/state statute completion.json",
      new Date("2026-05-03T12:34:56.000Z")
    );

    expect(request.url).toBe(
      "https://example.r2.cloudflarestorage.com/axiom-corpus/analytics/state%20statute%20completion.json"
    );
    expect(request.url).not.toContain("secret-key");
    expect(request.headers["x-amz-date"]).toBe("20260503T123456Z");
    expect(request.headers.Authorization).toContain(
      "Credential=access-key/20260503/auto/s3/aws4_request"
    );
    expect(request.headers.Authorization).toContain("Signature=");
  });

  it("builds schema REST URLs for Supabase status reads", () => {
    const config: SupabaseRestConfig = {
      url: "https://example.supabase.co",
      anonKey: "anon-key",
    };

    expect(
      supabaseRestUrl(config, "encoding_runs", {
        select: "id,timestamp",
        order: "timestamp.desc",
        limit: "12",
      })
    ).toBe(
      "https://example.supabase.co/rest/v1/encoding_runs?select=id%2Ctimestamp&order=timestamp.desc&limit=12"
    );
  });

  it("parses exact Supabase counts from content-range", () => {
    expect(countFromContentRange("0-0/42")).toBe(42);
    expect(countFromContentRange("*/0")).toBe(0);
    expect(countFromContentRange(null)).toBeNull();
  });

  it("loads corpus artifacts from a status URL and encoding status from Supabase", async () => {
    vi.stubEnv("AXIOM_CORPUS_STATUS_BASE_URL", "https://status.example/");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
    vi.stubGlobal("fetch", vi.fn(mockStatusFetch));

    const status = await getCorpusStatus();

    expect(status.stateStatutes.source).toBe("status-url");
    expect(status.provisionCounts.key).toBe("snapshots/provision-counts-test.json");
    expect(status.encodingStatus.source).toBe("supabase");
    expect(status.encodingStatus.value?.run_count).toBe(42);
    expect(status.encodingStatus.value?.recent_run_count).toBe(5);
    expect(status.encodingStatus.value?.issue_run_count).toBe(1);
    expect(status.encodingStatus.value?.active_session_count).toBe(1);
    expect(status.encodingStatus.value?.latest_source_counts).toEqual({
      reviewer_agent: 1,
    });
  });

  it("loads corpus artifacts from a local root when no remote source is configured", async () => {
    const root = path.join(tmpdir(), `axiom-corpus-status-${crypto.randomUUID()}`);
    await writeJson(path.join(root, "analytics/state-statute-completion-current.json"), stateReport);
    await writeJson(path.join(root, "analytics/artifact-report-current-r2.json"), artifactReport);
    await writeJson(path.join(root, "analytics/validate-release-current.json"), validationReport);
    await writeJson(path.join(root, "snapshots/provision-counts-test.json"), provisionCounts);
    vi.stubEnv("AXIOM_CORPUS_LOCAL_ROOT", root);
    vi.stubEnv("AXIOM_CORPUS_STATUS_BASE_URL", "");
    vi.stubEnv("AXIOM_CORPUS_R2_ENDPOINT", "");
    vi.stubEnv("AXIOM_CORPUS_R2_BUCKET", "");
    vi.stubEnv("AXIOM_CORPUS_R2_ACCESS_KEY_ID", "");
    vi.stubEnv("AXIOM_CORPUS_R2_SECRET_ACCESS_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");

    try {
      const status = await getCorpusStatus();

      expect(status.stateStatutes.source).toBe("local");
      expect(status.artifactReport.value?.local_count).toBe(2);
      expect(status.encodingStatus.value).toBeNull();
      expect(status.encodingStatus.error).toMatch(/NEXT_PUBLIC_SUPABASE_URL/);
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  });

  it("loads corpus artifacts from R2 when R2 credentials are configured", async () => {
    vi.stubEnv("AXIOM_CORPUS_STATUS_BASE_URL", "");
    vi.stubEnv("AXIOM_CORPUS_R2_ENDPOINT", "https://r2.example.com");
    vi.stubEnv("AXIOM_CORPUS_R2_BUCKET", "axiom-corpus");
    vi.stubEnv("AXIOM_CORPUS_R2_ACCESS_KEY_ID", "access-key");
    vi.stubEnv("AXIOM_CORPUS_R2_SECRET_ACCESS_KEY", "secret-key");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    vi.stubGlobal("fetch", vi.fn(mockR2Fetch));

    const status = await getCorpusStatus();

    expect(status.stateStatutes.source).toBe("r2");
    expect(status.validationReport.value?.ok).toBe(true);
    expect(status.provisionCounts.source).toBe("r2");
  });

  it("falls through to local artifacts when a status URL read fails", async () => {
    const root = path.join(tmpdir(), `axiom-corpus-status-${crypto.randomUUID()}`);
    await writeJson(path.join(root, "analytics/state-statute-completion-current.json"), stateReport);
    await writeJson(path.join(root, "analytics/artifact-report-current-r2.json"), artifactReport);
    await writeJson(path.join(root, "analytics/validate-release-current.json"), validationReport);
    await writeJson(path.join(root, "snapshots/provision-counts-test.json"), provisionCounts);
    vi.stubEnv("AXIOM_CORPUS_STATUS_BASE_URL", "https://status.example/");
    vi.stubEnv("AXIOM_CORPUS_LOCAL_ROOT", root);
    vi.stubEnv("AXIOM_CORPUS_R2_ENDPOINT", "");
    vi.stubEnv("AXIOM_CORPUS_R2_BUCKET", "");
    vi.stubEnv("AXIOM_CORPUS_R2_ACCESS_KEY_ID", "");
    vi.stubEnv("AXIOM_CORPUS_R2_SECRET_ACCESS_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(jsonResponse({}, { status: 503 })))
    );

    try {
      const status = await getCorpusStatus();

      expect(status.stateStatutes.source).toBe("local");
      expect(status.stateStatutes.error).toBeNull();
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  });

  it("returns artifact errors when no corpus source is configured", async () => {
    vi.stubEnv("AXIOM_CORPUS_STATUS_BASE_URL", "");
    vi.stubEnv("AXIOM_CORPUS_LOCAL_ROOT", "");
    vi.stubEnv("AXIOM_CORPUS_R2_ENDPOINT", "");
    vi.stubEnv("AXIOM_CORPUS_R2_BUCKET", "");
    vi.stubEnv("AXIOM_CORPUS_R2_ACCESS_KEY_ID", "");
    vi.stubEnv("AXIOM_CORPUS_R2_SECRET_ACCESS_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");

    const status = await getCorpusStatus();

    expect(status.stateStatutes.value).toBeNull();
    expect(status.stateStatutes.error).toMatch(/AXIOM_CORPUS_LOCAL_ROOT/);
    expect(status.encodingStatus.error).toMatch(/NEXT_PUBLIC_SUPABASE_URL/);
  });

  it("captures R2 and Supabase status read failures", async () => {
    vi.stubEnv("AXIOM_CORPUS_STATUS_BASE_URL", "");
    vi.stubEnv("AXIOM_CORPUS_R2_ENDPOINT", "https://r2.example.com");
    vi.stubEnv("AXIOM_CORPUS_R2_BUCKET", "axiom-corpus");
    vi.stubEnv("AXIOM_CORPUS_R2_ACCESS_KEY_ID", "access-key");
    vi.stubEnv("AXIOM_CORPUS_R2_SECRET_ACCESS_KEY", "secret-key");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
    vi.stubGlobal("fetch", vi.fn(mockFailureFetch));

    const status = await getCorpusStatus();

    expect(status.stateStatutes.error).toMatch(/R2 returned 404/);
    expect(status.encodingStatus.error).toMatch(/Supabase returned 500/);
  });

  it("captures malformed Supabase row payloads", async () => {
    vi.stubEnv("AXIOM_CORPUS_STATUS_BASE_URL", "https://status.example/");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
    vi.stubGlobal("fetch", vi.fn(mockMalformedSupabaseFetch));

    const status = await getCorpusStatus();

    expect(status.stateStatutes.source).toBe("status-url");
    expect(status.encodingStatus.error).toMatch(/non-array payload/);
  });
});

async function writeJson(filePath: string, value: unknown) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(value), "utf8");
}

function mockStatusFetch(input: RequestInfo | URL) {
  const url = new URL(input.toString());

  if (url.hostname === "status.example") {
    const artifacts: Record<string, unknown> = {
      "/analytics/state-statute-completion-current.json": stateReport,
      "/analytics/artifact-report-current-r2.json": artifactReport,
      "/analytics/validate-release-current.json": validationReport,
      "/snapshots/provision-counts-test.json": provisionCounts,
    };
    const value = artifacts[url.pathname];
    return Promise.resolve(jsonResponse(value ?? {}, { status: value ? 200 : 404 }));
  }

  if (url.hostname === "example.supabase.co") {
    if (url.pathname.endsWith("/encoding_runs")) {
      if (url.searchParams.get("select") === "id") {
        const count = url.searchParams.has("timestamp")
          ? 5
          : url.searchParams.has("has_issues")
            ? 1
            : 42;
        return Promise.resolve(jsonResponse([], { contentRange: `0-0/${count}` }));
      }
      return Promise.resolve(
        jsonResponse([
          {
            id: "enc-1",
            timestamp: "2026-05-03T12:00:00.000Z",
            citation: "C.R.S. 26-2-703",
            total_duration_ms: 125000,
            agent_type: "encoder",
            agent_model: "gpt-5.4",
            data_source: "reviewer_agent",
            has_issues: false,
            session_id: "sdk-1",
            encoder_version: "0.4.2",
          },
        ])
      );
    }

    if (url.pathname.endsWith("/sdk_sessions")) {
      if (url.searchParams.get("select") === "id") {
        return Promise.resolve(jsonResponse([], { contentRange: "0-0/1" }));
      }
      return Promise.resolve(
        jsonResponse([
          {
            id: "sdk-1",
            started_at: "2026-05-03T12:00:00.000Z",
            ended_at: null,
            model: "gpt-5.4",
            event_count: 18,
            input_tokens: 1200,
            output_tokens: 800,
            estimated_cost_usd: 0.314,
            encoder_version: "0.4.2",
          },
        ])
      );
    }
  }

  return Promise.resolve(jsonResponse({ message: "not found" }, { status: 404 }));
}

function mockR2Fetch(input: RequestInfo | URL) {
  const url = new URL(input.toString());
  const key = url.pathname.replace("/axiom-corpus/", "/");
  const artifacts: Record<string, unknown> = {
    "/analytics/state-statute-completion-current.json": stateReport,
    "/analytics/artifact-report-current-r2.json": artifactReport,
    "/analytics/validate-release-current.json": validationReport,
    "/snapshots/provision-counts-test.json": provisionCounts,
  };
  const value = artifacts[key];
  return Promise.resolve(jsonResponse(value ?? {}, { status: value ? 200 : 404 }));
}

function mockFailureFetch(input: RequestInfo | URL) {
  const url = new URL(input.toString());
  if (url.hostname === "example.supabase.co") {
    return Promise.resolve(jsonResponse({ message: "bad" }, { status: 500 }));
  }
  return Promise.resolve(jsonResponse({ message: "missing" }, { status: 404 }));
}

function mockMalformedSupabaseFetch(input: RequestInfo | URL) {
  const url = new URL(input.toString());
  if (url.hostname === "example.supabase.co") {
    if (url.searchParams.get("select") === "id") {
      return Promise.resolve(jsonResponse([], { contentRange: "0-0/1" }));
    }
    return Promise.resolve(jsonResponse({ rows: [] }));
  }
  return mockStatusFetch(input);
}

function jsonResponse(
  value: unknown,
  options: { status?: number; contentRange?: string } = {}
) {
  const headers = new Headers({ "content-type": "application/json" });
  if (options.contentRange) headers.set("content-range", options.contentRange);
  return new Response(JSON.stringify(value), {
    status: options.status ?? 200,
    headers,
  });
}
