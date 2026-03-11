"use client";

import type { SDKSessionEvent } from "@/lib/supabase";

export type BadgeColors = Record<string, { bg: string; fg: string }>;

/* v8 ignore start -- content parsing helpers for agent log display */

/** Extract thinking text from Python repr: [ThinkingBlock(thinking='...',...)] */
function extractThinking(content: string): string | null {
  const match = content.match(/ThinkingBlock\(thinking='([\s\S]*?)(?:',\s*signature=)/);
  if (!match) return null;
  return match[1].replace(/\\n/g, "\n").replace(/\\'/g, "'");
}

/** Extract tool info from Python repr: [ToolUseBlock(id='...', name='...', input={...})] */
function extractToolUse(content: string): { name: string; input: Record<string, unknown> } | null {
  const nameMatch = content.match(/ToolUseBlock\([^)]*name='([^']+)'/);
  if (!nameMatch) return null;
  // Try to get input from metadata first (more reliable), fall back to parsing
  const inputMatch = content.match(/input=(\{[\s\S]*?\})\)/);
  let input: Record<string, unknown> = {};
  if (inputMatch) {
    try {
      // Python dict uses single quotes; try JSON parse after converting
      const jsonStr = inputMatch[1]
        .replace(/'/g, '"')
        .replace(/True/g, "true")
        .replace(/False/g, "false")
        .replace(/None/g, "null");
      input = JSON.parse(jsonStr);
    } catch {
      // If parsing fails, just show the raw input string
    }
  }
  return { name: nameMatch[1], input };
}

/** Check if content is a permission error */
function isPermissionError(content: string): boolean {
  return content.includes("requested permissions to use") && content.includes("haven't granted");
}

/** Check if content is a tool error */
function isToolError(content: string): boolean {
  return content.includes("<tool_use_error>") || content.includes("tool call errored");
}

/** Check if content is a persisted output reference */
function isPersistedOutput(content: string): boolean {
  return content.startsWith("<persisted-output>");
}

/** Get a clean display text for the event */
function getDisplayContent(event: SDKSessionEvent): {
  text: string;
  kind: "thinking" | "tool_call" | "tool_output" | "error" | "permission" | "text" | "empty";
} {
  const content = event.content || "";
  const meta = event.metadata as Record<string, unknown> | null;
  const summary = meta?.summary as string | undefined;

  if (!content && !summary) return { text: "", kind: "empty" };

  // Permission errors
  if (isPermissionError(content)) {
    const toolMatch = content.match(/permissions to use (\w+)/);
    return {
      text: `Permission denied: ${toolMatch?.[1] || "unknown tool"}`,
      kind: "permission",
    };
  }

  // Tool errors
  if (isToolError(content)) {
    const errMatch = content.match(/<tool_use_error>([\s\S]*?)<\/tool_use_error>/);
    return {
      text: errMatch?.[1] || "Tool call error",
      kind: "error",
    };
  }

  // Thinking blocks
  const thinking = extractThinking(content);
  if (thinking) return { text: thinking, kind: "thinking" };

  // Tool use blocks
  const toolUse = extractToolUse(content);
  if (toolUse) {
    const metaInput = meta?.tool_input as Record<string, unknown> | undefined;
    const input = metaInput || toolUse.input;
    const inputStr = Object.entries(input)
      .map(([k, v]) => {
        const val = typeof v === "string" ? v : JSON.stringify(v);
        const truncated = val.length > 200 ? val.slice(0, 200) + "..." : val;
        return `${k}: ${truncated}`;
      })
      .join("\n");
    return {
      text: inputStr || toolUse.name,
      kind: "tool_call",
    };
  }

  // Persisted output
  if (isPersistedOutput(content)) {
    const sizeMatch = content.match(/Output too large \(([^)]+)\)/);
    return {
      text: `Large output (${sizeMatch?.[1] || "truncated"})`,
      kind: "tool_output",
    };
  }

  // Use summary if content is empty or very short
  if (summary && summary.length > 3) {
    return { text: summary, kind: "text" };
  }

  return { text: content, kind: "text" };
}

/* v8 ignore stop */

export function EventRow({
  event,
  sessionStart,
  isExpanded,
  badgeColors,
  onToggle,
}: {
  event: SDKSessionEvent;
  sessionStart: string;
  isExpanded: boolean;
  badgeColors: BadgeColors;
  onToggle: (e: React.MouseEvent) => void;
}) {
  const sessionStartMs = new Date(sessionStart).getTime();
  const eventTime = new Date(event.timestamp).getTime();
  const offsetSec = Math.max(
    0,
    Math.round((eventTime - sessionStartMs) / 1000)
  );
  const minutes = Math.floor(offsetSec / 60);
  const seconds = offsetSec % 60;
  const relTime = `+${minutes}m ${String(seconds).padStart(2, "0")}s`;

  /* v8 ignore start -- display content parsing */
  const meta = event.metadata as Record<string, unknown> | null;
  const agentType = meta?.agent_type as string | undefined;
  const { text: displayText, kind } = getDisplayContent(event);

  // Simpler label: use tool_name or event_type
  const label = event.tool_name || event.event_type.replace("agent_", "");

  const colors = badgeColors[event.event_type] || {
    bg: "rgba(255, 255, 255, 0.08)",
    fg: "#888",
  };

  const kindStyles: Record<string, string> = {
    thinking:
      "text-[var(--color-text-secondary)] bg-[rgba(245,158,11,0.06)] border-l-2 border-[rgba(245,158,11,0.3)] pl-2",
    error: "text-red-400",
    permission: "text-yellow-500 italic",
    tool_call: "text-[var(--color-text-secondary)] font-mono",
    tool_output: "text-[var(--color-text-muted)] italic",
    text: "text-[var(--color-text-secondary)]",
    empty: "text-[#555]",
  };

  const contentClass = kindStyles[kind] || kindStyles.text;
  /* v8 ignore stop */

  return (
    <div
      className="grid grid-cols-[40px_80px_80px_1fr] gap-2 items-start px-4 py-2 rounded cursor-pointer text-[0.8rem] transition-colors duration-150 hover:bg-[rgba(255,255,255,0.04)]"
      onClick={onToggle}
    >
      <span className="font-mono text-[0.7rem] text-[var(--color-text-muted)] text-right">
        #{event.sequence}
      </span>
      <span
        className="font-mono text-[0.7rem] font-semibold px-2 py-px rounded text-center whitespace-nowrap overflow-hidden text-ellipsis"
        style={{ background: colors.bg, color: colors.fg }}
      >
        {label}
      </span>
      <span className="font-mono text-[0.7rem] text-[var(--color-text-muted)]">
        {relTime}
      </span>
      <div className="min-w-0">
        {/* v8 ignore next 5 -- agent type badge */}
        {agentType && (
          <span className="font-mono text-[0.65rem] text-[var(--color-text-muted)] bg-[rgba(255,255,255,0.05)] px-1.5 py-px rounded mr-2">
            {agentType}
          </span>
        )}
        {displayText ? (
          <span
            className={`text-[0.8rem] ${contentClass} ${
              isExpanded
                ? "whitespace-pre-wrap break-words"
                : "overflow-hidden text-ellipsis whitespace-nowrap inline-block max-w-full"
            }`}
          >
            {isExpanded
              ? displayText
              : displayText.slice(0, 150) +
                (displayText.length > 150 ? "..." : "")}
          </span>
        ) : (
          <span className="text-[0.8rem] text-[#555]">--</span>
        )}
      </div>
    </div>
  );
}
