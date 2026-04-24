"use client";

import { useState } from "react";
import CodeBlock from "@/components/code-block";

type CodeLang =
  | "rac"
  | "catala"
  | "python"
  | "yaml"
  | "xml"
  | "plain";

interface ExpandableCodeProps {
  code: string;
  language: CodeLang;
  /**
   * Line threshold above which the block renders collapsed by default.
   * Short encodings render in full so the expand/collapse chrome only
   * appears when it actually saves space.
   */
  threshold?: number;
  /**
   * Max pixel height when collapsed. Tuned so roughly ``threshold``
   * lines of the default code font show before the fade kicks in.
   */
  collapsedMaxHeight?: number;
}

const CODE_CLASS =
  "p-4 bg-[var(--color-code-bg)] border border-[var(--color-rule)] rounded-md overflow-x-auto text-xs text-[var(--color-code-text)] leading-relaxed whitespace-pre-wrap break-words";

/**
 * Code-block wrapper that collapses long RAC / Catala snippets behind
 * a fade and an "Expand" button. Short snippets render normally — the
 * chrome only appears when the encoding would otherwise dominate the
 * rail.
 *
 * On expand we also remove the rounded-bottom so the button docks
 * cleanly underneath the code; on collapse a top-to-bottom fade
 * signals "there's more below".
 */
export function ExpandableCode({
  code,
  language,
  threshold = 16,
  collapsedMaxHeight = 320,
}: ExpandableCodeProps) {
  const [expanded, setExpanded] = useState(false);
  const lineCount = code.split("\n").length;

  // Short enough to just show the whole thing — no collapse chrome.
  if (lineCount <= threshold) {
    return <CodeBlock code={code} language={language} className={CODE_CLASS} />;
  }

  const codeClassName = expanded
    ? CODE_CLASS + " rounded-b-none border-b-0"
    : CODE_CLASS + " rounded-b-none border-b-0 overflow-hidden";

  return (
    <div>
      <div
        className="relative"
        style={expanded ? undefined : { maxHeight: collapsedMaxHeight, overflow: "hidden" }}
      >
        <CodeBlock code={code} language={language} className={codeClassName} />
        {!expanded && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[var(--color-code-bg)] to-transparent"
          />
        )}
      </div>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-[var(--color-ink-muted)] bg-[var(--color-paper-elevated)] border border-[var(--color-rule)] rounded-b-md hover:text-[var(--color-accent)] hover:border-[var(--color-accent)] transition-colors focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:outline-offset-2"
      >
        <span>{expanded ? "Collapse" : `Expand · ${lineCount} lines`}</span>
        <svg
          viewBox="0 0 20 20"
          className={`w-3 h-3 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M5 8l5 5 5-5" />
        </svg>
      </button>
    </div>
  );
}
