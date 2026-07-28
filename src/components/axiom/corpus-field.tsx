"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { humanizeCitation } from "@/components/axiom/graph-viewer/citations";
import {
  BUCKET_COLORS,
  CLUSTER_LABEL_MIN_MODULES,
  FIELD_HEIGHT,
  FIELD_WIDTH,
  buildFieldLayout,
  corpusFieldStats,
  fieldComposeHref,
  fieldStatLine,
  hitTestDot,
  type CorpusModule,
  type FieldDot,
} from "@/lib/axiom/corpus-field";

/**
 * The corpus field: the landing screen's opening image — every clean
 * provision-rooted subtree in the encoded corpus as one dot on a
 * canvas, clustered by jurisdiction, colored by bucket, sized by rule
 * count. Click any dot to open that subtree in the compose viewer;
 * the six highlighted doors are always-visible labeled links.
 *
 * The census (~590 KB) loads through a dynamic import so it ships as
 * its own cached chunk, never inline HTML.
 */

const JURISDICTION_LABELS: Record<string, string> = {
  us: "US · Federal",
};

function clusterLabel(jurisdiction: string): string {
  return (
    JURISDICTION_LABELS[jurisdiction] ??
    jurisdiction.toUpperCase().replace("US-", "US · ")
  );
}

export function CorpusField() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [modules, setModules] = useState<CorpusModule[] | null>(null);
  const [hovered, setHovered] = useState<FieldDot | null>(null);

  useEffect(() => {
    let cancelled = false;
    import("@/lib/axiom/corpus-subtrees.json").then(
      (mod) => {
        if (!cancelled) {
          setModules(
            (mod.default as { modules: CorpusModule[] }).modules
          );
        }
      },
      () => {
        // Census chunk failed to load — the landing page still works
        // (search + browse); the field just stays a quiet panel.
        if (!cancelled) setModules([]);
      }
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const layout = useMemo(
    () => (modules ? buildFieldLayout(modules) : null),
    [modules]
  );
  const stats = useMemo(
    () => (modules ? corpusFieldStats(modules) : null),
    [modules]
  );

  // ── Canvas rendering ──
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !layout) return;
    const parent = canvas.parentElement;
    const cssWidth = parent?.clientWidth ?? 0;
    if (cssWidth <= 0) return;
    const cssHeight = (cssWidth * FIELD_HEIGHT) / FIELD_WIDTH;
    const dpr =
      typeof window !== "undefined" ? (window.devicePixelRatio ?? 1) : 1;
    canvas.width = Math.round(cssWidth * dpr);
    canvas.height = Math.round(cssHeight * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return; // jsdom / very old browsers: overlay links still work
    const unit = (cssWidth / FIELD_WIDTH) * dpr;
    ctx.setTransform(unit, 0, 0, unit, 0, 0);
    ctx.clearRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);

    // Cluster halos first — the faint territories the dots live in.
    for (const cluster of layout.clusters) {
      ctx.beginPath();
      ctx.arc(cluster.x, cluster.y, cluster.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(120, 113, 108, 0.045)";
      ctx.fill();
      ctx.setLineDash([3, 4]);
      ctx.lineWidth = 0.6;
      ctx.strokeStyle = "rgba(120, 113, 108, 0.22)";
      ctx.stroke();
      ctx.setLineDash([]);
    }

    for (const dot of layout.dots) {
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, dot.r, 0, Math.PI * 2);
      ctx.globalAlpha = dot.highlightLabel ? 0.95 : 0.72;
      ctx.fillStyle = dot.color;
      ctx.fill();
      ctx.globalAlpha = 1;
      if (dot.highlightLabel) {
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dot.r + 2.4, 0, Math.PI * 2);
        ctx.lineWidth = 1.1;
        ctx.strokeStyle = "#b45309";
        ctx.stroke();
      }
    }

    if (hovered) {
      ctx.beginPath();
      ctx.arc(hovered.x, hovered.y, hovered.r + 2, 0, Math.PI * 2);
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = "#b45309";
      ctx.stroke();
    }
  }, [layout, hovered]);

  useEffect(() => {
    draw();
    if (typeof window === "undefined") return;
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, [draw]);

  // ── Pointer → field coordinates ──
  const fieldPoint = useCallback(
    (event: { clientX: number; clientY: number }) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;
      return {
        x: ((event.clientX - rect.left) / rect.width) * FIELD_WIDTH,
        y: ((event.clientY - rect.top) / rect.height) * FIELD_HEIGHT,
      };
    },
    []
  );

  const onMouseMove = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (!layout) return;
      const point = fieldPoint(event);
      if (!point) return;
      setHovered(hitTestDot(layout.dots, point.x, point.y, 4));
    },
    [layout, fieldPoint]
  );

  const onClick = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (!layout) return;
      const point = fieldPoint(event);
      if (!point) return;
      const dot = hitTestDot(layout.dots, point.x, point.y, 4);
      if (dot) router.push(fieldComposeHref(dot.target));
    },
    [layout, fieldPoint, router]
  );

  const highlights = useMemo(
    () => (layout ? layout.dots.filter((dot) => dot.highlightLabel) : []),
    [layout]
  );
  const labeledClusters = useMemo(
    () =>
      layout
        ? layout.clusters.filter(
            (cluster) => cluster.moduleCount >= CLUSTER_LABEL_MIN_MODULES
          )
        : [],
    [layout]
  );

  return (
    <div className="w-full">
      <div
        data-testid="corpus-field"
        data-dot-count={layout?.dots.length ?? 0}
        className="relative w-full overflow-hidden rounded-md border border-[var(--color-rule)] bg-[var(--color-paper-elevated)] shadow-sm"
        style={{ aspectRatio: `${FIELD_WIDTH} / ${FIELD_HEIGHT}` }}
      >
        {!layout && (
          <div className="absolute inset-0 flex items-center justify-center font-mono text-[11px] uppercase tracking-wider text-[var(--color-ink-muted)]">
            drawing the corpus…
          </div>
        )}
        <canvas
          ref={canvasRef}
          role="img"
          aria-label="Map of the encoded legal corpus: every provision-rooted subtree, clustered by jurisdiction"
          className="absolute inset-0 h-full w-full"
          style={{ cursor: hovered ? "pointer" : "default" }}
          onMouseMove={onMouseMove}
          onMouseLeave={() => setHovered(null)}
          onClick={onClick}
        />

        {/* Jurisdiction territory labels */}
        {labeledClusters.map((cluster) => (
          <span
            key={cluster.jurisdiction}
            data-testid="corpus-field-cluster"
            className="pointer-events-none absolute -translate-x-1/2 font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--color-ink-muted)] sm:text-[10px]"
            style={{
              left: `${(cluster.x / FIELD_WIDTH) * 100}%`,
              top: `${((cluster.y + cluster.r) / FIELD_HEIGHT) * 100}%`,
            }}
          >
            {clusterLabel(cluster.jurisdiction)}
          </span>
        ))}

        {/* The six doors: always-visible labeled entry points */}
        {highlights.map((dot, index) => (
          <Link
            key={dot.target}
            href={fieldComposeHref(dot.target)}
            data-testid="corpus-field-highlight"
            title={`${humanizeCitation(dot.target)} · ${dot.ruleCount} rules`}
            className="absolute z-10 -translate-x-1/2 whitespace-nowrap rounded border border-[var(--color-accent)] bg-[var(--color-paper)] px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider text-[var(--color-ink)] no-underline shadow-sm transition-transform hover:scale-105 hover:bg-[var(--color-accent-light)] sm:px-2 sm:py-1 sm:text-[10px]"
            style={{
              // Clamped so a door on a cluster's rim never bleeds
              // past the panel edge (the chip is centered on its dot).
              left: `clamp(90px, ${(dot.x / FIELD_WIDTH) * 100}%, calc(100% - 90px))`,
              top: `${(dot.y / FIELD_HEIGHT) * 100}%`,
              transform: `translate(-50%, ${index % 2 === 0 ? "-160%" : "70%"})`,
            }}
          >
            {dot.highlightLabel}
          </Link>
        ))}

        {/* Hover tooltip: humanized citation + rule count */}
        {hovered && !hovered.highlightLabel && (
          <div
            role="tooltip"
            data-testid="corpus-field-tooltip"
            className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded border border-[var(--color-rule)] bg-[var(--color-paper)] px-2 py-1 shadow-md"
            style={{
              left: `${(hovered.x / FIELD_WIDTH) * 100}%`,
              top: `${((hovered.y - hovered.r - 4) / FIELD_HEIGHT) * 100}%`,
            }}
          >
            <span className="block font-mono text-[11px] text-[var(--color-ink)]">
              {humanizeCitation(hovered.target)}
            </span>
            <span className="block font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)]">
              {hovered.ruleCount} rule{hovered.ruleCount === 1 ? "" : "s"} ·{" "}
              {hovered.bucket}
            </span>
          </div>
        )}
      </div>

      {/* Legend + the one honest stat line */}
      <div className="mt-3 flex flex-col items-center justify-between gap-2 sm:flex-row">
        <p
          data-testid="corpus-field-stats"
          className="font-mono text-[11px] uppercase tracking-wider text-[var(--color-ink-secondary)]"
        >
          {stats ? fieldStatLine(stats) : "counting the corpus…"}
        </p>
        <div className="flex items-center gap-4 font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)]">
          {(["statutes", "regulations", "policies"] as const).map((bucket) => (
            <span key={bucket} className="inline-flex items-center gap-1.5">
              <span
                aria-hidden
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: BUCKET_COLORS[bucket] }}
              />
              {bucket}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
