import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CorpusStatusPage,
  summarizeDocumentClasses,
} from "./corpus-status-page";
import type { CorpusStatusData } from "@/lib/corpus-status";

const status: CorpusStatusData = {
  stateStatutes: {
    key: "analytics/state-statute-completion-current.json",
    source: "local",
    error: null,
    value: {
      complete: false,
      expected_jurisdiction_count: 51,
      productionized_and_validated_count: 14,
      unfinished_count: 37,
      release: "current",
      status_counts: {
        productionized_and_validated: 14,
        supabase_only_legacy: 37,
      },
      unfinished_jurisdictions: ["us-al"],
      validation_report_ok: true,
      validation_report_path: "data/corpus/analytics/validate-release-current.json",
      supabase_counts_path:
        "data/corpus/snapshots/provision-counts-2026-05-02.json",
      rows: [
        {
          jurisdiction: "us-co",
          name: "Colorado",
          status: "productionized_and_validated",
          supabase_count: 39920,
          release_provision_count: 39920,
          release_version: "2026-04-29",
          best_local_provision_count: 39920,
          best_local_version: "2026-04-29",
          local_complete: true,
          r2_complete: true,
          supabase_matches_release: true,
          next_action: "none",
          mismatch_reasons: [],
          validation_error_count: 0,
          validation_warning_count: 0,
        },
        {
          jurisdiction: "us-al",
          name: "Alabama",
          status: "supabase_only_legacy",
          supabase_count: 110,
          release_provision_count: null,
          release_version: null,
          best_local_provision_count: null,
          best_local_version: null,
          local_complete: false,
          r2_complete: null,
          supabase_matches_release: null,
          next_action: "rerun from primary official sources into source-first artifacts",
          mismatch_reasons: [],
          validation_error_count: 0,
          validation_warning_count: 0,
        },
      ],
    },
  },
  artifactReport: {
    key: "analytics/artifact-report-current-r2.json",
    source: "local",
    error: null,
    value: {
      release: "current",
      scope_count: 2,
      release_scope_count: 2,
      local_count: 10,
      remote_count: 10,
      local_bytes: 100,
      remote_bytes: 100,
      mismatch_count: 0,
      supabase_group_count: 2,
      supabase_mismatch_count: 0,
      rows: [
        {
          jurisdiction: "us-co",
          document_class: "statute",
          version: "2026-04-29",
          provision_count: 39920,
          source_count: 39920,
          local_complete: true,
          r2_complete: true,
          coverage_complete: true,
          supabase_count: 39920,
          supabase_matches_provisions: true,
          mismatch_reasons: [],
        },
      ],
    },
  },
  validationReport: {
    key: "analytics/validate-release-current.json",
    source: "local",
    error: null,
    value: {
      ok: true,
      release: "current",
      scope_count: 2,
      error_count: 0,
      warning_count: 1,
      issue_count: 1,
      issues_truncated: false,
      issues: [
        {
          severity: "warning",
          code: "empty_provision_text",
          jurisdiction: "us-co",
          document_class: "regulation",
          version: "2026-04-29",
          message: "us-co/regulation/example has neither body nor heading",
        },
      ],
    },
  },
  provisionCounts: {
    key: "snapshots/provision-counts-2026-05-02.json",
    source: "local",
    error: null,
    value: {
      refreshed_at: "2026-05-03T02:48:38.841392+00:00",
      rows: [
        {
          jurisdiction: "us",
          document_class: "statute",
          provision_count: 60446,
          body_count: 50982,
          top_level_count: 53,
          rulespec_count: 0,
          refreshed_at: "2026-05-03T02:48:38.841392+00:00",
        },
        {
          jurisdiction: "us-co",
          document_class: "regulation",
          provision_count: 32937,
          body_count: 27265,
          top_level_count: 1,
          rulespec_count: 2,
          refreshed_at: "2026-05-03T02:48:38.841392+00:00",
        },
      ],
    },
  },
  encodingStatus: {
    key: "supabase://encodings.encoding_runs",
    source: "supabase",
    error: null,
    value: {
      refreshed_at: "2026-05-03T03:12:00.000Z",
      lookback_days: 7,
      run_count: 42,
      recent_run_count: 5,
      issue_run_count: 1,
      active_session_count: 1,
      latest_source_counts: {
        reviewer_agent: 2,
        ci_only: 1,
      },
      latest_runs: [
        {
          id: "enc-1",
          timestamp: "2026-05-03T03:10:00.000Z",
          citation: "C.R.S. 26-2-703",
          total_duration_ms: 125000,
          agent_type: "encoder",
          agent_model: "gpt-5.4",
          data_source: "reviewer_agent",
          has_issues: false,
          session_id: "sdk-1",
          encoder_version: "0.4.2",
        },
      ],
      latest_sessions: [
        {
          id: "sdk-1",
          started_at: "2026-05-03T03:00:00.000Z",
          ended_at: null,
          model: "gpt-5.4",
          event_count: 18,
          input_tokens: 1200,
          output_tokens: 800,
          estimated_cost_usd: 0.314,
          encoder_version: "0.4.2",
        },
      ],
    },
  },
};

afterEach(() => {
  vi.useRealTimers();
});

describe("CorpusStatusPage", () => {
  it("renders release, corpus, and state status sections", () => {
    render(<CorpusStatusPage status={status} />);

    expect(
      screen.getByRole("heading", { name: /operations dashboard/i })
    ).toBeInTheDocument();
    expect(screen.getByText("Passing")).toBeInTheDocument();
    expect(screen.getByText("14/51")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /indexed corpus by document class/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /current artifact scopes/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /state statute productionization/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /encoding run health/i })
    ).toBeInTheDocument();
    expect(screen.getByText("C.R.S. 26-2-703")).toBeInTheDocument();
    expect(screen.getAllByText("reviewer agent").length).toBeGreaterThan(0);
    expect(screen.getByText("Running")).toBeInTheDocument();
    expect(screen.getByText("Colorado")).toBeInTheDocument();
    expect(screen.getByText("Alabama")).toBeInTheDocument();
    expect(screen.getByText(/empty_provision_text/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to corpus browser/i })).toHaveAttribute(
      "href",
      "/axiom"
    );
  });

  it("renders encoding empty and unavailable states", () => {
    render(
      <CorpusStatusPage
        status={{
          ...status,
          encodingStatus: {
            key: "supabase://encodings.encoding_runs",
            source: "supabase",
            error: null,
            value: {
              refreshed_at: "2026-05-03T03:12:00.000Z",
              lookback_days: 7,
              run_count: null,
              recent_run_count: null,
              issue_run_count: null,
              active_session_count: null,
              latest_source_counts: {},
              latest_runs: [],
              latest_sessions: [],
            },
          },
        }}
      />
    );

    expect(screen.getByText("No encoding runs returned.")).toBeInTheDocument();
    expect(screen.getByText("No SDK sessions returned.")).toBeInTheDocument();
    expect(screen.getByText("No source mix returned.")).toBeInTheDocument();
  });

  it("renders encoding issue and finished-session variants", () => {
    render(
      <CorpusStatusPage
        status={{
          ...status,
          encodingStatus: {
            key: "supabase://encodings.encoding_runs",
            source: "supabase",
            error: null,
            value: {
              refreshed_at: "2026-05-03T03:12:00.000Z",
              lookback_days: 7,
              run_count: 1,
              recent_run_count: 1,
              issue_run_count: 1,
              active_session_count: 0,
              latest_source_counts: {
                unknown: 1,
              },
              latest_runs: [
                {
                  id: "enc-edge",
                  timestamp: "not-a-date",
                  citation: null,
                  total_duration_ms: 250,
                  agent_type: null,
                  agent_model: null,
                  data_source: null,
                  has_issues: true,
                  session_id: null,
                  encoder_version: null,
                },
                {
                  id: "enc-seconds",
                  timestamp: "2026-05-03T03:01:00.000Z",
                  citation: "C.R.S. 39-22-104",
                  total_duration_ms: 5500,
                  agent_type: "encoder",
                  agent_model: null,
                  data_source: "ci_only",
                  has_issues: false,
                  session_id: null,
                  encoder_version: null,
                },
                {
                  id: "enc-no-duration",
                  timestamp: "2026-05-03T03:02:00.000Z",
                  citation: "C.R.S. 39-22-105",
                  total_duration_ms: null,
                  agent_type: "encoder",
                  agent_model: "gpt-5.4",
                  data_source: "ci_only",
                  has_issues: false,
                  session_id: null,
                  encoder_version: null,
                },
              ],
              latest_sessions: [
                {
                  id: "sdk-finished",
                  started_at: "not-a-date",
                  ended_at: "2026-05-03T03:05:00.000Z",
                  model: null,
                  event_count: 2,
                  input_tokens: 100,
                  output_tokens: 50,
                  estimated_cost_usd: null as unknown as number,
                  encoder_version: null,
                },
                {
                  id: "sdk-expensive",
                  started_at: "2026-05-03T03:01:00.000Z",
                  ended_at: "2026-05-03T03:05:00.000Z",
                  model: "gpt-5.4",
                  event_count: 3,
                  input_tokens: 200,
                  output_tokens: 100,
                  estimated_cost_usd: 12.3,
                  encoder_version: null,
                },
              ],
            },
          },
        }}
      />
    );

    expect(screen.getByText("enc-edge")).toBeInTheDocument();
    expect(screen.getAllByText("Unknown").length).toBeGreaterThan(0);
    expect(screen.getByText("250ms")).toBeInTheDocument();
    expect(screen.getByText("5.5s")).toBeInTheDocument();
    expect(screen.getByText("Check")).toBeInTheDocument();
    expect(screen.getAllByText("Finished").length).toBeGreaterThan(0);
    expect(screen.getByText("Unknown model / not-a-date")).toBeInTheDocument();
    expect(screen.getAllByText("-").length).toBeGreaterThan(0);
    expect(screen.getByText("$12.30")).toBeInTheDocument();
  });

  it("renders the encoding status input error", () => {
    render(
      <CorpusStatusPage
        status={{
          ...status,
          encodingStatus: {
            key: "supabase://encodings.encoding_runs",
            source: null,
            error: "Supabase returned 500 for encodings.encoding_runs",
            value: null,
          },
        }}
      />
    );

    expect(
      screen.getByText("Encoding run status is unavailable from Supabase.")
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Supabase returned 500 for encodings\.encoding_runs/i)
    ).toBeInTheDocument();
  });

  it("renders stale run timing and missing release artifact states", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-03T03:12:00.000Z"));

    render(
      <CorpusStatusPage
        status={{
          ...status,
          artifactReport: {
            ...status.artifactReport,
            value: {
              ...status.artifactReport.value!,
              rows: [
                {
                  jurisdiction: "us-missing",
                  document_class: "statute",
                  version: "2026-05-01",
                  provision_count: 1,
                  source_count: 1,
                  local_complete: true,
                  r2_complete: false,
                  coverage_complete: true,
                  supabase_count: 0,
                  supabase_matches_provisions: false,
                  mismatch_reasons: ["missing from r2"],
                },
              ],
            },
          },
          validationReport: {
            ...status.validationReport,
            value: {
              ...status.validationReport.value!,
              issue_count: 0,
              warning_count: 0,
              issues: [],
            },
          },
          encodingStatus: {
            ...status.encodingStatus,
            source: null,
            value: {
              ...status.encodingStatus.value!,
              latest_runs: [
                {
                  ...status.encodingStatus.value!.latest_runs[0],
                  timestamp: "2026-05-01T03:12:00.000Z",
                },
              ],
            },
          },
        }}
      />
    );

    expect(screen.getByText("Missing")).toBeInTheDocument();
    expect(screen.getAllByText("Check").length).toBeGreaterThan(0);
    expect(screen.getByText(/latest 2d ago/i)).toBeInTheDocument();
    expect(screen.getByText("No current validation issues returned.")).toBeInTheDocument();
    expect(screen.getAllByText("Unavailable").length).toBeGreaterThan(0);
  });

  it("falls through data source labels in header and input rows", () => {
    render(
      <CorpusStatusPage
        status={{
          ...status,
          stateStatutes: {
            ...status.stateStatutes,
            source: null,
          },
          artifactReport: {
            ...status.artifactReport,
            source: null,
          },
          validationReport: {
            ...status.validationReport,
            source: "status-url",
          },
          provisionCounts: {
            ...status.provisionCounts,
            source: "r2",
          },
        }}
      />
    );

    expect(screen.getAllByText("Status URL").length).toBeGreaterThan(0);
    expect(screen.getAllByText("R2").length).toBeGreaterThan(0);
  });

  it("uses encoding status as the page data source when corpus sources are absent", () => {
    render(
      <CorpusStatusPage
        status={{
          ...status,
          stateStatutes: { ...status.stateStatutes, source: null },
          artifactReport: { ...status.artifactReport, source: null },
          validationReport: { ...status.validationReport, source: null },
          provisionCounts: { ...status.provisionCounts, source: null },
        }}
      />
    );

    expect(screen.getAllByText("Supabase").length).toBeGreaterThan(0);
  });

  it("renders recent encoding run relative times", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-03T03:12:00.000Z"));

    render(
      <CorpusStatusPage
        status={{
          ...status,
          encodingStatus: {
            ...status.encodingStatus,
            value: {
              ...status.encodingStatus.value!,
              latest_runs: [
                {
                  ...status.encodingStatus.value!.latest_runs[0],
                  timestamp: "2026-05-03T02:42:00.000Z",
                },
              ],
            },
          },
        }}
      />
    );

    expect(screen.getByText(/latest 30m ago/i)).toBeInTheDocument();
  });

  it("summarizes provision counts by document class", () => {
    expect(
      summarizeDocumentClasses(status.provisionCounts.value?.rows ?? [])
    ).toEqual([
      {
        documentClass: "statute",
        provisions: 60446,
        bodies: 50982,
        topLevel: 53,
        rulespec: 0,
        jurisdictions: 1,
      },
      {
        documentClass: "regulation",
        provisions: 32937,
        bodies: 27265,
        topLevel: 1,
        rulespec: 2,
        jurisdictions: 1,
      },
    ]);
  });
});
