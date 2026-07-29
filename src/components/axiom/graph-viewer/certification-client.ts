import type {
  CertificationCriterion,
  CertificationCriterionName,
  CertificationSnapshot,
  CertifiedNode,
  CertifiedNodesLedger,
} from "@/lib/axiom/certification";

const CERTIFICATION_ENDPOINT = "/api/axiom/certified";
const CERTIFIED_NODES_SCHEMA = "axiom.certified_nodes.v1";
const CERTIFICATION_CRITERIA = [
  "provision_rooted",
  "conformant",
  "exercised",
  "closed",
  "executable",
] as const satisfies readonly CertificationCriterionName[];

const SNAPSHOT_KEYS = ["ledger", "state", "warning"] as const;
const LEDGER_KEYS = ["as_of", "generated", "nodes", "schema"] as const;
const NODE_KEYS = [
  "certified_at",
  "corpus_citation_path",
  "criteria",
  "harness",
  "label",
  "node",
  "pinned",
  "provision",
] as const;
const HARNESS_KEYS = ["certify_check", "run"] as const;
const PINNED_KEYS = ["artifact", "corpus", "engine", "rulespec_us"] as const;
const CRITERION_KEYS = ["evidence", "holds"] as const;
const WARNING_KEYS = ["kind", "message"] as const;
const WARNING_KINDS = ["missing", "parse", "schema"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[]
): boolean {
  const actual = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  return (
    actual.length === sortedExpected.length &&
    actual.every((key, index) => key === sortedExpected[index])
  );
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isDateOnly(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
}

function isUtcTimestamp(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(value) &&
    !Number.isNaN(new Date(value).getTime())
  );
}

function isCriterion(value: unknown): value is CertificationCriterion {
  return (
    isRecord(value) &&
    hasExactKeys(value, CRITERION_KEYS) &&
    value.holds === true &&
    isNonEmptyString(value.evidence)
  );
}

function isCriteria(
  value: unknown
): value is Record<CertificationCriterionName, CertificationCriterion> {
  return (
    isRecord(value) &&
    hasExactKeys(value, CERTIFICATION_CRITERIA) &&
    CERTIFICATION_CRITERIA.every((name) => isCriterion(value[name]))
  );
}

function isCertifiedNode(value: unknown): value is CertifiedNode {
  if (!isRecord(value) || !hasExactKeys(value, NODE_KEYS)) return false;
  if (!isRecord(value.harness) || !hasExactKeys(value.harness, HARNESS_KEYS)) {
    return false;
  }
  if (!isRecord(value.pinned) || !hasExactKeys(value.pinned, PINNED_KEYS)) {
    return false;
  }
  return (
    isNonEmptyString(value.node) &&
    isNonEmptyString(value.label) &&
    isNonEmptyString(value.provision) &&
    isNonEmptyString(value.corpus_citation_path) &&
    isUtcTimestamp(value.certified_at) &&
    isNonEmptyString(value.harness.run) &&
    isNonEmptyString(value.harness.certify_check) &&
    isNonEmptyString(value.pinned.rulespec_us) &&
    isNonEmptyString(value.pinned.corpus) &&
    isNonEmptyString(value.pinned.engine) &&
    isNonEmptyString(value.pinned.artifact) &&
    isCriteria(value.criteria)
  );
}

function isCertifiedNodesLedger(value: unknown): value is CertifiedNodesLedger {
  if (!isRecord(value) || !hasExactKeys(value, LEDGER_KEYS)) return false;
  if (
    value.schema !== CERTIFIED_NODES_SCHEMA ||
    value.generated !== true ||
    !isDateOnly(value.as_of) ||
    !Array.isArray(value.nodes) ||
    !value.nodes.every(isCertifiedNode)
  ) {
    return false;
  }
  return new Set(value.nodes.map((node) => node.node)).size === value.nodes.length;
}

function isReadySnapshot(value: unknown): value is CertificationSnapshot {
  return (
    isRecord(value) &&
    hasExactKeys(value, SNAPSHOT_KEYS) &&
    value.state === "ready" &&
    value.warning === null &&
    isCertifiedNodesLedger(value.ledger)
  );
}

function isUnavailableSnapshot(value: unknown): value is CertificationSnapshot {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, SNAPSHOT_KEYS) ||
    value.state !== "unavailable" ||
    value.ledger !== null ||
    !isRecord(value.warning) ||
    !hasExactKeys(value.warning, WARNING_KEYS)
  ) {
    return false;
  }
  return (
    WARNING_KINDS.includes(
      value.warning.kind as (typeof WARNING_KINDS)[number]
    ) && isNonEmptyString(value.warning.message)
  );
}

function unavailable(
  kind: "missing" | "parse" | "schema",
  detail: string
): CertificationSnapshot {
  return {
    state: "unavailable",
    ledger: null,
    warning: {
      kind,
      message: `Certification status warning: ${detail} Certification is fail-closed, so every node is shown as uncertified until the generated ledger mirror is restored.`,
    },
  };
}

export async function fetchCertificationSnapshot(): Promise<CertificationSnapshot> {
  let response: Response;
  try {
    response = await fetch(CERTIFICATION_ENDPOINT, {
      headers: { accept: "application/json" },
    });
  } catch {
    return unavailable(
      "missing",
      "The generated certification ledger could not be fetched."
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return unavailable(
      "parse",
      "The generated certification ledger response was not valid JSON."
    );
  }

  if (isUnavailableSnapshot(payload)) return payload;
  if (response.status === 200 && isReadySnapshot(payload)) return payload;

  return unavailable(
    "schema",
    "The generated certification ledger response had an unexpected shape."
  );
}
