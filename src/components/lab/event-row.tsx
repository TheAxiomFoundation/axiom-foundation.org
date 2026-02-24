"use client";

import type { SDKSessionEvent } from "@/lib/supabase";

export type BadgeColors = Record<string, { bg: string; fg: string }>;

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
  const colors = badgeColors[event.event_type] || {
    bg: "rgba(255, 255, 255, 0.08)",
    fg: "#888",
  };
  const label = event.tool_name
    ? `${event.event_type}:${event.tool_name}`
    : event.event_type;
  const contentText = event.content || "";

  return (
    <div
      className="grid grid-cols-[40px_100px_120px_1fr] gap-2 items-start px-4 py-2 rounded cursor-pointer text-[0.8rem] transition-colors duration-150 hover:bg-[rgba(255,255,255,0.04)]"
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
      {contentText ? (
        <span
          className={
            isExpanded
              ? "text-[0.8rem] text-[var(--color-text-secondary)] whitespace-pre-wrap break-words"
              : "text-[0.8rem] text-[var(--color-text-secondary)] overflow-hidden text-ellipsis whitespace-nowrap"
          }
        >
          {isExpanded
            ? contentText
            : contentText.slice(0, 120) +
              (contentText.length > 120 ? "..." : "")}
        </span>
      ) : (
        <span className="text-[0.8rem] text-[#555]">--</span>
      )}
    </div>
  );
}
