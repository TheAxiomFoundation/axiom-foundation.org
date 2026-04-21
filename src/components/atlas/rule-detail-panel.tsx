"use client";

import { useState, useEffect } from "react";
import { getJurisdictionLabel, isGitHubEncoding, isLabEncoding, type ViewerDocument } from "@/lib/atlas-utils";
import type { Rule } from "@/lib/supabase";
import { useEncoding } from "@/hooks/use-encoding";
import { useRuleReferences } from "@/hooks/use-rule-references";
import { trackAtlasEvent } from "@/lib/analytics";
import { SourceTab } from "./source-tab";
import { EncodingTab } from "./encoding-tab";
import { AgentLogsTab } from "./agent-logs-tab";
import { ReferencesPanel } from "./references-panel";

export function RuleDetailPanel({
  document,
  rule,
  onBack,
}: {
  document: ViewerDocument;
  rule: Rule;
  onBack?: () => void;
}) {
  const { encoding, sessionEvents, agentTranscripts, loading } = useEncoding(rule.id);
  const { outgoing, incoming } = useRuleReferences(rule.citation_path);
  const [logsOpen, setLogsOpen] = useState(false);
  const hasLabData = isLabEncoding(encoding);

  /* v8 ignore start -- analytics side effect */
  useEffect(() => {
    if (encoding) {
      trackAtlasEvent("atlas_encoding_viewed", {
        citation_path: rule.citation_path || rule.id,
        source: isGitHubEncoding(encoding) ? "github" : "lab",
      });
    }
  }, [encoding, rule.citation_path, rule.id]);
  /* v8 ignore stop */

  const docKind =
    document.jurisdiction === "us" || document.jurisdiction.startsWith("us-")
      ? "Code"
      : "Statute";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="px-8 py-6 border-b border-[var(--color-rule)] bg-[var(--color-paper-elevated)]">
        <div className="flex items-start gap-4">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label="Back to browser"
              className="mt-1 inline-flex items-center justify-center w-8 h-8 rounded border border-[var(--color-rule)] bg-transparent text-[var(--color-ink-muted)] cursor-pointer hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors shrink-0"
            >
              <svg
                viewBox="0 0 20 20"
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 15l-5-5 5-5" />
              </svg>
            </button>
          )}
          <div className="flex-1 min-w-0">
            <div className="eyebrow flex flex-wrap items-center gap-x-3 gap-y-1 mb-3">
              <span>{getJurisdictionLabel(document.jurisdiction)}</span>
              <span aria-hidden="true" className="text-[var(--color-ink-muted)]">
                ·
              </span>
              <span className="text-[var(--color-ink-muted)]">{docKind}</span>
              {document.hasRac && (
                <>
                  <span aria-hidden="true" className="text-[var(--color-ink-muted)]">
                    ·
                  </span>
                  <span>Encoded</span>
                </>
              )}
            </div>
            <h1 className="heading-section text-[var(--color-ink)] m-0 break-words">
              {document.citation}
            </h1>
            <p
              className="mt-3 text-[1.05rem] leading-snug text-[var(--color-ink-secondary)]"
              style={{ fontFamily: "var(--f-serif)" }}
            >
              {document.title}
            </p>
          </div>
        </div>
      </header>

      {/* Hero reader + rail */}
      <main className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] min-h-0">
          {/* Source: the hero reading column */}
          <article className="px-8 py-8 overflow-y-auto">
            <div className="eyebrow mb-6">Source</div>
            <SourceTab document={document} outgoingRefs={outgoing} />
          </article>

          {/* Rail: encoding + citation graph.
              On xl+ we pin the rail so the encoding stays in view while
              the source scrolls — the whole "prove faithfulness" story
              depends on both being visible together. */}
          <aside className="border-t xl:border-t-0 xl:border-l border-[var(--color-rule)] bg-[var(--color-paper)] xl:sticky xl:top-0 xl:self-start xl:max-h-screen xl:overflow-y-auto">
            <section className="px-6 py-8">
              <div className="eyebrow mb-6">Encoding</div>
              <EncodingTab
                encoding={encoding}
                loading={loading}
                jurisdiction={document.jurisdiction}
              />
            </section>
            {(outgoing.length > 0 || incoming.length > 0) && (
              <section className="px-6 pb-8 border-t border-[var(--color-rule)] pt-8">
                <ReferencesPanel outgoing={outgoing} incoming={incoming} />
              </section>
            )}
          </aside>
        </div>
      </main>

      {/* Agent logs drawer */}
      {(hasLabData || sessionEvents.length > 0 || loading) && (
        <div className="border-t border-[var(--color-rule)]">
          <button
            className="w-full px-6 py-3 flex items-center justify-between bg-transparent cursor-pointer hover:bg-[var(--color-code-bg)] transition-colors"
            onClick={() => setLogsOpen((prev) => !prev)}
          >
            <span className="font-mono text-xs text-[var(--color-ink-muted)] uppercase tracking-wider flex items-center gap-2">
              <span>{logsOpen ? "\u25BC" : "\u25B6"}</span>
              Agent logs
              {!loading && sessionEvents.length > 0 && (
                <span className="text-[var(--color-ink-muted)]">
                  ({sessionEvents.length} events)
                </span>
              )}
              {encoding?.autorac_version && (
                <span className="normal-case text-[var(--color-ink-muted)]">
                  autorac {encoding.autorac_version}
                </span>
              )}
            </span>
          </button>
          {logsOpen && (
            <div className="px-6 pb-6 max-h-[500px] overflow-y-auto">
              <AgentLogsTab
                sessionEvents={sessionEvents}
                agentTranscripts={agentTranscripts}
                encoding={encoding}
                loading={loading}
                /* v8 ignore next -- null coalescing branch */
                sessionId={encoding?.session_id ?? null}
              />
            </div>
          )}
        </div>
      )}

      {/* Meta strip */}
      <footer className="flex items-center justify-end px-8 py-2 border-t border-[var(--color-rule)] bg-[var(--color-paper-elevated)]">
        <span className="font-mono text-xs text-[var(--color-ink-muted)]">
          {document.subsections.length} subsection
          {document.subsections.length === 1 ? "" : "s"}
          {encoding && " · RAC"}
        </span>
      </footer>
    </div>
  );
}
