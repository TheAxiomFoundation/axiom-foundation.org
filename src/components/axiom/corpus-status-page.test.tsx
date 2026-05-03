import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
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
};

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
    expect(screen.getByText("Colorado")).toBeInTheDocument();
    expect(screen.getByText("Alabama")).toBeInTheDocument();
    expect(screen.getByText(/empty_provision_text/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to corpus browser/i })).toHaveAttribute(
      "href",
      "/axiom"
    );
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
