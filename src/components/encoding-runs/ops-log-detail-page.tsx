import Link from "next/link";
import { AgentLogsTab } from "@/components/axiom/agent-logs-tab";
import type {
  AgentTranscript,
  EncodingRunDetail,
  SDKSession,
  SDKSessionEvent,
} from "@/lib/supabase";
import { encodingRunToRuleEncodingData } from "@/lib/supabase";

function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDuration(ms: number | null | undefined): string {
  if (ms == null) return "-";
  if (ms < 1000) return `${ms}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(seconds >= 10 ? 0 : 1)}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.round(seconds % 60);
  return `${minutes}m ${remaining}s`;
}

function formatNumber(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "-";
  return new Intl.NumberFormat("en-US").format(value);
}

function formatCurrency(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 4,
  }).format(value);
}

function detailValue(value: string | number | null | undefined): string {
  if (value == null || value === "") return "-";
  return String(value);
}

function DetailShell({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen pt-28 pb-16">
      <div className="max-w-[1280px] mx-auto px-6 md:px-8">
        <header className="border-b border-[var(--color-rule)] pb-6">
          <Link
            href="/ops"
            className="font-mono text-xs uppercase tracking-wider text-[var(--color-accent)] no-underline hover:underline"
          >
            Back to ops
          </Link>
          <p className="eyebrow mt-5 mb-3">{eyebrow}</p>
          <h1 className="heading-section text-[var(--color-ink)] break-words">
            {title}
          </h1>
          <p className="mt-3 max-w-[860px] text-sm md:text-base text-[var(--color-ink-secondary)]">
            {subtitle}
          </p>
        </header>
        {children}
      </div>
    </div>
  );
}

function DetailGrid({ children }: { children: React.ReactNode }) {
  return (
    <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {children}
    </dl>
  );
}

function DetailItem({
  label,
  value,
  href,
}: {
  label: string;
  value: string | number | null | undefined;
  href?: string | null;
}) {
  const rendered = detailValue(value);
  return (
    <div className="rounded-md border border-[var(--color-rule)] bg-[var(--color-paper-elevated)] p-4">
      <dt className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)]">
        {label}
      </dt>
      <dd className="mt-2 min-w-0 font-mono text-sm tnum text-[var(--color-ink)] break-words">
        {href && rendered !== "-" ? (
          <Link
            href={href}
            className="text-[var(--color-accent)] no-underline hover:underline"
          >
            {rendered}
          </Link>
        ) : (
          rendered
        )}
      </dd>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <h2 className="font-mono text-xs uppercase tracking-wider text-[var(--color-ink-muted)]">
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function LogPanel({
  events,
  transcripts,
  run,
}: {
  events: SDKSessionEvent[];
  transcripts: AgentTranscript[];
  run: EncodingRunDetail | null;
}) {
  return (
    <div className="rounded-md border border-[var(--color-rule)] bg-[var(--color-paper-elevated)] p-4 md:p-5">
      <AgentLogsTab
        sessionEvents={events}
        agentTranscripts={transcripts}
        encoding={run ? encodingRunToRuleEncodingData(run) : null}
        loading={false}
        sessionId={run?.session_id ?? events[0]?.session_id ?? null}
      />
    </div>
  );
}

export function EncodingRunLogPage({
  run,
  session,
  events,
  transcripts,
}: {
  run: EncodingRunDetail;
  session: SDKSession | null;
  events: SDKSessionEvent[];
  transcripts: AgentTranscript[];
}) {
  const sessionHref = run.session_id
    ? `/ops/sessions/${encodeURIComponent(run.session_id)}`
    : null;
  const title = run.citation ?? run.id;

  return (
    <DetailShell
      eyebrow="Encoding run"
      title={title}
      subtitle="Run metadata, linked SDK session telemetry, agent phases, provenance events, and raw event timeline from Supabase."
    >
      <Section title="Run metadata">
        <DetailGrid>
          <DetailItem label="Run id" value={run.id} />
          <DetailItem label="Session" value={run.session_id} href={sessionHref} />
          <DetailItem label="Issues" value={run.has_issues ? "Check" : run.has_issues === false ? "Clear" : null} />
          <DetailItem label="Started" value={formatDate(run.timestamp)} />
          <DetailItem label="Model" value={run.agent_model ?? run.agent_type} />
          <DetailItem label="Duration" value={formatDuration(run.total_duration_ms)} />
          <DetailItem label="Source" value={run.data_source?.replaceAll("_", " ")} />
          <DetailItem label="Encoder" value={run.encoder_version} />
        </DetailGrid>
      </Section>

      <Section title="RuleSpec output">
        <div className="rounded-md border border-[var(--color-rule)] bg-[var(--color-paper-elevated)] p-4">
          <div className="font-mono text-xs text-[var(--color-ink-muted)] break-all">
            {run.file_path ?? "No file path recorded"}
          </div>
          {run.note && (
            <p className="mt-3 text-sm text-[var(--color-ink-secondary)]">
              {run.note}
            </p>
          )}
        </div>
      </Section>

      {session && (
        <Section title="SDK session">
          <DetailGrid>
            <DetailItem label="Status" value={session.ended_at ? "Finished" : "Running"} />
            <DetailItem label="Events" value={formatNumber(session.event_count)} />
            <DetailItem
              label="Tokens"
              value={formatNumber(session.input_tokens + session.output_tokens)}
            />
            <DetailItem label="Cost" value={formatCurrency(session.estimated_cost_usd)} />
          </DetailGrid>
        </Section>
      )}

      <Section title="Agent log">
        <LogPanel events={events} transcripts={transcripts} run={run} />
      </Section>
    </DetailShell>
  );
}

export function SDKSessionLogPage({
  session,
  runs,
  events,
  transcripts,
}: {
  session: SDKSession;
  runs: EncodingRunDetail[];
  events: SDKSessionEvent[];
  transcripts: AgentTranscript[];
}) {
  const primaryRun = runs[0] ?? null;

  return (
    <DetailShell
      eyebrow="SDK session"
      title={session.id}
      subtitle="Session-level encoder telemetry, linked encoding runs, agent phases, provenance events, and raw event timeline from Supabase."
    >
      <Section title="Session metadata">
        <DetailGrid>
          <DetailItem label="Status" value={session.ended_at ? "Finished" : "Running"} />
          <DetailItem label="Started" value={formatDate(session.started_at)} />
          <DetailItem label="Ended" value={formatDate(session.ended_at)} />
          <DetailItem label="Model" value={session.model} />
          <DetailItem label="Events" value={formatNumber(session.event_count)} />
          <DetailItem
            label="Tokens"
            value={formatNumber(session.input_tokens + session.output_tokens)}
          />
          <DetailItem label="Cache reads" value={formatNumber(session.cache_read_tokens)} />
          <DetailItem label="Cost" value={formatCurrency(session.estimated_cost_usd)} />
          <DetailItem label="Encoder" value={session.encoder_version} />
          <DetailItem label="Working directory" value={session.cwd} />
        </DetailGrid>
      </Section>

      <Section title="Linked encoding runs">
        {runs.length > 0 ? (
          <div className="overflow-x-auto rounded-md border border-[var(--color-rule)] bg-[var(--color-paper-elevated)]">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-[var(--color-rule-subtle)] text-[var(--color-ink-muted)]">
                <tr className="font-mono text-[10px] uppercase tracking-wider">
                  <th className="px-4 py-3 text-left font-medium">Citation</th>
                  <th className="px-4 py-3 text-left font-medium">Run</th>
                  <th className="px-4 py-3 text-left font-medium">Issues</th>
                  <th className="px-4 py-3 text-left font-medium">Started</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id} className="border-t border-[var(--color-rule)]">
                    <td className="px-4 py-3 text-[var(--color-ink)]">
                      <Link
                        href={`/ops/runs/${encodeURIComponent(run.id)}`}
                        className="font-medium text-[var(--color-accent)] no-underline hover:underline"
                      >
                        {run.citation ?? run.id}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[var(--color-ink-muted)]">
                      {run.id}
                    </td>
                    <td className="px-4 py-3 text-[var(--color-ink-secondary)]">
                      {run.has_issues ? "Check" : run.has_issues === false ? "Clear" : "-"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[var(--color-ink-muted)]">
                      {formatDate(run.timestamp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-md border border-[var(--color-rule)] bg-[var(--color-paper-elevated)] p-5 text-sm text-[var(--color-ink-secondary)]">
            No encoding runs are linked to this session.
          </div>
        )}
      </Section>

      <Section title="Agent log">
        <LogPanel events={events} transcripts={transcripts} run={primaryRun} />
      </Section>
    </DetailShell>
  );
}
