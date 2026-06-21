import type {
  ArtifactReport,
  ArtifactScopeRow,
  CompiledArtifactActivity,
  CompiledArtifactReport,
  CorpusStatsDocumentClass,
  CorpusStatusData,
  ProvisionCountRow,
  RulespecRepoActivity,
  RulespecRepoActivityReport,
} from "@/lib/corpus-status";

interface CorpusStatusPageProps {
  status: CorpusStatusData;
}

const TABLE_ROW_LIMIT = 20;

type StatusTone = "good" | "warn" | "bad" | "neutral";

interface PipelineStage {
  label: string;
  value: string;
  detail: string;
  progress: number;
  tone: StatusTone;
}

interface AttentionItem {
  repo: RulespecRepoActivity;
  reason: string;
  tone: StatusTone;
  toneLabel: string;
}

interface DocumentClassSummary {
  document_class: string;
  provision_count: number;
  body_count: number;
  top_level_count: number;
  rulespec_count: number;
  jurisdiction_count: number | null;
}

export function CorpusStatusPage({
  status,
}: CorpusStatusPageProps) {
  const rulespecActivity = status.rulespecRepoActivity?.value ?? null;
  const compiledArtifacts = status.compiledArtifacts?.value ?? null;
  const artifactReport = status.artifactReport.value;
  const corpusStats = status.corpusStats?.value ?? null;
  const provisionCounts = status.provisionCounts.value;
  const source = firstSource(status);
  const errors = [
    status.rulespecRepoActivity,
    status.compiledArtifacts,
  ].filter(
    (artifact): artifact is NonNullable<typeof artifact> => !!artifact?.error
  );

  const latestRulespec = rulespecActivity?.rows[0] ?? null;
  const latestCompiled = compiledArtifacts?.rows[0] ?? null;
  const generatedAt = latestDate([
    latestRulespec?.pushed_at,
    latestRulespec?.latest_commit?.date,
    latestCompiled?.pushed_at,
    latestCompiled?.latest_commit?.date,
    rulespecActivity?.refreshed_at,
    compiledArtifacts?.refreshed_at,
    artifactReport?.refreshed_at,
    corpusStats?.refreshed_at,
  ]);
  const coverageRows = coverageRowsFromStatus(
    corpusStats?.document_classes,
    provisionCounts?.rows,
    rulespecActivity?.document_class_counts
  );

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
                Current RuleSpec encoding, provenance packages, and compiled
                runtime artifact flow across GitHub repos.
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

        <section className="mt-8">
          <SectionHeader
            eyebrow="Pipeline"
            title="Encoding Pipeline"
            detail={rulespecActivity
              ? `${formatNumber(rulespecActivity.repo_count)} repos scanned`
              : "GitHub activity unavailable"}
          />
          <PipelineOverview
            compiledArtifacts={compiledArtifacts}
            rulespecActivity={rulespecActivity}
          />
        </section>

        <section className="mt-10">
          <SectionHeader
            eyebrow="Coverage"
            title="Indexed Corpus By Document Class"
            detail={coverageRows.length > 0
              ? `${formatNumber(coverageRows.length)} classes in Supabase`
              : "Supabase coverage unavailable"}
          />
          <CoverageByDocumentClassPanel rows={coverageRows} />
        </section>

        <section className="mt-10">
          <SectionHeader
            eyebrow="Release"
            title="Current Artifact Scopes"
            detail={
              artifactReport
                ? `${formatNumber(artifactReport.scope_count)} live scopes, ${formatNumber(artifactReport.supabase_group_count)} exact counts`
                : "Artifact scopes unavailable"
            }
          />
          <ArtifactScopesPanel
            report={artifactReport}
          />
        </section>

        <section className="mt-10 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
          <RecentMovementPanel report={rulespecActivity} />
          <AttentionQueuePanel report={rulespecActivity} />
        </section>

        <section className="mt-10">
          <SectionHeader
            eyebrow="Encoding"
            title="RuleSpec Repo Activity"
            detail={rulespecActivity
              ? `${formatNumber(rulespecActivity.repo_count)} discovered repos, ${formatNumber(rulespecActivity.active_repo_count)} active in ${rulespecActivity.lookback_days}d`
              : "GitHub activity unavailable"}
          />
          <p className="mt-2 max-w-[880px] text-sm text-[var(--color-ink-secondary)]">
            Checked-in encoding work across org RuleSpec repos. This catches
            new country, state, and tooling repos without depending on local
            machine state.
          </p>
          <RulespecRepoActivityPanel report={rulespecActivity} />
        </section>

        <section className="mt-10">
          <SectionHeader
            eyebrow="Programs"
            title="Package Artifacts"
            detail={compiledArtifacts
              ? `${formatNumber(compiledArtifacts.artifact_count)} package artifact${compiledArtifacts.artifact_count === 1 ? "" : "s"} discovered`
              : "Package artifact activity unavailable"}
          />
          <p className="mt-2 max-w-[880px] text-sm text-[var(--color-ink-secondary)]">
            Signed applied RuleSpec packages and compiled runtime artifacts from
            shared ecosystem repos.
          </p>
          <CompiledArtifactPanel report={compiledArtifacts} />
        </section>

      </div>
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

function PipelineOverview({
  compiledArtifacts,
  rulespecActivity,
}: {
  compiledArtifacts: CompiledArtifactReport | null;
  rulespecActivity: RulespecRepoActivityReport | null;
}) {
  if (!rulespecActivity) {
    return (
      <div className="mt-3 border border-[var(--color-rule)] rounded-md bg-[var(--color-paper-elevated)] p-5 text-sm text-[var(--color-ink-secondary)]">
        Pipeline status is unavailable until GitHub repo activity can be read.
      </div>
    );
  }

  const rows = rulespecActivity.rows;
  const encodedRepoCount = rows.filter((row) => row.rulespec_count > 0).length;
  const testedRepoCount = rows.filter(
    (row) => row.rulespec_count > 0 && row.test_count > 0
  ).length;
  const manifestRepoCount = rows.filter(
    (row) => row.rulespec_count > 0 && row.manifest_count > 0
  ).length;
  const sourceLinkedRepoCount = rows.filter(
    (row) => row.corpus_provision_file_count > 0
  ).length;
  const testCoverage =
    rulespecActivity.rulespec_count > 0
      ? Math.round(
          (rulespecActivity.test_count / rulespecActivity.rulespec_count) * 100
        )
      : 0;
  const manifestCoverage =
    rulespecActivity.rulespec_count > 0
      ? Math.round(
          (rulespecActivity.manifest_count / rulespecActivity.rulespec_count) *
            100
        )
      : 0;
  const appliedPackageCount =
    compiledArtifacts?.rows.filter((row) => row.package_type === "applied-rulespec")
      .length ?? 0;
  const compiledRuntimeCount =
    compiledArtifacts?.rows.filter((row) => row.package_type === "compiled-runtime")
      .length ?? 0;

  const stages: PipelineStage[] = [
    {
      label: "Source-linked",
      value: formatNumber(rulespecActivity.corpus_provision_file_count),
      detail: `${formatNumber(sourceLinkedRepoCount)} repo${sourceLinkedRepoCount === 1 ? "" : "s"} with source pointers`,
      progress: percentOf(sourceLinkedRepoCount, rulespecActivity.repo_count),
      tone: "neutral" as const,
    },
    {
      label: "Encoded",
      value: formatNumber(rulespecActivity.rulespec_count),
      detail: `${formatNumber(encodedRepoCount)} repo${encodedRepoCount === 1 ? "" : "s"} with RuleSpecs`,
      progress: percentOf(encodedRepoCount, rulespecActivity.repo_count),
      tone: "good" as const,
    },
    {
      label: "Tested",
      value: formatNumber(rulespecActivity.test_count),
      detail: `${formatNumber(testedRepoCount)} repos, ${formatNumber(testCoverage)}% file coverage`,
      progress: clampPercent(testCoverage),
      tone: testCoverage >= 90 ? "good" : "warn",
    },
    {
      label: "Packaged",
      value: formatNumber(rulespecActivity.manifest_count),
      detail: `${formatNumber(manifestRepoCount)} repos, ${formatNumber(manifestCoverage)}% manifest coverage`,
      progress: clampPercent(manifestCoverage),
      tone: manifestCoverage >= 70 ? "good" : "warn",
    },
    {
      label: "Applied package",
      value: formatNumber(appliedPackageCount),
      detail: "Signed apply manifests with provenance",
      progress: percentOf(appliedPackageCount, rulespecActivity.rulespec_count),
      tone: appliedPackageCount > 0 ? "good" : "warn",
    },
    {
      label: "Runtime compiled",
      value: formatNumber(compiledRuntimeCount),
      detail: "Precompiled runtime artifacts",
      progress: compiledRuntimeCount > 0 ? 100 : 0,
      tone: compiledRuntimeCount > 0 ? "good" : "warn",
    },
  ];

  return (
    <div className="mt-3 border border-[var(--color-rule)] rounded-md bg-[var(--color-paper-elevated)]">
      <div className="grid grid-cols-1 divide-y divide-[var(--color-rule)] md:grid-cols-3 md:divide-x md:divide-y-0 xl:grid-cols-6">
        {stages.map((stage, index) => (
          <div key={stage.label} className="p-3 xl:p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="font-mono text-[9px] uppercase tracking-wider text-[var(--color-ink-muted)] xl:text-[10px]">
                {index + 1}. {stage.label}
              </div>
              <span
                className={`h-2.5 w-2.5 rounded-full ${statusDotClass(stage.tone)}`}
                aria-hidden="true"
              />
            </div>
            <div className="mt-3 text-xl font-semibold tnum text-[var(--color-ink)] xl:text-2xl">
              {stage.value}
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--color-rule-subtle)]">
              <div
                className={`h-full ${progressFillClass(stage.tone)}`}
                style={{ width: `${stage.progress}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-[var(--color-ink-secondary)]">
              {stage.detail}
            </p>
          </div>
        ))}
      </div>
      <div className="border-t border-[var(--color-rule)] px-4 py-3 text-xs text-[var(--color-ink-secondary)]">
        {formatNumber(rulespecActivity.active_repo_count)} repos moved in the
        last {rulespecActivity.lookback_days} days. Counts are repository
        inventory signals: tests are files present, applied packages are
        provenance manifests, and runtime compiled artifacts are precompiled
        outputs.
      </div>
    </div>
  );
}

function ArtifactScopesPanel({
  report,
}: {
  report: ArtifactReport | null;
}) {
  if (!report) {
    return (
      <div className="mt-3 border border-[var(--color-rule)] rounded-md bg-[var(--color-paper-elevated)] p-5 text-sm text-[var(--color-ink-secondary)]">
        Release artifact scopes are unavailable.
      </div>
    );
  }

  const rows = report.rows.slice(0, TABLE_ROW_LIMIT);

  return (
    <div className="mt-3 border border-[var(--color-rule)] rounded-md bg-[var(--color-paper-elevated)]">
      <div className="flex flex-wrap gap-x-6 gap-y-2 border-b border-[var(--color-rule)] px-4 py-3 text-xs text-[var(--color-ink-secondary)]">
        <span>{formatNumber(report.release_scope_count)} release scopes</span>
        <span>{formatNumber(report.local_count)} local artifacts</span>
        <span>{formatNumber(report.remote_count)} R2 artifacts</span>
        <span>{formatNumber(report.supabase_group_count)} exact live counts</span>
        {report.supabase_mismatch_count > 0 && (
          <span>{formatNumber(report.supabase_mismatch_count)} counts unavailable</span>
        )}
        {report.rows.length > rows.length && (
          <span>
            Showing {formatNumber(rows.length)} of{" "}
            {formatNumber(report.rows.length)} scopes. Scroll for the visible
            page.
          </span>
        )}
      </div>
      <div className="max-h-[560px] overflow-auto">
        <table className="w-full min-w-[960px] text-sm">
          <thead className="sticky top-0 z-10 bg-[var(--color-rule-subtle)] text-[var(--color-ink-muted)]">
            <tr className="font-mono text-[10px] uppercase tracking-wider">
              <th className="text-left font-medium px-4 py-3">Jurisdiction</th>
              <th className="text-left font-medium px-4 py-3">Class</th>
              <th className="text-left font-medium px-4 py-3">Version</th>
              <th className="text-right font-medium px-4 py-3">Provisions</th>
              <th className="text-right font-medium px-4 py-3">Sources</th>
              <th className="text-left font-medium px-4 py-3">R2</th>
              <th className="text-left font-medium px-4 py-3">Supabase</th>
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? (
              rows.map((row) => (
                <ArtifactScopeTableRow
                  key={`${row.jurisdiction}:${row.document_class}:${row.version}`}
                  row={row}
                />
              ))
            ) : (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-6 text-center text-[var(--color-ink-secondary)]"
                >
                  No artifact scopes returned.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ArtifactScopeTableRow({ row }: { row: ArtifactScopeRow }) {
  return (
    <tr className="border-t border-[var(--color-rule)]">
      <td className="px-4 py-3 font-medium text-[var(--color-ink)]">
        {row.jurisdiction}
      </td>
      <td className="px-4 py-3 text-[var(--color-ink)]">
        {row.document_class}
      </td>
      <td className="px-4 py-3 font-mono text-xs text-[var(--color-ink-muted)]">
        {row.version}
      </td>
      <td className="px-4 py-3 text-right tnum">
        {formatNullableNumber(row.provision_count)}
      </td>
      <td className="px-4 py-3 text-right tnum">
        {formatNullableNumber(row.source_count)}
      </td>
      <td className="px-4 py-3">
        <StatusPill
          label={row.r2_complete == null ? "Unknown" : row.r2_complete ? "Synced" : "Missing"}
          tone={row.r2_complete == null ? "neutral" : row.r2_complete ? "good" : "warn"}
        />
      </td>
      <td className="px-4 py-3">
        <StatusPill
          label={row.supabase_matches_provisions ? "Matched" : "Check"}
          tone={
            row.supabase_matches_provisions ? "good" : "warn"
          }
        />
      </td>
    </tr>
  );
}

function CoverageByDocumentClassPanel({
  rows,
}: {
  rows: DocumentClassSummary[];
}) {
  return (
    <div className="mt-3 overflow-x-auto border border-[var(--color-rule)] rounded-md bg-[var(--color-paper-elevated)]">
      <table className="w-full min-w-[820px] text-sm">
        <thead className="bg-[var(--color-rule-subtle)] text-[var(--color-ink-muted)]">
          <tr className="font-mono text-[10px] uppercase tracking-wider">
            <th className="text-left font-medium px-4 py-3">Class</th>
            <th className="text-right font-medium px-4 py-3">Provisions</th>
            <th className="text-right font-medium px-4 py-3">Bodies</th>
            <th className="text-right font-medium px-4 py-3">Top level</th>
            <th className="text-right font-medium px-4 py-3">Encoded</th>
            <th className="text-right font-medium px-4 py-3">Jurisdictions</th>
          </tr>
        </thead>
        <tbody>
          {rows.length > 0 ? (
            rows.map((summary) => (
              <tr
                key={summary.document_class}
                className="border-t border-[var(--color-rule)]"
              >
                <td className="px-4 py-3 font-medium capitalize text-[var(--color-ink)]">
                  {summary.document_class}
                </td>
                <td className="px-4 py-3 text-right tnum">
                  {formatNumber(summary.provision_count)}
                </td>
                <td className="px-4 py-3 text-right tnum">
                  {formatNumber(summary.body_count)}
                </td>
                <td className="px-4 py-3 text-right tnum">
                  {formatNumber(summary.top_level_count)}
                </td>
                <td className="px-4 py-3 text-right tnum">
                  {formatNumber(summary.rulespec_count)}
                </td>
                <td className="px-4 py-3 text-right tnum">
                  {formatNullableNumber(summary.jurisdiction_count)}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={6}
                className="px-4 py-6 text-center text-[var(--color-ink-secondary)]"
              >
                No indexed corpus counts returned.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function RecentMovementPanel({
  report,
}: {
  report: RulespecRepoActivityReport | null;
}) {
  const rows = report?.rows.slice(0, 8) ?? [];

  return (
    <section>
      <SectionHeader
        eyebrow="Activity"
        title="Recent Movement"
        detail={report ? `${formatNumber(rows.length)} latest repos` : "Unavailable"}
      />
      <div className="mt-3 border border-[var(--color-rule)] rounded-md bg-[var(--color-paper-elevated)]">
        {rows.length > 0 ? (
          <ol className="divide-y divide-[var(--color-rule)]">
            {rows.map((row) => (
              <li key={row.name} className="px-4 py-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <a
                      href={row.url}
                      className="font-medium text-[var(--color-accent)] hover:underline"
                    >
                      {row.name}
                    </a>
                    <div className="mt-1 max-w-[520px] truncate text-sm text-[var(--color-ink)]">
                      {row.latest_commit?.message ?? "No commit message"}
                    </div>
                    <div className="mt-1 text-xs text-[var(--color-ink-secondary)]">
                      {row.latest_commit?.author ?? "Unknown author"}
                    </div>
                  </div>
                  <div className="font-mono text-xs text-[var(--color-ink-muted)] sm:text-right">
                    {formatShortDate(row.pushed_at)}
                    <div className="mt-1">
                      {formatNumber(row.rulespec_count)} encodings
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <div className="p-5 text-sm text-[var(--color-ink-secondary)]">
            No recent repo activity returned.
          </div>
        )}
      </div>
    </section>
  );
}

function AttentionQueuePanel({
  report,
}: {
  report: RulespecRepoActivityReport | null;
}) {
  const items = report ? buildAttentionItems(report.rows) : [];

  return (
    <section>
      <SectionHeader
        eyebrow="Readiness"
        title="Attention Queue"
        detail={report ? `${formatNumber(items.length)} signals` : "Unavailable"}
      />
      <div className="mt-3 border border-[var(--color-rule)] rounded-md bg-[var(--color-paper-elevated)]">
        {items.length > 0 ? (
          <ul className="divide-y divide-[var(--color-rule)]">
            {items.slice(0, 8).map((item) => (
              <li key={`${item.repo.name}:${item.reason}`} className="px-4 py-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <a
                      href={item.repo.url}
                      className="font-medium text-[var(--color-accent)] hover:underline"
                    >
                      {item.repo.name}
                    </a>
                    <div className="mt-1 text-sm text-[var(--color-ink-secondary)]">
                      {item.reason}
                    </div>
                  </div>
                  <StatusPill label={item.toneLabel} tone={item.tone} />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-5 text-sm text-[var(--color-ink-secondary)]">
            No readiness gaps detected from current repo metadata.
          </div>
        )}
      </div>
    </section>
  );
}

function RulespecRepoActivityPanel({
  report,
}: {
  report: RulespecRepoActivityReport | null;
}) {
  if (!report) {
    return (
      <div className="mt-3 border border-[var(--color-rule)] rounded-md bg-[var(--color-paper-elevated)] p-5 text-sm text-[var(--color-ink-secondary)]">
        GitHub RuleSpec repo activity is unavailable.
      </div>
    );
  }

  const rows = report.rows.slice(0, TABLE_ROW_LIMIT);

  return (
    <div className="mt-3 border border-[var(--color-rule)] rounded-md bg-[var(--color-paper-elevated)]">
      {report.rows.length > rows.length && (
        <div className="border-b border-[var(--color-rule)] px-4 py-3 text-xs text-[var(--color-ink-secondary)]">
          Showing latest {formatNumber(rows.length)} of{" "}
          {formatNumber(report.rows.length)} repos. Scroll for the visible page.
        </div>
      )}
      <div className="max-h-[720px] overflow-auto">
      <table className="w-full min-w-[1120px] text-sm">
        <thead className="sticky top-0 z-10 bg-[var(--color-rule-subtle)] text-[var(--color-ink-muted)]">
          <tr className="font-mono text-[10px] uppercase tracking-wider">
            <th className="text-left font-medium px-4 py-3">Repo</th>
            <th className="text-left font-medium px-4 py-3">Latest</th>
            <th className="text-left font-medium px-4 py-3">Author</th>
            <th className="text-right font-medium px-4 py-3">Encodings</th>
            <th className="text-right font-medium px-4 py-3">Tests</th>
            <th className="text-right font-medium px-4 py-3">Manifests</th>
            <th className="text-right font-medium px-4 py-3">Sources</th>
            <th className="text-left font-medium px-4 py-3">Pushed</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <RulespecRepoActivityRow key={row.name} row={row} />
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}

function RulespecRepoActivityRow({ row }: { row: RulespecRepoActivity }) {
  const latest = row.latest_commit;

  return (
    <tr className="border-t border-[var(--color-rule)]">
      <td className="px-4 py-3">
        <a
          href={row.url}
          className="font-medium text-[var(--color-accent)] hover:underline"
        >
          {row.name}
        </a>
        <div className="mt-1 font-mono text-[10px] text-[var(--color-ink-muted)]">
          {row.default_branch}
        </div>
      </td>
      <td className="px-4 py-3">
        {latest ? (
          <>
            <a
              href={latest.url}
              className="block max-w-[360px] truncate text-[var(--color-ink)] hover:text-[var(--color-accent)] hover:underline"
            >
              {latest.message || latest.sha}
            </a>
            <div className="mt-1 font-mono text-[10px] text-[var(--color-ink-muted)]">
              {latest.sha}
            </div>
          </>
        ) : (
          <span className="text-[var(--color-ink-secondary)]">No commits</span>
        )}
      </td>
      <td className="px-4 py-3 text-[var(--color-ink-secondary)]">
        {latest?.author ?? "-"}
      </td>
      <td className="px-4 py-3 text-right tnum">
        {formatNumber(row.rulespec_count)}
      </td>
      <td className="px-4 py-3 text-right tnum">
        {formatNumber(row.test_count)}
      </td>
      <td className="px-4 py-3 text-right tnum">
        {formatNumber(row.manifest_count)}
      </td>
      <td className="px-4 py-3 text-right tnum">
        {formatNumber(row.corpus_provision_file_count)}
      </td>
      <td className="px-4 py-3 font-mono text-xs text-[var(--color-ink-muted)]">
        {formatShortDate(row.pushed_at)}
      </td>
    </tr>
  );
}

function CompiledArtifactPanel({
  report,
}: {
  report: CompiledArtifactReport | null;
}) {
  if (!report) {
    return (
      <div className="mt-3 border border-[var(--color-rule)] rounded-md bg-[var(--color-paper-elevated)] p-5 text-sm text-[var(--color-ink-secondary)]">
        Package artifact activity is unavailable.
      </div>
    );
  }

  const packageCounts = {
    applied: report.rows.filter((row) => row.package_type === "applied-rulespec")
      .length,
    compiled: report.rows.filter((row) => row.package_type === "compiled-runtime")
      .length,
  };
  const rows = report.rows.slice(0, TABLE_ROW_LIMIT);

  return (
    <div className="mt-3 border border-[var(--color-rule)] rounded-md bg-[var(--color-paper-elevated)]">
      <div className="flex flex-wrap gap-x-6 gap-y-2 border-b border-[var(--color-rule)] px-4 py-3 text-xs text-[var(--color-ink-secondary)]">
        <span>
          {formatNumber(packageCounts.applied)} applied RuleSpec package
          {packageCounts.applied === 1 ? "" : "s"}
        </span>
        <span>
          {formatNumber(packageCounts.compiled)} compiled runtime artifact
          {packageCounts.compiled === 1 ? "" : "s"}
        </span>
        {report.rows.length > rows.length && (
          <span>
            Showing latest {formatNumber(rows.length)} of{" "}
            {formatNumber(report.rows.length)} artifacts. Scroll for the
            visible page.
          </span>
        )}
      </div>
      <div className="max-h-[720px] overflow-auto">
      <table className="w-full min-w-[1040px] text-sm">
        <thead className="sticky top-0 z-10 bg-[var(--color-rule-subtle)] text-[var(--color-ink-muted)]">
          <tr className="font-mono text-[10px] uppercase tracking-wider">
            <th className="text-left font-medium px-4 py-3">Package</th>
            <th className="text-left font-medium px-4 py-3">Type</th>
            <th className="text-left font-medium px-4 py-3">Repo</th>
            <th className="text-left font-medium px-4 py-3">Latest</th>
            <th className="text-left font-medium px-4 py-3">Author</th>
            <th className="text-left font-medium px-4 py-3">Sidecars</th>
            <th className="text-left font-medium px-4 py-3">Updated</th>
          </tr>
        </thead>
        <tbody>
          {rows.length > 0 ? (
            rows.map((row) => (
              <CompiledArtifactRow key={`${row.repo}:${row.path}`} row={row} />
            ))
          ) : (
            <tr>
              <td
                colSpan={7}
                className="px-4 py-6 text-center text-[var(--color-ink-secondary)]"
              >
                No executable packages discovered.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
}

function CompiledArtifactRow({ row }: { row: CompiledArtifactActivity }) {
  const latest = row.latest_commit;

  return (
    <tr className="border-t border-[var(--color-rule)]">
      <td className="px-4 py-3">
        <a
          href={row.url}
          className="font-medium text-[var(--color-accent)] hover:underline"
        >
          {row.package_id}
        </a>
        <div className="mt-1 max-w-[360px] truncate font-mono text-[10px] text-[var(--color-ink-muted)]">
          {row.path}
        </div>
      </td>
      <td className="px-4 py-3">
        <StatusPill
          label={row.package_type === "compiled-runtime" ? "compiled" : "applied"}
          tone={row.package_type === "compiled-runtime" ? "good" : "neutral"}
        />
      </td>
      <td className="px-4 py-3">
        <a
          href={row.repo_url}
          className="text-[var(--color-ink)] hover:text-[var(--color-accent)] hover:underline"
        >
          {row.repo}
        </a>
        <div className="mt-1 font-mono text-[10px] text-[var(--color-ink-muted)]">
          {row.default_branch}
        </div>
      </td>
      <td className="px-4 py-3">
        {latest ? (
          <>
            <a
              href={latest.url}
              className="block max-w-[320px] truncate text-[var(--color-ink)] hover:text-[var(--color-accent)] hover:underline"
            >
              {latest.message || latest.sha}
            </a>
            <div className="mt-1 font-mono text-[10px] text-[var(--color-ink-muted)]">
              {latest.sha}
            </div>
          </>
        ) : row.package_type === "applied-rulespec" ? (
          <>
            <span className="text-[var(--color-ink)]">Applied RuleSpec manifest</span>
            <div className="mt-1 font-mono text-[10px] text-[var(--color-ink-muted)]">
              Repo latest timestamp
            </div>
          </>
        ) : (
          <span className="text-[var(--color-ink-secondary)]">No commits</span>
        )}
      </td>
      <td className="px-4 py-3 text-[var(--color-ink-secondary)]">
        {latest?.author ?? "-"}
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-2">
          <StatusPill
            label="manifest"
            tone={row.has_manifest ? "good" : "warn"}
          />
          <StatusPill
            label="rulespec"
            tone={row.has_rulespec_bundle ? "good" : "neutral"}
          />
        </div>
      </td>
      <td className="px-4 py-3 font-mono text-xs text-[var(--color-ink-muted)]">
        {formatShortDate(row.pushed_at)}
      </td>
    </tr>
  );
}

function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: StatusTone;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-1 font-mono text-[10px] uppercase tracking-wider ${statusPillClass(tone)}`}
    >
      {label}
    </span>
  );
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function coverageRowsFromStatus(
  documentClasses: CorpusStatsDocumentClass[] | undefined,
  provisionRows: ProvisionCountRow[] | undefined,
  githubRulespecCounts: Record<string, number> | undefined
): DocumentClassSummary[] {
  const jurisdictionCounts = new Map(
    summarizeDocumentClasses(provisionRows ?? []).map((row) => [
      row.document_class,
      row.jurisdiction_count,
    ])
  );
  if (documentClasses && documentClasses.length > 0) {
    return documentClasses
      .map((row) => ({
        document_class: row.document_class,
        provision_count: row.count,
        body_count: row.body_count,
        top_level_count: row.top_level_count,
        rulespec_count:
          githubRulespecCounts?.[row.document_class] ?? row.rulespec_count,
        jurisdiction_count: jurisdictionCounts.get(row.document_class) ?? null,
      }))
      .sort((a, b) => b.provision_count - a.provision_count);
  }
  return summarizeDocumentClasses(provisionRows ?? []);
}

export function summarizeDocumentClasses(
  rows: ProvisionCountRow[]
): DocumentClassSummary[] {
  const byClass = new Map<
    string,
    {
      document_class: string;
      provision_count: number;
      body_count: number;
      top_level_count: number;
      rulespec_count: number;
      jurisdictions: Set<string>;
    }
  >();

  for (const row of rows) {
    const current =
      byClass.get(row.document_class) ??
      {
        document_class: row.document_class,
        provision_count: 0,
        body_count: 0,
        top_level_count: 0,
        rulespec_count: 0,
        jurisdictions: new Set<string>(),
      };
    current.provision_count += row.provision_count;
    current.body_count += row.body_count;
    current.top_level_count += row.top_level_count;
    current.rulespec_count += row.rulespec_count;
    current.jurisdictions.add(row.jurisdiction);
    byClass.set(row.document_class, current);
  }

  return Array.from(byClass.values())
    .map((row) => ({
      document_class: row.document_class,
      provision_count: row.provision_count,
      body_count: row.body_count,
      top_level_count: row.top_level_count,
      rulespec_count: row.rulespec_count,
      jurisdiction_count: row.jurisdictions.size,
    }))
    .sort((a, b) => b.provision_count - a.provision_count);
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

function formatNullableNumber(value: number | null): string {
  return value == null ? "-" : formatNumber(value);
}

function formatShortDate(value: string | null): string {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function latestDate(values: Array<string | null | undefined>): string | null {
  const dates = values
    .map((value) => {
      if (!value) return null;
      const time = Date.parse(value);
      return Number.isNaN(time) ? null : { value, time };
    })
    .filter((value): value is { value: string; time: number } => value !== null)
    .sort((a, b) => b.time - a.time);
  return dates[0]?.value ?? null;
}

function buildAttentionItems(rows: RulespecRepoActivity[]): AttentionItem[] {
  return rows.flatMap<AttentionItem>((repo) => {
    if (repo.rulespec_count === 0) {
      return [
        {
          repo,
          reason: "Skeleton or infrastructure repo with no RuleSpec encodings yet.",
          tone: "neutral" as const,
          toneLabel: "empty",
        },
      ];
    }
    if (repo.test_count === 0) {
      return [
        {
          repo,
          reason: `${formatNumber(repo.rulespec_count)} encodings without tests.`,
          tone: "warn" as const,
          toneLabel: "tests",
        },
      ];
    }
    if (repo.test_count < repo.rulespec_count) {
      return [
        {
          repo,
          reason: `${formatNumber(repo.rulespec_count - repo.test_count)} encodings do not have matching tests.`,
          tone: "warn" as const,
          toneLabel: "gap",
        },
      ];
    }
    if (repo.manifest_count === 0 && repo.rulespec_count > 0) {
      return [
        {
          repo,
          reason: "Encoded work has no manifests discovered.",
          tone: "warn" as const,
          toneLabel: "manifest",
        },
      ];
    }
    return [];
  });
}

function percentOf(value: number, total: number): number {
  if (total <= 0) return 0;
  return clampPercent(Math.round((value / total) * 100));
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function firstSource(status: CorpusStatusData): string | null {
  return (
    status.rulespecRepoActivity?.source ??
    status.compiledArtifacts?.source ??
    status.artifactReport.source ??
    status.corpusStats?.source ??
    null
  );
}

function sourceLabel(source: string | null): string {
  if (source === "status-url") return "Status URL";
  if (source === "github") return "GitHub";
  if (source === "r2") return "R2";
  if (source === "local") return "Local artifacts";
  if (source === "supabase") return "Supabase";
  return "Unavailable";
}

function statusDotClass(tone: StatusTone): string {
  if (tone === "good") return "bg-[var(--color-success)]";
  if (tone === "warn") return "bg-[var(--color-warning)]";
  if (tone === "bad") return "bg-[var(--color-error)]";
  return "bg-[var(--color-ink-muted)]";
}

function progressFillClass(tone: StatusTone): string {
  if (tone === "good") return "bg-[var(--color-success)]";
  if (tone === "warn") return "bg-[var(--color-warning)]";
  if (tone === "bad") return "bg-[var(--color-error)]";
  return "bg-[var(--color-accent)]";
}

function statusPillClass(tone: StatusTone): string {
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
