"use client";

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
      <div className="flex items-center justify-center py-20 text-[var(--color-text-muted)]">
        Loading encoding data...
      </div>
    );
  }

  if (!encoding) {
    return (
      <div className="py-20 text-center">
        <div className="font-heading text-lg text-[var(--color-text-muted)] mb-2">
          Not yet encoded
        </div>
        <p className="text-sm text-[var(--color-text-muted)]">
          This rule has not been encoded into RAC format yet.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-[800px] mx-auto">
      {/* Citation */}
      <div className="mb-6">
        <span className="font-mono text-xs text-[var(--color-text-muted)] uppercase tracking-wider">
          Citation
        </span>
        <div className="font-mono text-sm text-[var(--color-text)] mt-1">
          {encoding.citation}
        </div>
      </div>

      {/* Scores */}
      {encoding.final_scores && (
        <div className="mb-6">
          <span className="font-mono text-xs text-[var(--color-text-muted)] uppercase tracking-wider">
            Scores
          </span>
          <div className="grid grid-cols-4 gap-4 mt-2">
            {(
              Object.entries(encoding.final_scores) as [string, number][]
            ).map(([key, value]) => (
              <div
                key={key}
                className="bg-[rgba(59,130,246,0.05)] border border-[var(--color-border-subtle)] rounded-lg p-3 text-center"
              >
                <div className="font-mono text-lg font-semibold text-[var(--color-precision)]">
                  {value}
                </div>
                <div className="text-xs text-[var(--color-text-muted)] capitalize">
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
          <span className="font-mono text-xs text-[var(--color-text-muted)] uppercase tracking-wider">
            RAC encoding
          </span>
          <pre className="mt-2 p-4 bg-[rgba(0,0,0,0.3)] border border-[var(--color-border-subtle)] rounded-lg overflow-x-auto text-sm text-[var(--color-text-secondary)] leading-relaxed whitespace-pre-wrap">
            {encoding.rac_content}
          </pre>
        </div>
      )}

      {/* File path */}
      <div className="mt-6 pt-4 border-t border-[var(--color-border-subtle)]">
        <span className="font-mono text-xs text-[var(--color-text-muted)]">
          File:{" "}
        </span>
        <code className="font-mono text-xs text-[var(--color-precision)]">
          {encoding.file_path}
        </code>
      </div>
    </div>
  );
}
