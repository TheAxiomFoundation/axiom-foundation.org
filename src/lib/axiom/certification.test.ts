import { describe, expect, it } from "vitest";
import {
  certifiedNodeFor,
  isNodeCertified,
  parseCertifiedNodesYaml,
  readCertifiedNodes,
} from "./certification";

const CRITERIA = `\
      provision_rooted: { holds: true, evidence: artifact provenance }
      conformant: { holds: true, evidence: conformance report }
      exercised: { holds: true, evidence: census rows }
      closed: { holds: true, evidence: closure rows }
      executable: { holds: true, evidence: stranger receipt }`;

function ledgerWith(nodeBlock = ""): string {
  return `\
schema: axiom.certified_nodes.v1
generated: true
as_of: 2026-07-27
nodes:${nodeBlock ? `\n${nodeBlock}` : " []"}
`;
}

const CERTIFIED_NODE = `\
  - node: us:statutes/26/3101/b/1#medicare_wage_tax
    label: Employee Medicare payroll tax
    provision: 26 USC 3101(b)(1)
    corpus_citation_path: us/statute/26/3101
    certified_at: 2026-07-29T12:00:00Z
    harness:
      run: run-123 workflow-sha
      certify_check: check-sha
    pinned:
      rulespec_us: rulespec-sha
      corpus: corpus-sha
      engine: v1.2.3
      artifact: sha256:artifact
    criteria:
${CRITERIA}`;

describe("certified nodes reader", () => {
  it("fails closed on malformed YAML and exposes an operational warning", () => {
    const snapshot = parseCertifiedNodesYaml(
      "schema: axiom.certified_nodes.v1\nnodes: [unterminated"
    );

    expect(snapshot.state).toBe("unavailable");
    expect(snapshot.ledger).toBeNull();
    expect(snapshot.warning).toMatchObject({ kind: "parse" });
    expect(snapshot.warning?.message).toMatch(/fail-closed/i);
    expect(
      isNodeCertified(
        snapshot,
        "us:statutes/26/3101/b/1#medicare_wage_tax"
      )
    ).toBe(false);
  });

  it("fails closed when the mirror is missing", async () => {
    const snapshot = await readCertifiedNodes(
      "/a/path/that/does/not/contain/certified-nodes.yaml"
    );

    expect(snapshot.state).toBe("unavailable");
    expect(snapshot.warning).toMatchObject({ kind: "missing" });
    expect(snapshot.ledger).toBeNull();
  });

  it("fails closed on an unexpected schema or a false criterion", () => {
    const unexpected = parseCertifiedNodesYaml(
      ledgerWith(CERTIFIED_NODE.replace("holds: true", "holds: false"))
    );

    expect(unexpected.state).toBe("unavailable");
    expect(unexpected.warning).toMatchObject({ kind: "schema" });
    expect(unexpected.ledger).toBeNull();
  });

  it("recognizes only an entry with every required criterion holding", () => {
    const snapshot = parseCertifiedNodesYaml(ledgerWith(CERTIFIED_NODE));
    const id = "us:statutes/26/3101/b/1#medicare_wage_tax";

    expect(snapshot.state).toBe("ready");
    expect(isNodeCertified(snapshot, id)).toBe(true);
    expect(certifiedNodeFor(snapshot, id)?.label).toBe(
      "Employee Medicare payroll tax"
    );
    expect(
      isNodeCertified(snapshot, "us:statutes/26/3101/a#oasdi_wage_tax")
    ).toBe(false);
  });

  it("treats the true empty ledger as ready, not as an operational failure", () => {
    const snapshot = parseCertifiedNodesYaml(ledgerWith());

    expect(snapshot).toMatchObject({
      state: "ready",
      warning: null,
      ledger: { nodes: [] },
    });
  });
});
