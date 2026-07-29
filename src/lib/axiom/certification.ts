import { readFile } from "node:fs/promises";
import path from "node:path";
import yaml from "js-yaml";

export const CERTIFIED_NODES_SCHEMA = "axiom.certified_nodes.v1" as const;

export const CERTIFICATION_CRITERIA = [
  "provision_rooted",
  "conformant",
  "exercised",
  "closed",
  "executable",
] as const;

export type CertificationCriterionName =
  (typeof CERTIFICATION_CRITERIA)[number];

export interface CertificationCriterion {
  holds: true;
  evidence: string;
}

export interface CertifiedNode {
  node: string;
  label: string;
  provision: string;
  corpus_citation_path: string;
  certified_at: string;
  harness: {
    run: string;
    certify_check: string;
  };
  pinned: {
    rulespec_us: string;
    corpus: string;
    engine: string;
    artifact: string;
  };
  criteria: Record<CertificationCriterionName, CertificationCriterion>;
}

export interface CertifiedNodesLedger {
  schema: typeof CERTIFIED_NODES_SCHEMA;
  generated: true;
  as_of: string;
  nodes: CertifiedNode[];
}

export type CertificationWarningKind = "missing" | "parse" | "schema";

export type CertificationSnapshot =
  | {
      state: "ready";
      ledger: CertifiedNodesLedger;
      warning: null;
    }
  | {
      state: "unavailable";
      ledger: null;
      warning: {
        kind: CertificationWarningKind;
        message: string;
      };
    };

export const CERTIFIED_NODES_MIRROR_PATH = path.join(
  process.cwd(),
  "src/data/certified-nodes.yaml"
);

const ROOT_KEYS = ["as_of", "generated", "nodes", "schema"] as const;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[]
): boolean {
  const actual = Object.keys(value).sort();
  return (
    actual.length === expected.length &&
    actual.every((key, index) => key === [...expected].sort()[index])
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
  if (!isRecord(value) || !hasExactKeys(value, CERTIFICATION_CRITERIA)) {
    return false;
  }
  return CERTIFICATION_CRITERIA.every((name) => isCriterion(value[name]));
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
  if (!isRecord(value) || !hasExactKeys(value, ROOT_KEYS)) return false;
  if (
    value.schema !== CERTIFIED_NODES_SCHEMA ||
    value.generated !== true ||
    !isDateOnly(value.as_of) ||
    !Array.isArray(value.nodes) ||
    !value.nodes.every(isCertifiedNode)
  ) {
    return false;
  }
  const ids = new Set(value.nodes.map((entry) => entry.node));
  return ids.size === value.nodes.length;
}

function unavailable(
  kind: CertificationWarningKind,
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

export function parseCertifiedNodesYaml(content: string): CertificationSnapshot {
  let parsed: unknown;
  try {
    parsed = yaml.load(content, { schema: yaml.JSON_SCHEMA });
  } catch {
    return unavailable("parse", "The generated certification ledger is not valid YAML.");
  }
  if (!isCertifiedNodesLedger(parsed)) {
    return unavailable(
      "schema",
      `The generated certification ledger does not match ${CERTIFIED_NODES_SCHEMA}.`
    );
  }
  return {
    state: "ready",
    ledger: parsed,
    warning: null,
  };
}

export async function readCertifiedNodes(
  filePath = CERTIFIED_NODES_MIRROR_PATH
): Promise<CertificationSnapshot> {
  try {
    return parseCertifiedNodesYaml(await readFile(filePath, "utf8"));
  } catch {
    return unavailable(
      "missing",
      "The generated certification ledger mirror could not be read."
    );
  }
}

export function certifiedNodeFor(
  snapshot: CertificationSnapshot,
  nodeId: string
): CertifiedNode | null {
  if (snapshot.state !== "ready") return null;
  return snapshot.ledger.nodes.find((entry) => entry.node === nodeId) ?? null;
}

export function isNodeCertified(
  snapshot: CertificationSnapshot,
  nodeId: string
): boolean {
  return certifiedNodeFor(snapshot, nodeId) !== null;
}
