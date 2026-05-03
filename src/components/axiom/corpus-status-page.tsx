import Link from "next/link";
import type {
  ArtifactScopeRow,
  CorpusStatusData,
  ProvisionCountRow,
  StateStatuteCompletionRow,
  ValidationIssue,
} from "@/lib/corpus-status";

interface CorpusStatusPageProps {
  status: CorpusStatusData;
  corpusHref?: string;
}

interface SummaryMetric {
  label: string;
  value: string;
  detail: string;
  state?: "good" | "warn" | "bad" | "neutral";
}

interface DocumentClassSummary {
  documentClass: string;
  provisions: number;
  bodies: number;
  topLevel: number;
  rulespec: number;
  jurisdictions: number;
}

export function CorpusStatusPage({
  status,
  corpusHref = "/axiom",
}: CorpusStatusPageProps) {
  const stateReport = status.stateStatutes.value;
  const artifactReport = status.artifactReport.value;
  const validationReport = status.validationReport.value;
  const provisionCounts = status.provisionCounts.value;
  const source = firstSource(status);
  const stateRows = stateReport?.rows ?? [];
  const productionized = stateReport?.productionized_and_validated_count ?? 0;
  const expectedStates = stateReport?.expected_jurisdiction_count ?? 0;
  const legacyStates = stateReport?.status_counts.supabase_only_legacy ?? 0;
  const documentSummaries = summarizeDocumentClasses(provisionCounts?.rows ?? []);
  const releaseRows = artifactReport?.rows ?? [];
  const totalProvisions = sumBy(provisionCounts?.rows ?? [], "provision_count");
  const totalRulespec = sumBy(provisionCounts?.rows ?? [], "rulespec_count");
  const generatedAt = provisionCounts?.refreshed_at ??
    provisionCounts?.rows[0]?.refreshed_at ??
    null;
  const errors = [
    status.stateStatutes,
    status.artifactReport,
    status.validationReport,
    status.provisionCounts,
  ].filter((artifact) => artifact.error);

  const metrics: SummaryMetric[] = [
    {
      label: "Release validation",
      value: validationReport?.ok ? "Passing" : "Unavailable",
      detail: validationReport
        ? `${validationReport.error_count} errors, ${validationReport.warning_count} warnings`
        : "Current validation report not loaded",
      state: validationReport?.ok ? "good" : "warn",
    },
    {
      label: "Release scopes",
      value: formatNumber(artifactReport?.release_scope_count ?? 0),
      detail: artifactReport
        ? `${artifactReport.supabase_mismatch_count} Supabase mismatches`
        : "Artifact report not loaded",
      state:
        artifactReport && artifactReport.supabase_mismatch_count === 0
          ? "good"
          : "warn",
    },
    {
      label: "Indexed provisions",
      value: formatNumber(totalProvisions),
      detail: `${formatNumber(totalRulespec)} encoded provisions`,
      state: "neutral",
    },
    {
      label: "State statutes",
      value:
        expectedStates > 0
          ? `${productionized}/${expectedStates}`
          : formatNumber(productionized),
      detail: `${legacyStates} legacy-only states to rerun`,
      state:
        stateReport?.complete
          ? "good"
          : productionized > 0
            ? "warn"
            : "neutral",
    },
  ];

  return (
    <div className="min-h-screen pt-28 pb-16">
      <div className="max-w-[1280px] mx-auto px-6 md:px-8">
        <header className="border-b border-[var(--color-rule)] pb-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="max-w-[760px]">
              <p className="eyebrow mb-3">Axiom operations</p>
              <h1 className="heading-section text-[var(--color-ink)]">
                Operations dashboard
              </h1>
              <p className="mt-3 text-sm md:text-base text-[var(--color-ink-secondary)]">
                Current corpus coverage, release health, R2 artifact sync, and
                Supabase index status.
              </p>
            </div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm md:text-right">
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)]">
                  Data source
                </dt>
                <dd className="font-medium text-[var(--color-ink)]">
                  {sourceLabel(source)}
                </dd>
              </div>
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)]">
                  Refreshed
                </dt>
                <dd className="font-medium text-[var(--color-ink)]">
                  {formatDate(generatedAt)}
                </dd>
              </div>
            </dl>
          </div>
        </header>

        {errors.length > 0 && (
          <section className="mt-6 border border-[var(--color-warning)] bg-[rgba(180,83,9,0.07)] rounded-md p-4">
            <h2 className="font-mono text-xs uppercase tracking-wider text-[var(--color-warning)]">
              Status inputs missing
            </h2>
            <ul className="mt-2 list-disc pl-5 text-sm text-[var(--color-ink-secondary)] space-y-1">
              {errors.map((artifact) => (
                <li key={artifact.key}>
                  <span className="font-mono">{artifact.key}</span>:{" "}
                  {artifact.error}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <MetricTile key={metric.label} metric={metric} />
          ))}
        </section>

        <section className="mt-10">
          <SectionHeader
            eyebrow="Coverage"
            title="Indexed Corpus By Document Class"
            detail={`${documentSummaries.length} classes in Supabase`}
          />
          <div className="mt-3 overflow-x-auto border border-[var(--color-rule)] rounded-md bg-[var(--color-paper-elevated)]">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-[var(--color-rule-subtle)] text-[var(--color-ink-muted)]">
                <tr className="font-mono text-[10px] uppercase tracking-wider">
                  <th className="text-left font-medium px-4 py-3">Class</th>
                  <th className="text-right font-medium px-4 py-3">
                    Provisions
                  </th>
                  <th className="text-right font-medium px-4 py-3">Bodies</th>
                  <th className="text-right font-medium px-4 py-3">
                    Top level
                  </th>
                  <th className="text-right font-medium px-4 py-3">
                    Encoded
                  </th>
                  <th className="text-right font-medium px-4 py-3">
                    Jurisdictions
                  </th>
                </tr>
              </thead>
              <tbody>
                {documentSummaries.map((row) => (
                  <tr
                    key={row.documentClass}
                    className="border-t border-[var(--color-rule)]"
                  >
                    <td className="px-4 py-3 font-medium capitalize">
                      {row.documentClass}
                    </td>
                    <td className="px-4 py-3 text-right tnum">
                      {formatNumber(row.provisions)}
                    </td>
                    <td className="px-4 py-3 text-right tnum">
                      {formatNumber(row.bodies)}
                    </td>
                    <td className="px-4 py-3 text-right tnum">
                      {formatNumber(row.topLevel)}
                    </td>
                    <td className="px-4 py-3 text-right tnum">
                      {formatNumber(row.rulespec)}
                    </td>
                    <td className="px-4 py-3 text-right tnum">
                      {formatNumber(row.jurisdictions)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-10">
          <SectionHeader
            eyebrow="Release"
            title="Current Artifact Scopes"
            detail={`${releaseRows.length} source-first scopes`}
          />
          <div className="mt-3 overflow-x-auto border border-[var(--color-rule)] rounded-md bg-[var(--color-paper-elevated)]">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-[var(--color-rule-subtle)] text-[var(--color-ink-muted)]">
                <tr className="font-mono text-[10px] uppercase tracking-wider">
                  <th className="text-left font-medium px-4 py-3">
                    Jurisdiction
                  </th>
                  <th className="text-left font-medium px-4 py-3">Class</th>
                  <th className="text-left font-medium px-4 py-3">Version</th>
                  <th className="text-right font-medium px-4 py-3">
                    Provisions
                  </th>
                  <th className="text-right font-medium px-4 py-3">
                    Sources
                  </th>
                  <th className="text-left font-medium px-4 py-3">R2</th>
                  <th className="text-left font-medium px-4 py-3">
                    Supabase
                  </th>
                </tr>
              </thead>
              <tbody>
                {releaseRows.map((row) => (
                  <ArtifactScopeTableRow key={artifactRowKey(row)} row={row} />
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-10">
          <SectionHeader
            eyebrow="States"
            title="State Statute Productionization"
            detail={`${productionized} productionized, ${legacyStates} legacy-only`}
          />
          <div className="mt-3 overflow-x-auto border border-[var(--color-rule)] rounded-md bg-[var(--color-paper-elevated)]">
            <table className="w-full min-w-[1040px] text-sm">
              <thead className="bg-[var(--color-rule-subtle)] text-[var(--color-ink-muted)]">
                <tr className="font-mono text-[10px] uppercase tracking-wider">
                  <th className="text-left font-medium px-4 py-3">State</th>
                  <th className="text-left font-medium px-4 py-3">Status</th>
                  <th className="text-right font-medium px-4 py-3">
                    Supabase
                  </th>
                  <th className="text-right font-medium px-4 py-3">
                    Release
                  </th>
                  <th className="text-left font-medium px-4 py-3">Version</th>
                  <th className="text-left font-medium px-4 py-3">
                    Next action
                  </th>
                </tr>
              </thead>
              <tbody>
                {stateRows.map((row) => (
                  <StateStatuteTableRow key={row.jurisdiction} row={row} />
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-10 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            <SectionHeader
              eyebrow="Validation"
              title="Current Issues"
              detail={validationReport
                ? `${validationReport.issue_count} returned`
                : "No validation report"}
            />
            <ValidationIssues issues={validationReport?.issues ?? []} />
          </div>
          <aside className="border border-[var(--color-rule)] rounded-md bg-[var(--color-paper-elevated)] p-5 h-fit">
            <h2 className="font-mono text-xs uppercase tracking-wider text-[var(--color-ink-muted)]">
              Inputs
            </h2>
            <dl className="mt-4 space-y-3 text-sm">
              <InputRow label="State completion" artifact={status.stateStatutes} />
              <InputRow label="Artifact report" artifact={status.artifactReport} />
              <InputRow label="Validation" artifact={status.validationReport} />
              <InputRow label="Provision counts" artifact={status.provisionCounts} />
            </dl>
            <Link
              href={corpusHref}
              className="mt-5 inline-flex rounded-md border border-[var(--color-rule)] px-3 py-2 text-sm no-underline text-[var(--color-ink-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
            >
              Back to corpus browser
            </Link>
          </aside>
        </section>
      </div>
    </div>
  );
}

function MetricTile({ metric }: { metric: SummaryMetric }) {
  return (
    <div className="border border-[var(--color-rule)] rounded-md bg-[var(--color-paper-elevated)] px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)]">
          {metric.label}
        </h2>
        <span
          className={`h-2.5 w-2.5 rounded-full ${statusDotClass(metric.state)}`}
          aria-hidden="true"
        />
      </div>
      <div className="mt-3 text-2xl font-semibold tnum text-[var(--color-ink)]">
        {metric.value}
      </div>
      <p className="mt-1 text-xs text-[var(--color-ink-secondary)]">
        {metric.detail}
      </p>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  detail,
}: {
  eyebrow: string;
  title: string;
  detail: string;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="eyebrow mb-2">{eyebrow}</p>
        <h2 className="heading-sub text-[var(--color-ink)]">{title}</h2>
      </div>
      <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)]">
        {detail}
      </p>
    </div>
  );
}

function ArtifactScopeTableRow({ row }: { row: ArtifactScopeRow }) {
  return (
    <tr className="border-t border-[var(--color-rule)]">
      <td className="px-4 py-3 font-mono text-xs">{row.jurisdiction}</td>
      <td className="px-4 py-3 capitalize">{row.document_class}</td>
      <td className="px-4 py-3 font-mono text-xs">{row.version}</td>
      <td className="px-4 py-3 text-right tnum">
        {formatNumber(row.provision_count)}
      </td>
      <td className="px-4 py-3 text-right tnum">
        {formatNumber(row.source_count)}
      </td>
      <td className="px-4 py-3">
        <StatusPill
          label={row.r2_complete ? "Synced" : "Missing"}
          tone={row.r2_complete ? "good" : "bad"}
        />
      </td>
      <td className="px-4 py-3">
        <StatusPill
          label={row.supabase_matches_provisions ? "Matched" : "Check"}
          tone={row.supabase_matches_provisions ? "good" : "warn"}
        />
      </td>
    </tr>
  );
}

function StateStatuteTableRow({ row }: { row: StateStatuteCompletionRow }) {
  return (
    <tr className="border-t border-[var(--color-rule)]">
      <td className="px-4 py-3">
        <div className="font-medium text-[var(--color-ink)]">{row.name}</div>
        <div className="font-mono text-[10px] uppercase text-[var(--color-ink-muted)]">
          {row.jurisdiction}
        </div>
      </td>
      <td className="px-4 py-3">
        <StatusPill
          label={stateStatusLabel(row.status)}
          tone={row.status === "productionized_and_validated" ? "good" : "warn"}
        />
      </td>
      <td className="px-4 py-3 text-right tnum">
        {formatNullableNumber(row.supabase_count)}
      </td>
      <td className="px-4 py-3 text-right tnum">
        {formatNullableNumber(row.release_provision_count)}
      </td>
      <td className="px-4 py-3 font-mono text-xs">
        {row.release_version ?? row.best_local_version ?? "-"}
      </td>
      <td className="px-4 py-3 text-[var(--color-ink-secondary)]">
        {row.next_action}
      </td>
    </tr>
  );
}

function ValidationIssues({ issues }: { issues: ValidationIssue[] }) {
  if (issues.length === 0) {
    return (
      <div className="mt-3 border border-[var(--color-rule)] rounded-md bg-[var(--color-paper-elevated)] p-5 text-sm text-[var(--color-ink-secondary)]">
        No current validation issues returned.
      </div>
    );
  }

  return (
    <div className="mt-3 border border-[var(--color-rule)] rounded-md bg-[var(--color-paper-elevated)] divide-y divide-[var(--color-rule)]">
      {issues.slice(0, 12).map((issue) => (
        <div
          key={`${issue.code}:${issue.jurisdiction}:${issue.document_class}:${issue.message}`}
          className="p-4"
        >
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill
              label={issue.severity}
              tone={issue.severity === "error" ? "bad" : "warn"}
            />
            <span className="font-mono text-xs text-[var(--color-ink-muted)]">
              {issue.jurisdiction}/{issue.document_class}/{issue.version}
            </span>
            <span className="font-mono text-xs text-[var(--color-ink-muted)]">
              {issue.code}
            </span>
          </div>
          <p className="mt-2 text-sm text-[var(--color-ink-secondary)]">
            {issue.message}
          </p>
        </div>
      ))}
    </div>
  );
}

function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: "good" | "warn" | "bad" | "neutral";
}) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-1 font-mono text-[10px] uppercase tracking-wider ${statusPillClass(tone)}`}
    >
      {label}
    </span>
  );
}

function InputRow({
  label,
  artifact,
}: {
  label: string;
  artifact: { key: string; source: string | null; error: string | null };
}) {
  return (
    <div>
      <dt className="font-medium text-[var(--color-ink)]">{label}</dt>
      <dd className="mt-1 font-mono text-xs text-[var(--color-ink-muted)] break-all">
        {artifact.key}
      </dd>
      <dd className="mt-1 text-xs text-[var(--color-ink-secondary)]">
        {artifact.error ? "Unavailable" : sourceLabel(artifact.source)}
      </dd>
    </div>
  );
}

export function summarizeDocumentClasses(
  rows: ProvisionCountRow[]
): DocumentClassSummary[] {
  const byClass = new Map<string, DocumentClassSummary & { slugs: Set<string> }>();

  for (const row of rows) {
    const current =
      byClass.get(row.document_class) ??
      {
        documentClass: row.document_class,
        provisions: 0,
        bodies: 0,
        topLevel: 0,
        rulespec: 0,
        jurisdictions: 0,
        slugs: new Set<string>(),
      };
    current.provisions += row.provision_count;
    current.bodies += row.body_count;
    current.topLevel += row.top_level_count;
    current.rulespec += row.rulespec_count;
    current.slugs.add(row.jurisdiction);
    current.jurisdictions = current.slugs.size;
    byClass.set(row.document_class, current);
  }

  return Array.from(byClass.values())
    .map(({ slugs: _slugs, ...summary }) => summary)
    .sort((a, b) => b.provisions - a.provisions);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatNullableNumber(value: number | null): string {
  return value == null ? "-" : formatNumber(value);
}

function formatDate(value: string | null): string {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function stateStatusLabel(value: string): string {
  return value.replaceAll("_", " ");
}

function firstSource(status: CorpusStatusData): string | null {
  return (
    status.stateStatutes.source ??
    status.artifactReport.source ??
    status.validationReport.source ??
    status.provisionCounts.source
  );
}

function sourceLabel(source: string | null): string {
  if (source === "status-url") return "Status URL";
  if (source === "r2") return "R2";
  if (source === "local") return "Local artifacts";
  return "Unavailable";
}

function statusDotClass(state: SummaryMetric["state"]): string {
  if (state === "good") return "bg-[var(--color-success)]";
  if (state === "warn") return "bg-[var(--color-warning)]";
  if (state === "bad") return "bg-[var(--color-error)]";
  return "bg-[var(--color-ink-muted)]";
}

function statusPillClass(tone: "good" | "warn" | "bad" | "neutral"): string {
  if (tone === "good") {
    return "border-[rgba(22,101,52,0.25)] bg-[rgba(22,101,52,0.08)] text-[var(--color-success)]";
  }
  if (tone === "warn") {
    return "border-[rgba(180,83,9,0.3)] bg-[rgba(180,83,9,0.08)] text-[var(--color-warning)]";
  }
  if (tone === "bad") {
    return "border-[rgba(153,27,27,0.3)] bg-[rgba(153,27,27,0.08)] text-[var(--color-error)]";
  }
  return "border-[var(--color-rule)] bg-[var(--color-rule-subtle)] text-[var(--color-ink-muted)]";
}

function artifactRowKey(row: ArtifactScopeRow): string {
  return `${row.jurisdiction}:${row.document_class}:${row.version}`;
}

function sumBy(
  rows: ProvisionCountRow[],
  key: "provision_count" | "rulespec_count"
): number {
  return rows.reduce((sum, row) => {
    const value = row[key];
    return sum + value;
  }, 0);
}
