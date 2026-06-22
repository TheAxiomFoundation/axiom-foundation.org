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
        source_access_blocked: 4,
        supabase_only_legacy: 33,
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
          status: "source_access_blocked",
          supabase_count: 110,
          release_provision_count: null,
          release_version: null,
          best_local_provision_count: null,
          best_local_version: null,
          local_complete: false,
          r2_complete: null,
          supabase_matches_release: null,
          next_action:
            "wait for official bulk/source export, permission/license path, or cleared official-site access",
          mismatch_reasons: [],
          source_access_status: "blocked_primary_source",
          source_access_note: "Official source access requires permission.",
          validation_error_count: 0,
          validation_warning_count: 0,
        },
      ],
    },
  },
  regulations: {
    key: "analytics/regulation-completion-current.json",
    source: "local",
    error: null,
    value: {
      complete: false,
      document_class: "regulation",
      expected_jurisdiction_count: 52,
      productionized_and_validated_count: 3,
      unfinished_count: 49,
      release: "current",
      status_counts: {
        productionized_and_validated: 3,
        not_started: 49,
      },
      unfinished_jurisdictions: ["us-ak"],
      validation_report_ok: true,
      validation_report_path: "data/corpus/analytics/validate-release-current.json",
      supabase_counts_path:
        "data/corpus/snapshots/provision-counts-2026-05-11.json",
      rows: [
        {
          jurisdiction: "us-ny",
          name: "New York",
          status: "productionized_and_validated",
          supabase_count: 67447,
          release_provision_count: 67447,
          release_version: "2026-05-10",
          best_local_provision_count: 67447,
          best_local_version: "2026-05-10",
          local_complete: true,
          r2_complete: true,
          supabase_matches_release: true,
          next_action: "none",
          mismatch_reasons: [],
          validation_error_count: 0,
          validation_warning_count: 0,
        },
        {
          jurisdiction: "us-ak",
          name: "Alaska",
          status: "not_started",
          supabase_count: null,
          release_provision_count: null,
          release_version: null,
          best_local_provision_count: null,
          best_local_version: null,
          local_complete: false,
          r2_complete: null,
          supabase_matches_release: null,
          next_action: "find primary official source",
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
  sourceDiscovery: {
    key: "analytics/source-discovery-current.json",
    source: "local",
    error: null,
    value: {
      generated_at: "2026-05-11T12:00:00.000Z",
      source_name: "policyengine-us",
      input_paths: ["sources/policyengine-us/state_references.txt"],
      raw_url_count: 3267,
      invalid_url_count: 0,
      unique_url_count: 1752,
      release: "current",
      release_scope_count: 55,
      ready_for_manifest_count: 609,
      needs_review_count: 780,
      blocked_or_excluded_count: 363,
      release_scope_present_count: 130,
      source_status_counts: {
        primary_official: 609,
        secondary_mirror: 260,
        vendor_or_paywalled: 24,
      },
      disposition_counts: {
        ready_for_manifest: 609,
        needs_review: 780,
        excluded_secondary: 339,
        blocked_vendor_only: 24,
      },
      document_class_counts: {
        form: 400,
        statute: 120,
        regulation: 60,
      },
      jurisdiction_counts: {
        us: 100,
        "us-ca": 39,
        unknown: 20,
      },
      corpus_source_policy:
        "External citations are discovery leads only; selected documents must be re-fetched from primary official sources into corpus artifacts.",
      domain_rows: [
        {
          host: "ftb.ca.gov",
          url_count: 39,
          ready_for_manifest_count: 35,
          needs_review_count: 4,
          excluded_count: 0,
          release_scope_present_count: 12,
          source_status_counts: {
            primary_official: 39,
          },
          disposition_counts: {
            ready_for_manifest: 35,
            needs_review: 4,
          },
          document_class_counts: {
            form: 35,
            other: 4,
          },
          jurisdiction_counts: {
            "us-ca": 39,
          },
          sample_urls: ["https://ftb.ca.gov/forms/misc/1001.pdf"],
        },
        {
          host: "law.cornell.edu",
          url_count: 260,
          ready_for_manifest_count: 0,
          needs_review_count: 0,
          excluded_count: 260,
          release_scope_present_count: 0,
          source_status_counts: {
            secondary_mirror: 260,
          },
          disposition_counts: {
            excluded_secondary: 260,
          },
          document_class_counts: {
            regulation: 260,
          },
          jurisdiction_counts: {
            unknown: 260,
          },
          sample_urls: ["https://law.cornell.edu/cfr/text/26/1.402(g)-1"],
        },
      ],
    },
  },
  corpusStats: {
    key: "supabase://corpus_stats",
    source: "supabase",
    error: null,
    value: {
      refreshed_at: "2026-06-21T16:50:00.000Z",
      document_classes: [
        {
          document_class: "statute",
          count: 60446,
          body_count: 50982,
          top_level_count: 53,
          rulespec_count: 1,
          refreshed_at: "2026-06-21T16:50:00.000Z",
        },
        {
          document_class: "regulation",
          count: 32937,
          body_count: 27265,
          top_level_count: 1,
          rulespec_count: 0,
          refreshed_at: "2026-06-21T16:50:00.000Z",
        },
      ],
    },
  },
  rulespecRepoActivity: {
    key: "github://TheAxiomFoundation/rulespec-repos",
    source: "github",
    error: null,
    value: {
      refreshed_at: "2026-06-21T16:45:00.000Z",
      org: "TheAxiomFoundation",
      lookback_days: 30,
      repo_count: 5,
      active_repo_count: 4,
      rulespec_count: 16,
      document_class_counts: {
        policy: 14,
        statute: 2,
      },
      test_count: 10,
      manifest_count: 9,
      corpus_provision_file_count: 3,
      rows: [
        {
          name: "rulespec-us",
          url: "https://github.com/TheAxiomFoundation/rulespec-us",
          default_branch: "main",
          pushed_at: "2026-06-21T16:30:00.000Z",
          rulespec_count: 10,
          document_class_counts: { policy: 8, statute: 2 },
          test_count: 10,
          manifest_count: 10,
          corpus_provision_file_count: 2,
          coverage_file_count: 1,
          oracle_file_count: 1,
          latest_commit: {
            sha: "abc1234",
            date: "2026-06-21T16:30:00.000Z",
            author: "Max Ghenis",
            message: "Encode SSI benefit formula",
            url: "https://github.com/TheAxiomFoundation/rulespec-us/commit/abc1234",
          },
        },
        {
          name: "rulespec-us-az",
          url: "https://github.com/TheAxiomFoundation/rulespec-us-az",
          default_branch: "main",
          pushed_at: "2026-06-20T12:00:00.000Z",
          rulespec_count: 3,
          document_class_counts: { policy: 3 },
          test_count: 0,
          manifest_count: 3,
          corpus_provision_file_count: 1,
          coverage_file_count: 0,
          oracle_file_count: 0,
          latest_commit: {
            sha: "def5678",
            date: "2026-06-20T12:00:00.000Z",
            author: "Pavel Makarchuk",
            message: "",
            url: "https://github.com/TheAxiomFoundation/rulespec-us-az/commit/def5678",
          },
        },
        {
          name: "rulespec-us-co",
          url: "https://github.com/TheAxiomFoundation/rulespec-us-co",
          default_branch: "main",
          pushed_at: "2026-06-19T12:00:00.000Z",
          rulespec_count: 2,
          document_class_counts: { policy: 2 },
          test_count: 1,
          manifest_count: 2,
          corpus_provision_file_count: 0,
          coverage_file_count: 0,
          oracle_file_count: 0,
          latest_commit: null,
        },
        {
          name: "rulespec-us-ga",
          url: "https://github.com/TheAxiomFoundation/rulespec-us-ga",
          default_branch: "main",
          pushed_at: null,
          rulespec_count: 1,
          document_class_counts: { policy: 1 },
          test_count: 1,
          manifest_count: 0,
          corpus_provision_file_count: 0,
          coverage_file_count: 0,
          oracle_file_count: 0,
          latest_commit: null,
        },
        {
          name: "rulespec-us-ok",
          url: "https://github.com/TheAxiomFoundation/rulespec-us-ok",
          default_branch: "main",
          pushed_at: "not-a-date",
          rulespec_count: 0,
          document_class_counts: {},
          test_count: 0,
          manifest_count: 0,
          corpus_provision_file_count: 0,
          coverage_file_count: 0,
          oracle_file_count: 0,
          latest_commit: null,
        },
      ],
    },
  },
  compiledArtifacts: {
    key: "github://TheAxiomFoundation/compiled-artifacts",
    source: "github",
    error: null,
    value: {
      refreshed_at: "2026-06-21T16:40:00.000Z",
      org: "TheAxiomFoundation",
      repo_count: 2,
      artifact_count: 3,
      rows: [
        {
          repo: "axiom-programs",
          repo_url: "https://github.com/TheAxiomFoundation/axiom-programs",
          default_branch: "main",
          path: "artifacts/us/co/snap/fy-2026.apply.json",
          url: "https://github.com/TheAxiomFoundation/axiom-programs/blob/main/artifacts/us/co/snap/fy-2026.apply.json",
          package_id: "us-co/snap/fy-2026",
          package_type: "applied-rulespec",
          pushed_at: "2026-06-21T15:00:00.000Z",
          has_manifest: true,
          has_rulespec_bundle: true,
          latest_commit: null,
        },
        {
          repo: "rulespec-graph-viewer",
          repo_url: "https://github.com/TheAxiomFoundation/rulespec-graph-viewer",
          default_branch: "main",
          path: "src/compiled-graphs/us-co-snap.compiled.json",
          url: "https://github.com/TheAxiomFoundation/rulespec-graph-viewer/blob/main/src/compiled-graphs/us-co-snap.compiled.json",
          package_id: "compiled-graphs/us-co-snap",
          package_type: "compiled-runtime",
          pushed_at: "2026-06-21T15:30:00.000Z",
          has_manifest: false,
          has_rulespec_bundle: false,
          latest_commit: {
            sha: "fed9876",
            date: "2026-06-21T15:30:00.000Z",
            author: null,
            message: "Compile Colorado SNAP graph",
            url: "https://github.com/TheAxiomFoundation/rulespec-graph-viewer/commit/fed9876",
          },
        },
        {
          repo: "rulespec-compile",
          repo_url: "https://github.com/TheAxiomFoundation/rulespec-compile",
          default_branch: "main",
          path: "dist/empty.compiled.json",
          url: "https://github.com/TheAxiomFoundation/rulespec-compile/blob/main/dist/empty.compiled.json",
          package_id: "compiled-graphs/empty",
          package_type: "compiled-runtime",
          pushed_at: null,
          has_manifest: true,
          has_rulespec_bundle: false,
          latest_commit: null,
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
  it("renders the encoding progress dashboard", () => {
    render(<CorpusStatusPage status={status} />);

    expect(
      screen.getByRole("heading", { name: /operations dashboard/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /encoding pipeline/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: /indexed corpus by document class/i,
      })
    ).toBeInTheDocument();
    expect(screen.getAllByText("statute").length).toBeGreaterThan(0);
    expect(screen.getByText("regulation")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /current artifact scopes/i })
    ).toBeInTheDocument();
    expect(screen.getByText("us-co")).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: /^jurisdiction$/i })
    ).toBeInTheDocument();
    expect(screen.getAllByRole("columnheader", { name: /^class$/i }).length).toBeGreaterThan(0);
    expect(screen.getByRole("columnheader", { name: /version/i })).toBeInTheDocument();
    expect(screen.getByText("Synced")).toBeInTheDocument();
    expect(screen.getByText("Matched")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /recent movement/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /attention queue/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /rulespec repo activity/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /package artifacts/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /supabase encoding runs/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /current issues/i })
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Running suite")).not.toBeInTheDocument();
    expect(screen.queryByText("Active case")).not.toBeInTheDocument();
    expect(screen.queryByText("Suite results")).not.toBeInTheDocument();
    expect(screen.queryByText("Latest encoding push")).not.toBeInTheDocument();
    expect(screen.queryByText("Latest compiled package")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /eval suite progress/i })
    ).not.toBeInTheDocument();
  });

  it("summarizes indexed corpus counts by document class", () => {
    expect(summarizeDocumentClasses(status.provisionCounts.value!.rows)).toEqual([
      {
        document_class: "statute",
        provision_count: 60446,
        body_count: 50982,
        top_level_count: 53,
        rulespec_count: 0,
        jurisdiction_count: 1,
      },
      {
        document_class: "regulation",
        provision_count: 32937,
        body_count: 27265,
        top_level_count: 1,
        rulespec_count: 2,
        jurisdiction_count: 1,
      },
    ]);
  });

  it("renders release artifact scope unavailable state without substituting GitHub package rows", () => {
    render(
      <CorpusStatusPage
        status={{
          ...status,
          artifactReport: {
            key: "analytics/artifact-report-current-r2.json",
            source: null,
            error: "AXIOM_CORPUS_LOCAL_ROOT is not configured",
            value: null,
          },
        }}
      />
    );

    expect(
      screen.getByRole("heading", { name: /current artifact scopes/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText("Release artifact scopes are unavailable.")
    ).toBeInTheDocument();
  });

  it("renders encoding status input errors from active sources", () => {
    render(
      <CorpusStatusPage
        status={{
          ...status,
          rulespecRepoActivity: {
            key: "github://TheAxiomFoundation/rulespec-repos",
            source: null,
            error: "GitHub returned 500",
            value: null,
          },
        }}
      />
    );

    expect(
      screen.getByText(/GitHub returned 500/i)
    ).toBeInTheDocument();
  });
});
