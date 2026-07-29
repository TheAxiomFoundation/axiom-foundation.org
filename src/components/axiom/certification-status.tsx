import { CheckIcon } from "@/components/icons";
import type {
  CertificationSnapshot,
  CertifiedNode,
} from "@/lib/axiom/certification";

export interface DeferredOutputReason {
  output: string;
  reason: string;
}

export type NonCertifiedReason =
  | {
      kind: "validated";
      /** A published description of what the validation actually covered. */
      frontier: string;
    }
  | {
      kind: "incomplete";
      deferredOutputs: readonly DeferredOutputReason[];
    }
  | {
      kind: "pending";
    }
  | {
      kind: "operational";
    }
  | {
      kind: "identity";
    }
  | {
      kind: "uncertified";
    };

const DEFAULT_REASON: NonCertifiedReason = { kind: "uncertified" };

function entryFor(
  snapshot: CertificationSnapshot,
  nodeId: string
): CertifiedNode | null {
  if (snapshot.state !== "ready") return null;
  return snapshot.ledger.nodes.find((entry) => entry.node === nodeId) ?? null;
}

export function CertificationOperationalWarning({
  snapshot,
}: {
  snapshot: CertificationSnapshot;
}) {
  if (snapshot.state !== "unavailable") return null;
  return (
    <div
      role="alert"
      data-testid="certification-operational-warning"
      className="rounded-md border border-[var(--color-warning)] bg-[var(--color-accent-light)] px-3 py-2 text-[12px] leading-relaxed text-[var(--color-warning)]"
    >
      {snapshot.warning.message}
    </div>
  );
}

function CertifiedMark({ entry }: { entry: CertifiedNode }) {
  return (
    <span
      aria-label="Certified encoding"
      title={`Computed automatically ${entry.certified_at} for ${entry.provision}`}
      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-success)] bg-[var(--color-paper-elevated)] px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-[var(--color-success)]"
    >
      <CheckIcon size={12} className="shrink-0" />
      Certified
    </span>
  );
}

export function NonCertifiedStatus({
  reason,
}: {
  reason: NonCertifiedReason;
}) {
  if (reason.kind === "validated") {
    return (
      <div className="flex flex-col items-start gap-1.5 text-[12px] leading-relaxed">
        <span className="font-medium text-[var(--color-ink-secondary)]">
          Validated, not certified
        </span>
        <span className="text-[var(--color-ink-muted)]">
          Published frontier: {reason.frontier}
        </span>
      </div>
    );
  }
  if (reason.kind === "incomplete") {
    return (
      <div className="flex flex-col items-start gap-1.5 text-[12px] leading-relaxed">
        <span className="font-medium text-[var(--color-ink-secondary)]">
          Encoded, incomplete by declaration
        </span>
        {reason.deferredOutputs.length > 0 ? (
          <ul className="m-0 list-disc space-y-1 pl-4 text-[var(--color-ink-muted)]">
            {reason.deferredOutputs.map((item) => (
              <li key={`${item.output}:${item.reason}`}>
                <span className="font-mono text-[0.92em]">{item.output}</span>
                {": "}
                {item.reason}
              </li>
            ))}
          </ul>
        ) : (
          <span className="text-[var(--color-ink-muted)]">
            The module declares deferred outputs.
          </span>
        )}
      </div>
    );
  }
  if (reason.kind === "pending") {
    return (
      <div className="flex flex-col items-start gap-1.5 text-[12px] leading-relaxed">
        <span className="font-medium text-[var(--color-ink-secondary)]">
          Pending
        </span>
        <span className="text-[var(--color-ink-muted)]">
          This ledger row has not earned certification.
        </span>
      </div>
    );
  }
  if (reason.kind === "operational") {
    return (
      <div className="flex flex-col items-start gap-1.5 text-[12px] leading-relaxed">
        <span className="font-medium text-[var(--color-ink-secondary)]">
          Certification not confirmed
        </span>
        <span className="text-[var(--color-ink-muted)]">
          The generated ledger is unavailable. Fail-closed status applies.
        </span>
      </div>
    );
  }
  if (reason.kind === "identity") {
    return (
      <div className="flex flex-col items-start gap-1.5 text-[12px] leading-relaxed">
        <span className="font-medium text-[var(--color-ink-secondary)]">
          Certification identity unavailable
        </span>
        <span className="text-[var(--color-ink-muted)]">
          This card does not publish the exact RuleSpec legal ID needed for a
          ledger lookup.
        </span>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-start gap-1.5 text-[12px] leading-relaxed">
      <span className="font-medium text-[var(--color-ink-secondary)]">
        Not certified
      </span>
      <span className="text-[var(--color-ink-muted)]">
        This node does not appear in the generated certification ledger.
      </span>
    </div>
  );
}

/**
 * The certification mark and its honest non-certified counterpart.
 *
 * Only an exact entry in the generated ledger can render the mark. Supplemental
 * validation/deferred-output context may explain an absent node, but can never
 * promote it.
 */
export function CertificationStatus({
  snapshot,
  nodeId,
  reason = DEFAULT_REASON,
  showWarning = true,
}: {
  snapshot: CertificationSnapshot;
  nodeId: string;
  reason?: NonCertifiedReason;
  showWarning?: boolean;
}) {
  const entry = entryFor(snapshot, nodeId);
  const statusReason: NonCertifiedReason =
    snapshot.state === "unavailable" ? { kind: "operational" } : reason;
  return (
    <div
      data-testid="certification-status"
      className="flex flex-col items-start gap-1.5 text-[12px] leading-relaxed"
    >
      {showWarning && <CertificationOperationalWarning snapshot={snapshot} />}
      {entry ? (
        <CertifiedMark entry={entry} />
      ) : (
        <NonCertifiedStatus reason={statusReason} />
      )}
    </div>
  );
}

/**
 * Phrasing-content variant for a closed rule-card summary. The rail owns the
 * detailed operational alert, so this compact line reports only the lookup
 * result and never nests flow content inside `<summary>`.
 */
export function CertificationSummaryStatus({
  snapshot,
  nodeId,
}: {
  snapshot: CertificationSnapshot;
  nodeId: string | null;
}) {
  const entry = nodeId ? entryFor(snapshot, nodeId) : null;
  if (entry) return <CertifiedMark entry={entry} />;

  const [label, detail] =
    snapshot.state === "unavailable"
      ? [
          "Certification not confirmed",
          "The generated ledger is unavailable.",
        ]
      : nodeId
        ? [
            "Not certified",
            "This node does not appear in the generated certification ledger.",
          ]
        : [
            "Certification identity unavailable",
            "No exact RuleSpec legal ID was published for this card.",
          ];
  return (
    <span className="flex flex-col items-start gap-1 text-[12px] leading-relaxed">
      <span className="font-medium text-[var(--color-ink-secondary)]">
        {label}
      </span>
      <span className="text-[var(--color-ink-muted)]">{detail}</span>
    </span>
  );
}

const BAR = [
  ["Provision rooted", "The node resolves to the legal provision it encodes."],
  ["Conformant", "Applicable oracle comparisons have no unexplained defects."],
  ["Exercised", "Tests cross the boundaries where the law changes behavior."],
  ["Closed", "The declared legal frontier has no pending provisions."],
  ["Executable", "The published artifact reproduces on the released engine."],
] as const;

/**
 * Ledger-level status. A valid empty ledger is deliberate product copy; an
 * unreadable ledger is an operational alert, never the same empty state.
 */
export function CertificationLedgerState({
  snapshot,
}: {
  snapshot: CertificationSnapshot;
}) {
  if (snapshot.state === "unavailable") {
    return <CertificationOperationalWarning snapshot={snapshot} />;
  }

  if (snapshot.ledger.nodes.length === 0) {
    return (
      <section
        role="status"
        data-testid="certification-empty-state"
        className="rounded-md border border-[var(--color-rule)] bg-[var(--color-paper-elevated)] p-6"
      >
        <p className="m-0 font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)]">
          Certification status
        </p>
        <h2
          className="mt-2 text-xl font-semibold text-[var(--color-ink)]"
          style={{ fontFamily: "var(--f-serif)" }}
        >
          No encoding has met the bar yet
        </h2>
        <p className="mt-2 max-w-[68ch] text-sm leading-relaxed text-[var(--color-ink-secondary)]">
          This is the deliberate launch state, not an outage. The mark appears
          only after the automatic harness computes every criterion green.
          Nobody, including us, grants it by hand.
        </p>
        <h3 className="mt-5 text-sm font-semibold text-[var(--color-ink)]">
          Here is the bar
        </h3>
        <ol className="mt-3 grid gap-2 sm:grid-cols-2">
          {BAR.map(([label, detail]) => (
            <li
              key={label}
              className="border-l border-[var(--color-rule-strong)] pl-3 text-[12px] leading-relaxed"
            >
              <span className="block font-medium text-[var(--color-ink-secondary)]">
                {label}
              </span>
              <span className="text-[var(--color-ink-muted)]">{detail}</span>
            </li>
          ))}
        </ol>
        <p className="mt-5 max-w-[68ch] text-[12px] leading-relaxed text-[var(--color-ink-muted)]">
          The generated ledger publishes passing nodes only; it does not publish
          a per-node list of failed checks. Node views show a published
          validation frontier or declared deferred outputs when those records
          exist. Otherwise, absence means only that the node is not certified.
        </p>
      </section>
    );
  }

  return (
    <section
      data-testid="certification-ledger"
      className="rounded-md border border-[var(--color-rule)] bg-[var(--color-paper-elevated)] p-6"
    >
      <h2
        className="text-xl font-semibold text-[var(--color-ink)]"
        style={{ fontFamily: "var(--f-serif)" }}
      >
        Certified encodings
      </h2>
      <ul className="mt-4 divide-y divide-[var(--color-rule)]">
        {snapshot.ledger.nodes.map((entry) => (
          <li key={entry.node} className="flex items-start gap-3 py-3">
            <CertifiedMark entry={entry} />
            <span className="min-w-0">
              <span className="block text-sm text-[var(--color-ink)]">
                {entry.label}
              </span>
              <span className="block font-mono text-[10px] text-[var(--color-ink-muted)]">
                {entry.node}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
