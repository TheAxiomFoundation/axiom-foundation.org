"use client";

import { isGitHubEncoding } from "@/lib/axiom-utils";
import type { RuleEncodingData } from "@/lib/supabase";
import { getRuleSpecRepoForJurisdiction } from "@/lib/axiom/repo-map";
import { ExpandableCode } from "./expandable-code";

type CodeLang = "rulespec" | "catala" | "python" | "yaml" | "xml" | "plain";

/**
 * Pick the right Prism grammar from a file path. The axiom ships two
 * encoding languages today (RuleSpec and Catala); everything else falls back
 * to plain text so we don't mis-highlight.
 */
export function languageFromPath(path: string): CodeLang {
  const lower = path.toLowerCase();
  if (lower.includes(".catala")) return "catala";
  if (lower.endsWith(".py")) return "python";
  if (
    lower.endsWith(".rulespec") ||
    lower.endsWith(".yaml") ||
    lower.endsWith(".yml")
  ) {
    return "rulespec";
  }
  if (lower.endsWith(".xml")) return "xml";
  return "plain";
}

export function EncodingTab({
  encoding,
  loading,
  jurisdiction,
}: {
  encoding: RuleEncodingData | null;
  loading: boolean;
  jurisdiction: string;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-[var(--color-ink-muted)]">
        Loading encoding data...
      </div>
    );
  }

  if (!encoding) {
    return (
      <div className="py-10 text-center">
        <div
          className="text-base text-[var(--color-ink-secondary)] mb-2"
          style={{ fontFamily: "var(--f-serif)" }}
        >
          Not yet encoded
        </div>
        <p className="text-sm text-[var(--color-ink-muted)] leading-relaxed">
          This rule has not been encoded into RuleSpec format yet.
        </p>
      </div>
    );
  }

  const isGitHub = isGitHubEncoding(encoding);
  const repo = getRuleSpecRepoForJurisdiction(jurisdiction);
  const gitHubUrl = repo
    ? `https://github.com/TheAxiomFoundation/${repo}/blob/main/${encoding.file_path}`
    : null;
  const sourceDescription = isGitHub
    ? "Displaying the canonical repository encoding."
    : "Displaying the latest stored encoding run. It may differ from the repository file.";
  const language = languageFromPath(encoding.file_path);
  const scores = encoding.final_scores;

  return (
    <div className="space-y-6">
      {/* Source path */}
      <div>
        <div className="eyebrow mb-3">Shown source</div>
        <code className="block font-mono text-xs text-[var(--color-accent)] break-all">
          {encoding.file_path}
        </code>
        <p className="mt-2 text-xs text-[var(--color-ink-muted)] leading-relaxed">
          {sourceDescription}
        </p>
        {gitHubUrl && (
          <a
            href={gitHubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 font-mono text-xs text-[var(--color-accent)] no-underline hover:underline focus-visible:underline"
          >
            <svg
              className="w-3.5 h-3.5"
              viewBox="0 0 16 16"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
            {isGitHub ? "View on GitHub" : "View canonical repo file"}
          </a>
        )}
      </div>

      {/* Scores — skip for GitHub sources (no Encoder metadata) */}
      {scores && !isGitHub && (
        <div>
          <div className="eyebrow mb-3">Scores</div>
          <ul className="space-y-2">
            {(Object.entries(scores) as [string, number][]).map(
              ([key, value]) => (
                <li key={key} className="flex items-center gap-3 text-xs">
                  <span className="w-20 shrink-0 font-mono uppercase tracking-wider text-[var(--color-ink-muted)]">
                    {key}
                  </span>
                  <span
                    role="progressbar"
                    aria-label={`${key} score`}
                    aria-valuenow={value}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    className="flex-1 h-1.5 bg-[var(--color-rule-subtle)] rounded overflow-hidden"
                  >
                    <span
                      className="block h-full bg-[var(--color-accent)]"
                      style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
                    />
                  </span>
                  <span className="w-8 text-right font-mono tabular-nums text-[var(--color-ink)]">
                    {value}
                  </span>
                </li>
              )
            )}
          </ul>
        </div>
      )}

      {/* RuleSpec content */}
      {encoding.rulespec_content && (
        <div>
          <div className="eyebrow mb-3">RuleSpec encoding</div>
          <ExpandableCode
            code={encoding.rulespec_content}
            language={language}
            label={encoding.file_path}
          />
        </div>
      )}
    </div>
  );
}
