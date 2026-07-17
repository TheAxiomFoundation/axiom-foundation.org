import { describe, it, expect, vi, beforeEach } from "vitest";

const { getRuntimePackageMock, runCalculateMock, isConfiguredMock } =
  vi.hoisted(() => ({
    getRuntimePackageMock: vi.fn(),
    runCalculateMock: vi.fn(),
    isConfiguredMock: vi.fn(),
  }));

vi.mock("@/lib/axiom/runtime/api", () => ({
  getRuntimePackage: getRuntimePackageMock,
  runCalculate: runCalculateMock,
  isRuntimeApiConfigured: isConfiguredMock,
}));

import { POST } from "./route";

function post(body: unknown): Request {
  return new Request("http://localhost/api/axiom/runtime/run", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/axiom/runtime/run", () => {
  beforeEach(() => {
    getRuntimePackageMock.mockReset();
    runCalculateMock.mockReset();
    isConfiguredMock.mockReset();
    isConfiguredMock.mockReturnValue(true);
  });

  it("runs the package sample and returns outputs + trace", async () => {
    getRuntimePackageMock.mockResolvedValue({
      sample_request: { program_id: "co-snap" },
      default_period: "2026-01",
    });
    runCalculateMock.mockResolvedValue({
      outputs: { snap_benefit_amount: 298 },
      trace: [
        {
          rule_id: "snap_allotment",
          variable: "snap_benefit_amount",
          value: 298,
          sources: ["us-co:regulations/10-ccr-2506-1/4.207.2#snap_allotment"],
        },
      ],
    });

    const response = await POST(post({ jurisdiction: "us-co", program_id: "co-snap" }));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.outputs.snap_benefit_amount).toBe(298);
    expect(data.trace).toHaveLength(1);
    expect(data.period).toBe("2026-01");
    expect(data.sample).toBe(true);
    expect(runCalculateMock).toHaveBeenCalledWith({ program_id: "co-snap" });
  });

  it("rejects malformed program coordinates", async () => {
    const response = await POST(
      post({ jurisdiction: "us co", program_id: "x/../y" })
    );
    expect(response.status).toBe(400);
    expect(getRuntimePackageMock).not.toHaveBeenCalled();
  });

  it("503s when the runtime API is unconfigured", async () => {
    isConfiguredMock.mockReturnValue(false);
    const response = await POST(post({ jurisdiction: "us", program_id: "eitc" }));
    expect(response.status).toBe(503);
  });

  it("404s for unknown packages and 502s on engine failure", async () => {
    getRuntimePackageMock.mockResolvedValue(null);
    expect(
      (await POST(post({ jurisdiction: "us", program_id: "nope" }))).status
    ).toBe(404);

    getRuntimePackageMock.mockResolvedValue({ sample_request: {} });
    runCalculateMock.mockResolvedValue(null);
    expect(
      (await POST(post({ jurisdiction: "us-co", program_id: "co-snap" })))
        .status
    ).toBe(502);
  });
});
