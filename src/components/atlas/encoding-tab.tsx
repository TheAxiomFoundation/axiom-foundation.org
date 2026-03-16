"use client";

import { isGitHubEncoding } from "@/lib/atlas-utils";
import type { RuleEncodingData } from "@/lib/supabase";

export function EncodingTab({
  encoding,
  loading,
}: {
  encoding: RuleEncodingData | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-[var(--color-ink-muted)]">
        Loading encoding data...
      </div>
    );
  }

  if (!encoding) {
    return (
      <div className="py-20 text-center">
        <div className="font-heading text-lg text-[var(--color-ink-muted)] mb-2">
          Not yet encoded
        </div>
        <p className="text-sm text-[var(--color-ink-muted)]">
          This rule has not been encoded into RAC format yet.
        </p>
      </div>
    );
  }

  const isGitHub = isGitHubEncoding(encoding);
  const gitHubUrl = isGitHub
    ? `https://github.com/RuleAtlas/rac-us/blob/main/${encoding.file_path}`
    : null;

  return (
    <div className="max-w-[800px] mx-auto">
      {/* Source indicator for GitHub */}
      {isGitHub && gitHubUrl && (
        <div className="mb-6">
          <span className="font-mono text-xs text-[var(--color-ink-muted)] uppercase tracking-wider">
            Source
          </span>
          <div className="mt-1">
            <a
              href={gitHubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-[var(--color-accent)] hover:underline"
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
              </svg>
              View on GitHub
            </a>
          </div>
        </div>
      )}

      {/* Scores — skip for GitHub sources (no AutoRAC metadata) */}
      {encoding.final_scores && !isGitHub && (
        <div className="mb-6">
          <span className="font-mono text-xs text-[var(--color-ink-muted)] uppercase tracking-wider">
            Scores
          </span>
          <div className="grid grid-cols-4 gap-4 mt-2">
            {(
              Object.entries(encoding.final_scores) as [string, number][]
            ).map(([key, value]) => (
              <div
                key={key}
                className="bg-[var(--color-accent-light)] border border-[var(--color-rule)] rounded-md p-3 text-center"
              >
                <div className="font-mono text-lg font-semibold text-[var(--color-accent)]">
                  {value}
                </div>
                <div className="text-xs text-[var(--color-ink-muted)] capitalize">
                  {key}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RAC content */}
      {encoding.rac_content && (
        <div>
          <span className="font-mono text-xs text-[var(--color-ink-muted)] uppercase tracking-wider">
            RAC encoding
          </span>
          <pre className="mt-2 p-4 bg-[var(--color-code-bg)] border border-[var(--color-rule)] rounded-md overflow-x-auto text-sm text-[var(--color-code-text)] leading-relaxed whitespace-pre-wrap">
            {encoding.rac_content}
          </pre>
        </div>
      )}

    </div>
  );
}
