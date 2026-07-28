"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import dynamic from "next/dynamic";
import { humanizeCitation } from "@/components/axiom/graph-viewer/citations";
import {
  BUCKET_COLORS,
  CLUSTER_LABEL_MIN_MODULES,
  FIELD_HEIGHT,
  FIELD_WIDTH,
  IDENTITY_TRANSFORM,
  buildFieldLayout,
  computeFieldHighlights,
  corpusFieldStats,
  fieldComposeHref,
  fieldStatLine,
  fieldToView,
  hitTestDot,
  interpolateTransform,
  panField,
  viewToField,
  zoomFieldAt,
  zoomTransformForDot,
  type CorpusModule,
  type CorpusSource,
  type FieldDot,
  type FieldTransform,
} from "@/lib/axiom/corpus-field";
import { loadCorpusModules } from "@/lib/axiom/corpus-live";

/**
 * The corpus field: an open world of every subgraph we serve. Every
 * provision-rooted subtree the live mirror lists renders as a dot on
 * one canvas (the committed snapshot supplies sizes, and IS the
 * corpus when the mirror is unreachable) — pan it, zoom it (wheel /
 * pinch / drag), hover any dot for its citation. Clicking a dot (or
 * a computed door) zooms the camera into its territory and then
 * mounts the compose viewer IN PLACE over the field, with the URL
 * pushed to the real compose deep link so reload and BACK stay
 * honest; BACK unmounts the viewer and the camera pulls back out.
 *
 * The snapshot (~590 KB) loads through a dynamic import so it ships
 * as its own cached chunk, never inline HTML.
 */

/** The compose viewer, loaded only when a subtree is opened. */
const ComposeViewer = dynamic(
  () =>
    import("@/components/axiom/graph-viewer/viewer-app").then(
      (mod) => mod.GraphViewerApp
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center">
        <p className="font-mono text-[11px] uppercase tracking-wider text-[var(--color-ink-muted)]">
          loading graph…
        </p>
      </div>
    ),
  }
);

const JURISDICTION_LABELS: Record<string, string> = {
  us: "US · Federal",
};

const ZOOM_IN_MS = 640;
const ZOOM_OUT_MS = 520;

function clusterLabel(jurisdiction: string): string {
  return (
    JURISDICTION_LABELS[jurisdiction] ??
    jurisdiction.toUpperCase().replace("US-", "US · ")
  );
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** The compose target in the current URL, when it points at the
 *  in-app compose viewer (a field pushState or a forward-nav). */
function composeTargetFromLocation(): string | null {
  if (typeof window === "undefined") return null;
  const url = new URL(window.location.href);
  if (!url.pathname.endsWith("/axiom/graph")) return null;
  return url.searchParams.get("compose");
}

export function CorpusField() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [modules, setModules] = useState<CorpusModule[] | null>(null);
  const [source, setSource] = useState<CorpusSource>("snapshot");
  const [hovered, setHovered] = useState<FieldDot | null>(null);
  // The camera. A ref mirrors the state so rAF animation frames and
  // native listeners never read a stale closure.
  const [transform, setTransform] = useState<FieldTransform>(
    IDENTITY_TRANSFORM
  );
  const transformRef = useRef(transform);
  transformRef.current = transform;
  const rafRef = useRef<number | null>(null);
  // Where the camera should pull back to when the viewer closes.
  const returnTransformRef = useRef<FieldTransform>(IDENTITY_TRANSFORM);
  // The compose viewer mounted in place over the field.
  const [openTarget, setOpenTarget] = useState<string | null>(null);
  const [overlayShown, setOverlayShown] = useState(false);
  // Drag state (also carries two-pointer pinch).
  const pointersRef = useRef(
    new Map<number, { x: number; y: number }>()
  );
  const dragStateRef = useRef<{ moved: boolean } | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Live mirror first, committed snapshot as ballast — the field is
    // never empty just because the API is down.
    loadCorpusModules().then(
      ({ modules: loaded, source: loadedSource }) => {
        if (cancelled) return;
        setModules(loaded);
        setSource(loadedSource);
      },
      () => {
        // Even the snapshot chunk failed — the landing page still
        // works (search + browse); the field just stays a quiet panel.
        if (!cancelled) setModules([]);
      }
    );
    return () => {
      cancelled = true;
    };
  }, []);

  // Doors are computed from the census — the largest / most intricate
  // subtrees, capped per jurisdiction — and labeled by citation.
  const highlightLabels = useMemo(() => {
    if (!modules) return null;
    return new Map(
      computeFieldHighlights(modules).map((module) => [
        module.target,
        humanizeCitation(module.target),
      ])
    );
  }, [modules]);
  const layout = useMemo(
    () =>
      modules
        ? buildFieldLayout(modules, highlightLabels ?? undefined)
        : null,
    [modules, highlightLabels]
  );
  const stats = useMemo(
    () => (modules ? corpusFieldStats(modules) : null),
    [modules]
  );

  const stopAnimation = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const animateTo = useCallback(
    (to: FieldTransform, ms: number, onDone?: () => void) => {
      stopAnimation();
      if (prefersReducedMotion() || ms <= 0) {
        setTransform(to);
        onDone?.();
        return;
      }
      const from = transformRef.current;
      const startedAt = performance.now();
      const step = (now: number) => {
        const raw = Math.min((now - startedAt) / ms, 1);
        // easeInOutCubic — the constellation's glide, not a linear rush.
        const eased =
          raw < 0.5
            ? 4 * raw * raw * raw
            : 1 - Math.pow(-2 * raw + 2, 3) / 2;
        setTransform(interpolateTransform(from, to, eased));
        if (raw < 1) {
          rafRef.current = requestAnimationFrame(step);
        } else {
          rafRef.current = null;
          onDone?.();
        }
      };
      rafRef.current = requestAnimationFrame(step);
    },
    [stopAnimation]
  );

  useEffect(() => stopAnimation, [stopAnimation]);

  // ── Canvas rendering (viewport-culled) ──
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !layout) return;
    const parent = canvas.parentElement;
    const cssWidth = parent?.clientWidth ?? 0;
    if (cssWidth <= 0) return;
    const cssHeight = (cssWidth * FIELD_HEIGHT) / FIELD_WIDTH;
    const dpr =
      typeof window !== "undefined" ? (window.devicePixelRatio ?? 1) : 1;
    const pxWidth = Math.round(cssWidth * dpr);
    const pxHeight = Math.round(cssHeight * dpr);
    if (canvas.width !== pxWidth) canvas.width = pxWidth;
    if (canvas.height !== pxHeight) canvas.height = pxHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return; // jsdom / very old browsers: overlay links still work
    const { k, tx, ty } = transform;
    const unit = (cssWidth / FIELD_WIDTH) * dpr;
    ctx.setTransform(unit, 0, 0, unit, 0, 0);
    ctx.clearRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);
    ctx.setTransform(unit * k, 0, 0, unit * k, unit * tx, unit * ty);

    // Visible field rect for culling (with a halo margin).
    const topLeft = viewToField(transform, 0, 0);
    const bottomRight = viewToField(transform, FIELD_WIDTH, FIELD_HEIGHT);

    // Cluster halos first — the faint territories the dots live in.
    for (const cluster of layout.clusters) {
      if (
        cluster.x + cluster.r < topLeft.x ||
        cluster.x - cluster.r > bottomRight.x ||
        cluster.y + cluster.r < topLeft.y ||
        cluster.y - cluster.r > bottomRight.y
      ) {
        continue;
      }
      ctx.beginPath();
      ctx.arc(cluster.x, cluster.y, cluster.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(120, 113, 108, 0.045)";
      ctx.fill();
      ctx.setLineDash([3, 4]);
      ctx.lineWidth = 0.6 / k;
      ctx.strokeStyle = "rgba(120, 113, 108, 0.22)";
      ctx.stroke();
      ctx.setLineDash([]);
    }

    const margin = 10;
    for (const dot of layout.dots) {
      if (
        dot.x + dot.r < topLeft.x - margin ||
        dot.x - dot.r > bottomRight.x + margin ||
        dot.y + dot.r < topLeft.y - margin ||
        dot.y - dot.r > bottomRight.y + margin
      ) {
        continue;
      }
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, dot.r, 0, Math.PI * 2);
      ctx.globalAlpha = dot.highlightLabel ? 0.95 : 0.72;
      ctx.fillStyle = dot.color;
      ctx.fill();
      ctx.globalAlpha = 1;
      if (dot.highlightLabel) {
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dot.r + 2.4 / k, 0, Math.PI * 2);
        ctx.lineWidth = 1.1 / k;
        ctx.strokeStyle = "#b45309";
        ctx.stroke();
      }
    }

    if (hovered) {
      ctx.beginPath();
      ctx.arc(hovered.x, hovered.y, hovered.r + 2 / k, 0, Math.PI * 2);
      ctx.lineWidth = 1.4 / k;
      ctx.strokeStyle = "#b45309";
      ctx.stroke();
    }
  }, [layout, hovered, transform]);

  useEffect(() => {
    draw();
    if (typeof window === "undefined") return;
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, [draw]);

  // ── Pointer → view coordinates (field units of the window) ──
  const viewPoint = useCallback(
    (event: { clientX: number; clientY: number }) => {
      const container = containerRef.current;
      if (!container) return null;
      const rect = container.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;
      return {
        x: ((event.clientX - rect.left) / rect.width) * FIELD_WIDTH,
        y: ((event.clientY - rect.top) / rect.height) * FIELD_HEIGHT,
      };
    },
    []
  );

  // Wheel zoom (trackpad pinch arrives as ctrl+wheel). Native
  // listener because it must preventDefault — page scroll and
  // browser-level pinch stay out of the field.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const onWheel = (event: WheelEvent) => {
      const point = viewPoint(event);
      if (!point) return;
      event.preventDefault();
      const factor = Math.exp(
        -event.deltaY * (event.ctrlKey ? 0.01 : 0.002)
      );
      stopAnimation();
      setTransform((current) =>
        zoomFieldAt(current, factor, point.x, point.y)
      );
    };
    container.addEventListener("wheel", onWheel, { passive: false });
    return () => container.removeEventListener("wheel", onWheel);
  }, [viewPoint, stopAnimation]);

  // Drag pan + two-pointer pinch.
  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const point = viewPoint(event);
      if (!point) return;
      pointersRef.current.set(event.pointerId, point);
      if (pointersRef.current.size === 1) {
        dragStateRef.current = { moved: false };
      }
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // jsdom / older engines: capture is an enhancement only.
      }
    },
    [viewPoint]
  );

  // Hover rides plain mouse moves (it must not fight the drag).
  const onMouseMove = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (!layout || pointersRef.current.size > 0) return;
      const point = viewPoint(event);
      if (!point) return;
      const field = viewToField(transformRef.current, point.x, point.y);
      setHovered(
        hitTestDot(
          layout.dots,
          field.x,
          field.y,
          4 / transformRef.current.k
        )
      );
    },
    [layout, viewPoint]
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const point = viewPoint(event);
      if (!point || !layout) return;
      const pointers = pointersRef.current;
      const previous = pointers.get(event.pointerId);
      if (!previous) return;
      if (pointers.size === 1) {
        const dx = point.x - previous.x;
        const dy = point.y - previous.y;
        if (Math.abs(dx) + Math.abs(dy) > 0) {
          if (dragStateRef.current) {
            dragStateRef.current.moved =
              dragStateRef.current.moved ||
              Math.hypot(dx, dy) > 3;
          }
          stopAnimation();
          setTransform((current) => panField(current, dx, dy));
        }
        pointers.set(event.pointerId, point);
        return;
      }
      // Pinch: two pointers — zoom by the distance ratio, anchored at
      // the midpoint; pan follows the midpoint drift.
      pointers.set(event.pointerId, point);
      const [a, b] = [...pointers.values()];
      if (!a || !b) return;
      const prevOther =
        [...pointers.entries()].find(
          ([id]) => id !== event.pointerId
        )?.[1] ?? previous;
      const prevDist = Math.hypot(
        previous.x - prevOther.x,
        previous.y - prevOther.y
      );
      const nextDist = Math.hypot(a.x - b.x, a.y - b.y);
      if (prevDist > 0 && nextDist > 0) {
        if (dragStateRef.current) dragStateRef.current.moved = true;
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        stopAnimation();
        setTransform((current) =>
          zoomFieldAt(current, nextDist / prevDist, mid.x, mid.y)
        );
      }
    },
    [viewPoint, layout, stopAnimation]
  );

  const onPointerUp = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      pointersRef.current.delete(event.pointerId);
    },
    []
  );

  // ── Zoom-in-and-enter ──
  const openCompose = useCallback((target: string) => {
    window.history.pushState(
      { corpusField: true },
      "",
      fieldComposeHref(target)
    );
    setOpenTarget(target);
  }, []);

  const enterDot = useCallback(
    (dot: FieldDot) => {
      if (!layout || openTarget) return;
      returnTransformRef.current = transformRef.current;
      const destination = zoomTransformForDot(layout, dot);
      animateTo(destination, ZOOM_IN_MS, () => openCompose(dot.target));
    },
    [layout, openTarget, animateTo, openCompose]
  );

  const onClick = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (!layout) return;
      if (dragStateRef.current?.moved) {
        // The pointer was panning, not choosing.
        dragStateRef.current = null;
        return;
      }
      dragStateRef.current = null;
      const point = viewPoint(event);
      if (!point) return;
      const field = viewToField(transformRef.current, point.x, point.y);
      const dot = hitTestDot(
        layout.dots,
        field.x,
        field.y,
        4 / transformRef.current.k
      );
      if (dot) enterDot(dot);
    },
    [layout, viewPoint, enterDot]
  );

  // ── History: honest URLs, honest BACK ──
  // Opening a subtree pushes the real compose deep link; BACK pops it,
  // the viewer unmounts, and the camera pulls back out to where the
  // reader was. FORWARD re-opens without ceremony.
  useEffect(() => {
    const onPopState = () => {
      const target = composeTargetFromLocation();
      if (target) {
        setOpenTarget(target);
      } else {
        setOpenTarget((current) => {
          if (current) {
            animateTo(returnTransformRef.current, ZOOM_OUT_MS);
          }
          return null;
        });
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [animateTo]);

  // The overlay fades in over the zoomed field; the page beneath
  // must not scroll while the viewer owns the screen.
  useEffect(() => {
    if (!openTarget) {
      setOverlayShown(false);
      return;
    }
    const raf = requestAnimationFrame(() => setOverlayShown(true));
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(raf);
      document.body.style.overflow = previousOverflow;
    };
  }, [openTarget]);

  const resetView = useCallback(() => {
    animateTo(IDENTITY_TRANSFORM, ZOOM_OUT_MS);
  }, [animateTo]);

  const isZoomed =
    transform.k !== 1 || transform.tx !== 0 || transform.ty !== 0;

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

  const inView = (x: number, y: number, margin: number) =>
    x > -margin &&
    x < FIELD_WIDTH + margin &&
    y > -margin &&
    y < FIELD_HEIGHT + margin;

  return (
    <div className="w-full">
      <div
        ref={containerRef}
        data-testid="corpus-field"
        data-dot-count={layout?.dots.length ?? 0}
        data-corpus-source={source}
        data-zoom={transform.k.toFixed(3)}
        data-tx={transform.tx.toFixed(1)}
        data-ty={transform.ty.toFixed(1)}
        className="relative w-full touch-none overflow-hidden rounded-md border border-[var(--color-rule)] bg-[var(--color-paper-elevated)] shadow-sm"
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
          aria-label="Map of the encoded legal corpus: every provision-rooted subtree, clustered by jurisdiction. Drag to pan, scroll to zoom, click a subtree to open its rule graph."
          className="absolute inset-0 h-full w-full"
          style={{
            cursor: hovered ? "pointer" : isZoomed ? "grab" : "default",
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onMouseMove={onMouseMove}
          onMouseLeave={() => setHovered(null)}
          onClick={onClick}
        />

        {/* Jurisdiction territory labels (pan/zoom with the field) */}
        {labeledClusters.map((cluster) => {
          const pos = fieldToView(
            transform,
            cluster.x,
            cluster.y + cluster.r
          );
          if (!inView(pos.x, pos.y, 60)) return null;
          return (
            <span
              key={cluster.jurisdiction}
              data-testid="corpus-field-cluster"
              className="pointer-events-none absolute -translate-x-1/2 font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--color-ink-muted)] sm:text-[10px]"
              style={{
                left: `${(pos.x / FIELD_WIDTH) * 100}%`,
                top: `${(pos.y / FIELD_HEIGHT) * 100}%`,
              }}
            >
              {clusterLabel(cluster.jurisdiction)}
            </span>
          );
        })}

        {/* The computed doors: the corpus's own largest subtrees */}
        {highlights.map((dot, index) => {
          const pos = fieldToView(transform, dot.x, dot.y);
          if (!inView(pos.x, pos.y, 40)) return null;
          return (
            <a
              key={dot.target}
              href={fieldComposeHref(dot.target)}
              data-testid="corpus-field-highlight"
              title={`${humanizeCitation(dot.target)} · ${dot.ruleCount} rules`}
              onClick={(event) => {
                // Zoom in, don't navigate away — plain left-click
                // enters in place; modified clicks keep link behavior.
                if (
                  event.metaKey ||
                  event.ctrlKey ||
                  event.shiftKey ||
                  event.altKey
                ) {
                  return;
                }
                event.preventDefault();
                enterDot(dot);
              }}
              // NOTE: centering lives in the inline transform only —
              // Tailwind's -translate-x-1/2 uses the separate
              // `translate` property and would compose (double-shift).
              className="absolute z-10 max-w-[240px] truncate rounded border border-[var(--color-accent)] bg-[var(--color-paper)] px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider text-[var(--color-ink)] no-underline shadow-sm hover:bg-[var(--color-accent-light)] sm:px-2 sm:py-1 sm:text-[10px]"
              style={{
                // Clamped so a door on a cluster's rim never bleeds
                // past the panel edge (the chip is centered on its dot).
                left: `clamp(130px, ${(pos.x / FIELD_WIDTH) * 100}%, calc(100% - 130px))`,
                top: `${(pos.y / FIELD_HEIGHT) * 100}%`,
                transform: `translate(-50%, ${index % 2 === 0 ? "-160%" : "70%"})`,
              }}
            >
              {dot.highlightLabel}
            </a>
          );
        })}

        {/* Hover tooltip: humanized citation + rule count */}
        {hovered &&
          (() => {
            const pos = fieldToView(transform, hovered.x, hovered.y);
            if (!inView(pos.x, pos.y, 20)) return null;
            return (
              <div
                role="tooltip"
                data-testid="corpus-field-tooltip"
                className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded border border-[var(--color-rule)] bg-[var(--color-paper)] px-2 py-1 shadow-md"
                style={{
                  left: `${(pos.x / FIELD_WIDTH) * 100}%`,
                  top: `${((pos.y - hovered.r * transform.k - 4) / FIELD_HEIGHT) * 100}%`,
                }}
              >
                <span className="block font-mono text-[11px] text-[var(--color-ink)]">
                  {humanizeCitation(hovered.target)}
                </span>
                <span className="block font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)]">
                  {hovered.ruleCount} rule
                  {hovered.ruleCount === 1 ? "" : "s"} · {hovered.bucket}
                </span>
              </div>
            );
          })()}

        {/* Overview reset — appears once the camera has moved */}
        {isZoomed && !openTarget && (
          <button
            type="button"
            data-testid="corpus-field-reset"
            onClick={resetView}
            className="absolute right-2 top-2 z-20 rounded border border-[var(--color-rule)] bg-[var(--color-paper)] px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-secondary)] shadow-sm transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
          >
            ⌂ whole corpus
          </button>
        )}
      </div>

      {/* Legend + the one honest stat line */}
      <div className="mt-3 flex flex-col items-center justify-between gap-2 sm:flex-row">
        <p
          data-testid="corpus-field-stats"
          className="font-mono text-[11px] uppercase tracking-wider text-[var(--color-ink-secondary)]"
        >
          {stats ? fieldStatLine(stats, source) : "counting the corpus…"}
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

      {/* The compose viewer, mounted in place over the zoomed field.
          The URL is already the real deep link (pushState above), so
          reload serves the standalone graph route and BACK returns
          here. z-index sits under the fixed site nav (z-100) so the
          overlay reads exactly like the standalone page. */}
      {openTarget && (
        <div
          data-testid="corpus-field-overlay"
          className="fixed inset-0 z-90 bg-[#f4f1ec] transition-opacity duration-300"
          style={{ opacity: overlayShown ? 1 : 0 }}
        >
          {/* No extra top padding: the viewer spaces itself below the
              fixed nav exactly like the standalone /axiom/graph page. */}
          <div className="h-full">
            <ComposeViewer key={openTarget} />
          </div>
        </div>
      )}
    </div>
  );
}
