"use client";

import { useState } from "react";
import type { ViewerDocument } from "@/lib/atlas-utils";

/* v8 ignore start -- markdown table parsing, tested via integration */
function parseMarkdownTable(tableLines: string[]): {
  headers: string[];
  rows: string[][];
} | null {
  if (tableLines.length < 3) return null;

  const parseLine = (line: string) =>
    line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());

  const headers = parseLine(tableLines[0]);
  // Verify separator line
  const sep = tableLines[1];
  if (!/^\|[\s-|]+\|$/.test(sep)) return null;

  const rows = tableLines.slice(2).map(parseLine);
  return { headers, rows };
}

function RichText({ text }: { text: string }) {
  const lines = text.split("\n");
  const segments: Array<
    { type: "text"; content: string } | { type: "table"; headers: string[]; rows: string[][] }
  > = [];

  let i = 0;
  while (i < lines.length) {
    if (lines[i].startsWith("|") && i + 2 < lines.length && lines[i + 1].startsWith("|")) {
      // Collect consecutive table lines
      const tableStart = i;
      while (i < lines.length && lines[i].startsWith("|")) {
        i++;
      }
      const table = parseMarkdownTable(lines.slice(tableStart, i));
      if (table) {
        segments.push({ type: "table", ...table });
      } else {
        segments.push({ type: "text", content: lines.slice(tableStart, i).join("\n") });
      }
    } else {
      const textStart = i;
      while (i < lines.length && !lines[i].startsWith("|")) {
        i++;
      }
      segments.push({ type: "text", content: lines.slice(textStart, i).join("\n") });
    }
  }

  return (
    <div className="text-[0.95rem] text-[var(--color-text-secondary)] leading-relaxed">
      {segments.map((seg, idx) => {
        if (seg.type === "text") {
          return (
            <p key={idx} className="whitespace-pre-wrap">
              {seg.content}
            </p>
          );
        }
        return (
          <div key={idx} className="my-3 overflow-x-auto">
            <table className="border-collapse text-sm w-full">
              <thead>
                <tr className="border-b border-[var(--color-border-subtle)]">
                  {seg.headers.map((h, hi) => (
                    <th
                      key={hi}
                      className="text-left px-3 py-2 text-[var(--color-text-muted)] font-medium text-xs uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {seg.rows.map((row, ri) => (
                  <tr
                    key={ri}
                    className="border-b border-[var(--color-border-subtle)] last:border-0"
                  >
                    {row.map((cell, ci) => (
                      <td
                        key={ci}
                        className="px-3 py-2 text-[var(--color-text-secondary)]"
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
/* v8 ignore stop */

export function SourceTab({ document }: { document: ViewerDocument }) {
  const [highlightedSection, setHighlightedSection] = useState<string | null>(
    null
  );

  return (
    <div className="max-w-[800px] mx-auto">
      {document.subsections.map((subsection) => (
        <div
          key={subsection.id}
          className={`flex gap-4 p-4 rounded-lg mb-3 transition-colors duration-150 cursor-default ${
            highlightedSection === subsection.id
              ? "bg-[rgba(59,130,246,0.08)]"
              : "hover:bg-[rgba(255,255,255,0.02)]"
          }`}
          onMouseEnter={() => setHighlightedSection(subsection.id)}
          onMouseLeave={() => setHighlightedSection(null)}
        >
          <span className="font-mono text-xs text-[var(--color-precision)] pt-1 shrink-0">
            ({subsection.id})
          </span>
          <RichText text={subsection.text} />
        </div>
      ))}

      {document.archPath && (
        <div className="mt-8 pt-4 border-t border-[var(--color-border-subtle)]">
          <span className="font-mono text-xs text-[var(--color-text-muted)]">
            Source:{" "}
          </span>
          <code className="font-mono text-xs text-[var(--color-precision)]">
            {document.archPath}
          </code>
        </div>
      )}
    </div>
  );
}
