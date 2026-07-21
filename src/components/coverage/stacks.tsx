import type { CoverageData } from "@/lib/axiom/coverage-page";

/**
 * "The stacks" — the corpus as a law library's shelving, one shelf
 * per document family plus the amber-gilt shelf of RuleSpec
 * encodings machines read. Isotype-style: every spine is a fixed
 * quantum of documents (stated under the case), spines run grouped
 * by jurisdiction in descending order, and hovering or focusing a
 * run names it. Server-rendered; all interaction is CSS.
 *
 * Spine hues are categorical identity, validated for CVD and
 * normal-vision separation against the dark case surface (#1c1917):
 * oxblood #C75B50 · periwinkle #7C83E0 · teal #2E9E85 · gilt #BD7A24.
 */

export interface ShelfGroup {
  slug: string;
  label: string;
  count: number;
  volumes: number;
  /** Corpus jurisdictions link into the app browse surface. */
  href: string | null;
}

export interface Shelf {
  key: string;
  name: string;
  /** What one unit on this shelf is, for labels ("documents", "files"). */
  unit: string;
  hue: string;
  hueLight: string;
  hueDark: string;
  total: number;
  jurisdictionCount: number;
  groups: ShelfGroup[];
}

const SHELF_HUES: Record<string, { hue: string; light: string; dark: string }> =
  {
    statute: { hue: "#C75B50", light: "#D97C70", dark: "#A94A41" },
    regulation: { hue: "#7C83E0", light: "#9BA1EA", dark: "#6068C9" },
    other: { hue: "#2E9E85", light: "#4FB89F", dark: "#25806C" },
    encoding: { hue: "#BD7A24", light: "#DA9A3E", dark: "#9A6119" },
  };

const QUANTUM_STEPS = [5, 10, 25, 50, 100, 200, 500];
const MAX_SPINES_PER_SHELF = 110;

/** Assemble shelves from the coverage data; picks the smallest
 *  quantum that keeps every shelf within its spine budget. */
export function buildShelves(data: CoverageData): {
  shelves: Shelf[];
  quantum: number;
} {
  const families: Array<{
    key: string;
    name: string;
    unit: string;
    countFor: (j: CoverageData["jurisdictions"][number]) => number;
  }> = [
    {
      key: "statute",
      name: "Statutes",
      unit: "documents",
      countFor: (j) => j.documents.statute ?? 0,
    },
    {
      key: "regulation",
      name: "Regulations",
      unit: "documents",
      countFor: (j) => j.documents.regulation ?? 0,
    },
    {
      key: "other",
      name: "Guidance & policy",
      unit: "documents",
      countFor: (j) =>
        Object.entries(j.documents)
          .filter(([type]) => type !== "statute" && type !== "regulation")
          .reduce((sum, [, count]) => sum + count, 0),
    },
    {
      key: "encoding",
      name: "RuleSpec encodings",
      unit: "files",
      countFor: (j) => j.encodingFileCount,
    },
  ];

  const raw = families.map((family) => {
    const groups = data.jurisdictions
      .map((j) => ({
        slug: j.slug,
        label: j.label,
        count: family.countFor(j),
        href: j.provisionCount > 0 ? `/${j.slug}` : null,
      }))
      .filter((g) => g.count > 0)
      .sort((a, b) => b.count - a.count || a.slug.localeCompare(b.slug));
    return { family, groups, total: groups.reduce((s, g) => s + g.count, 0) };
  });

  const quantum =
    QUANTUM_STEPS.find((q) =>
      raw.every(
        ({ groups }) =>
          groups.reduce((s, g) => s + Math.max(1, Math.round(g.count / q)), 0) <=
          MAX_SPINES_PER_SHELF
      )
    ) ?? QUANTUM_STEPS[QUANTUM_STEPS.length - 1];

  const shelves: Shelf[] = raw.map(({ family, groups, total }) => ({
    key: family.key,
    name: family.name,
    unit: family.unit,
    hue: SHELF_HUES[family.key].hue,
    hueLight: SHELF_HUES[family.key].light,
    hueDark: SHELF_HUES[family.key].dark,
    total,
    jurisdictionCount: groups.length,
    groups: groups.map((g) => ({
      ...g,
      volumes: Math.max(1, Math.round(g.count / quantum)),
    })),
  }));

  return { shelves, quantum };
}

/** Deterministic pseudo-jitter so the shelves read hand-packed but
 *  render identically on server and client. */
function jitter(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

const numberFormat = new Intl.NumberFormat("en-US");
const n = (value: number) => numberFormat.format(value);

function Spine({
  shelf,
  seed,
  gilt,
  delayMs,
}: {
  shelf: Shelf;
  seed: number;
  gilt: boolean;
  delayMs: number;
}) {
  const h = jitter(seed);
  const height = 40 + Math.floor(h * 5) * 5; // 40–60px
  const width = 7 + Math.floor(jitter(seed + 1) * 3) * 2; // 7–11px
  const tone = [shelf.hue, shelf.hueLight, shelf.hueDark][
    Math.floor(jitter(seed + 2) * 3)
  ];
  // One book in ~9 leans against its neighbors — the tell that these
  // are shelved volumes, not bars.
  const lean =
    jitter(seed + 3) > 0.89 ? (jitter(seed + 4) > 0.5 ? 4.5 : -4.5) : 0;
  return (
    <span
      aria-hidden
      className="stacks-spine"
      style={{
        height: `${height}px`,
        width: `${width}px`,
        background: `linear-gradient(90deg, ${tone} 0%, ${tone} 62%, rgba(0,0,0,0.28) 100%)`,
        animationDelay: `${delayMs}ms`,
        ...(lean ? { "--lean": `${lean}deg` } : {}),
        ...(gilt
          ? { boxShadow: "inset 0 3px 0 rgba(250, 227, 173, 0.85)" }
          : {}),
      } as React.CSSProperties}
    />
  );
}

function ShelfRow({ shelf, shelfIndex }: { shelf: Shelf; shelfIndex: number }) {
  let spineIndex = 0;
  return (
    <div className="stacks-shelf">
      <div className="stacks-shelf-label">
        <span
          className="stacks-shelf-swatch"
          style={{ background: shelf.hue }}
          aria-hidden
        />
        <span className="stacks-shelf-name">{shelf.name}</span>
        <span className="stacks-shelf-count">
          {n(shelf.total)} {shelf.unit} · {shelf.jurisdictionCount}{" "}
          {shelf.jurisdictionCount === 1 ? "jurisdiction" : "jurisdictions"}
        </span>
      </div>
      <div className="stacks-shelf-books">
        {shelf.groups.map((group) => {
          const spines = Array.from({ length: group.volumes }, (_, i) => {
            const seed = shelfIndex * 1000 + spineIndex * 7 + i;
            const delay = Math.min((spineIndex + i) * 9, 650);
            return (
              <Spine
                key={i}
                shelf={shelf}
                seed={seed}
                gilt={shelf.key === "encoding"}
                delayMs={delay + shelfIndex * 120}
              />
            );
          });
          spineIndex += group.volumes;
          const label = `${group.label} — ${n(group.count)} ${shelf.unit}`;
          const inner = (
            <>
              {spines}
              <span className="stacks-tooltip" role="tooltip">
                {label}
              </span>
            </>
          );
          return group.href ? (
            <a
              key={group.slug}
              href={group.href}
              className="stacks-run"
              aria-label={`${label}. Browse ${group.label}.`}
            >
              {inner}
            </a>
          ) : (
            <span
              key={group.slug}
              className="stacks-run"
              tabIndex={0}
              aria-label={label}
            >
              {inner}
            </span>
          );
        })}
      </div>
      <div className="stacks-board" aria-hidden />
    </div>
  );
}

export function Stacks({
  shelves,
  quantum,
  provisions,
  jurisdictions,
}: {
  shelves: Shelf[];
  quantum: number;
  provisions: number;
  jurisdictions: number;
}) {
  return (
    <figure className="stacks m-0">
      <div className="stacks-case">
        {shelves.map((shelf, i) => (
          <ShelfRow key={shelf.key} shelf={shelf} shelfIndex={i} />
        ))}
      </div>
      <figcaption className="stacks-colophon">
        <span>
          one spine ≈ {n(quantum)} {quantum === 1 ? "item" : "items"} · hover a
          run to name its jurisdiction
        </span>
        <span>
          together: {n(provisions)} provisions across {n(jurisdictions)}{" "}
          jurisdictions
        </span>
      </figcaption>
    </figure>
  );
}
