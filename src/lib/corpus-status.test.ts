import { describe, expect, it } from "vitest";
import {
  buildR2GetRequest,
  corpusKeyFromPath,
  provisionCountsKeyFromStateReport,
  type R2Config,
} from "./corpus-status";

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
});
