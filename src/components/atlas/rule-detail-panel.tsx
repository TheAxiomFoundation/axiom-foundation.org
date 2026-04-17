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

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-rule)] bg-[var(--color-paper-elevated)]">
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              className="w-8 h-8 flex items-center justify-center bg-transparent border border-[var(--color-rule)] rounded text-[var(--color-ink-muted)] cursor-pointer hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors"
              onClick={onBack}
              title="Back to browser"
            >
              ←
            </button>
          )}
          <div>
            <h1 className="font-heading text-lg text-[var(--color-ink)] m-0">
              {document.title}
            </h1>
            <span className="font-mono text-xs text-[var(--color-ink-muted)]">
              {document.citation}
            </span>
          </div>
        </div>

        <span className="font-mono text-xs font-semibold text-[var(--color-accent)]">
          {getJurisdictionLabel(document.jurisdiction)}
        </span>
      </header>

      {/* Side-by-side: source + encoding */}
      <main className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 min-h-0">
          {/* Source pane */}
          <div className="p-6 overflow-y-auto lg:border-r border-[var(--color-rule)]">
            <div className="font-mono text-xs text-[var(--color-ink-muted)] uppercase tracking-wider mb-4">
              Source
            </div>
            <SourceTab document={document} outgoingRefs={outgoing} />
            <ReferencesPanel outgoing={outgoing} incoming={incoming} />
          </div>

          {/* Encoding pane */}
          <div className="p-6 overflow-y-auto border-t lg:border-t-0 border-[var(--color-rule)]">
            <div className="font-mono text-xs text-[var(--color-ink-muted)] uppercase tracking-wider mb-4">
              Encoding
            </div>
            <EncodingTab
              encoding={encoding}
              loading={loading}
              jurisdiction={document.jurisdiction}
            />
          </div>
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

      {/* Status bar */}
      <footer className="flex items-center justify-between px-6 py-2 border-t border-[var(--color-rule)] bg-[var(--color-paper-elevated)]">
        <div className="flex items-center gap-2 text-xs text-[var(--color-ink-muted)]">
          <span className="w-1.5 h-1.5 bg-[var(--color-success)] rounded-full" />
          <span>Connected to Atlas</span>
        </div>
        <span className="text-xs text-[var(--color-ink-muted)]">
          {document.subsections.length} subsections
          {encoding && " | RAC available"}
        </span>
      </footer>
    </div>
  );
}
