import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type {
  CertificationSnapshot,
  CertifiedNode,
} from "@/lib/axiom/certification";
import {
  CertificationLedgerState,
  CertificationStatus,
} from "./certification-status";

const NODE_ID = "us:statutes/26/3101/b/1#medicare_wage_tax";

const CERTIFIED_NODE: CertifiedNode = {
  node: NODE_ID,
  label: "Employee Medicare payroll tax",
  provision: "26 USC 3101(b)(1)",
  corpus_citation_path: "us/statute/26/3101",
  certified_at: "2026-07-29T12:00:00Z",
  harness: {
    run: "run-123 workflow-sha",
    certify_check: "check-sha",
  },
  pinned: {
    rulespec_us: "rulespec-sha",
    corpus: "corpus-sha",
    engine: "v1.2.3",
    artifact: "sha256:artifact",
  },
  criteria: {
    provision_rooted: { holds: true, evidence: "provenance" },
    conformant: { holds: true, evidence: "report" },
    exercised: { holds: true, evidence: "census" },
    closed: { holds: true, evidence: "closure" },
    executable: { holds: true, evidence: "receipt" },
  },
};

function ready(nodes: CertifiedNode[] = []): CertificationSnapshot {
  return {
    state: "ready",
    warning: null,
    ledger: {
      schema: "axiom.certified_nodes.v1",
      generated: true,
      as_of: "2026-07-27",
      nodes,
    },
  };
}

describe("CertificationStatus", () => {
  it("renders the certification mark for a listed node", () => {
    render(
      <CertificationStatus snapshot={ready([CERTIFIED_NODE])} nodeId={NODE_ID} />
    );

    expect(screen.getByLabelText("Certified encoding")).toHaveTextContent(
      "Certified"
    );
  });

  it("never renders the mark for a node absent from the file", () => {
    render(
      <CertificationStatus
        snapshot={ready([CERTIFIED_NODE])}
        nodeId="us:statutes/26/3101/a#oasdi_wage_tax"
      />
    );

    expect(screen.queryByLabelText("Certified encoding")).not.toBeInTheDocument();
    expect(screen.getByText("Not certified")).toBeInTheDocument();
    expect(
      screen.getByText(/does not appear in the generated certification ledger/i)
    ).toBeInTheDocument();
  });

  it("shows only source-backed reasons for non-certified nodes", () => {
    const { rerender } = render(
      <CertificationStatus
        snapshot={ready()}
        nodeId={NODE_ID}
        reason={{ kind: "validated", frontier: "26 USC 3101(b)(1)" }}
      />
    );
    expect(screen.getByText("Validated, not certified")).toBeInTheDocument();
    expect(screen.getByText(/Published frontier: 26 USC/)).toBeInTheDocument();

    rerender(
      <CertificationStatus
        snapshot={ready()}
        nodeId={NODE_ID}
        reason={{
          kind: "incomplete",
          deferredOutputs: [
            {
              output: `${NODE_ID}#net_tax`,
              reason: "The upstream wage classification is not encoded.",
            },
          ],
        }}
      />
    );
    expect(
      screen.getByText("Encoded, incomplete by declaration")
    ).toBeInTheDocument();
    expect(
      screen.getByText(/upstream wage classification is not encoded/i)
    ).toBeInTheDocument();

    rerender(
      <CertificationStatus
        snapshot={ready()}
        nodeId={NODE_ID}
        reason={{ kind: "pending" }}
      />
    );
    expect(screen.getByText("Pending")).toBeInTheDocument();
  });

  it("renders the deliberate empty-state explanation", () => {
    render(<CertificationLedgerState snapshot={ready()} />);

    expect(
      screen.getByRole("heading", {
        name: "No encoding has met the bar yet",
      })
    ).toBeInTheDocument();
    expect(screen.getByText(/deliberate launch state/i)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Here is the bar" })
    ).toBeInTheDocument();
    expect(screen.getByText(/Nobody, including us/i)).toBeInTheDocument();
  });

  it("renders an operational alert instead of the empty state on reader failure", () => {
    const snapshot: CertificationSnapshot = {
      state: "unavailable",
      ledger: null,
      warning: {
        kind: "parse",
        message:
          "Certification status warning: invalid YAML. Certification is fail-closed.",
      },
    };
    render(<CertificationLedgerState snapshot={snapshot} />);

    expect(screen.getByRole("alert")).toHaveTextContent(/fail-closed/i);
    expect(
      screen.queryByRole("heading", {
        name: "No encoding has met the bar yet",
      })
    ).not.toBeInTheDocument();
  });

  it("does not claim ledger absence when certification cannot be read", () => {
    const snapshot: CertificationSnapshot = {
      state: "unavailable",
      ledger: null,
      warning: {
        kind: "parse",
        message:
          "Certification status warning: invalid YAML. Certification is fail-closed.",
      },
    };
    render(<CertificationStatus snapshot={snapshot} nodeId={NODE_ID} />);

    expect(screen.getByText("Certification not confirmed")).toBeInTheDocument();
    expect(screen.queryByText(/does not appear/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Certified encoding")).not.toBeInTheDocument();
  });
});
