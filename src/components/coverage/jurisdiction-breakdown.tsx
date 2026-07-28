import type { JurisdictionCoverage } from "@/lib/axiom/coverage-page";

/**
 * The coverage listing: one row per jurisdiction with its full
 * breakdown — documents by type, provisions, encoding files.
 * Deliberately minimal: no sorting, no filtering, everything visible
 * at a glance.
 */

const numberFormat = new Intl.NumberFormat("en-US");
const n = (value: number) => numberFormat.format(value);

/** "225 statutes", "104 policies", "24 guidance" — naive plural:
 *  mass nouns exempt, -y → -ies, otherwise -s. */
const UNCOUNTABLE = new Set(["guidance"]);
function docTypeLabel(type: string, count: number): string {
  const label =
    count === 1 || UNCOUNTABLE.has(type) || type.endsWith("s")
      ? type
      : type.endsWith("y")
        ? `${type.slice(0, -1)}ies`
        : `${type}s`;
  return `${n(count)} ${label}`;
}

function docBreakdown(j: JurisdictionCoverage): string | null {
  if (j.documentTotal === 0) return null;
  const parts = Object.entries(j.documents)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => docTypeLabel(type, count));
  return `${n(j.documentTotal)} ${
    j.documentTotal === 1 ? "document" : "documents"
  } — ${parts.join(" · ")}`;
}

export function JurisdictionBreakdown({
  jurisdictions,
}: {
  jurisdictions: JurisdictionCoverage[];
}) {
  return (
    <>
      <ul className="cov-rows">
        {jurisdictions.map((j) => {
          const inCorpus = j.provisionCount > 0;
          const breakdown = docBreakdown(j);
          const inner = (
            <>
              <div className="cov-row-head">
                <span className="cov-row-name">{j.label}</span>
                <span className="cov-row-nums">
                  {inCorpus && (
                    <span className="cov-row-num">
                      {n(j.provisionCount)} provisions
                    </span>
                  )}
                  {j.encodingFileCount > 0 && (
                    <span className="cov-row-num cov-row-num-enc">
                      {n(j.encodingFileCount)} encodings
                    </span>
                  )}
                </span>
              </div>
              {(breakdown || !inCorpus) && (
                <p className="cov-row-docs">
                  {breakdown ?? "corpus ingestion pending"}
                </p>
              )}
            </>
          );
          return (
            <li key={j.slug}>
              {inCorpus ? (
                <a
                  href={`/${j.slug}`}
                  className="cov-row"
                  aria-label={`${j.label}: ${n(j.provisionCount)} provisions. Browse.`}
                >
                  {inner}
                </a>
              ) : (
                <span
                  className="cov-row cov-row-static"
                  aria-label={`${j.label}: ${n(j.encodingFileCount)} encoding files, corpus ingestion pending.`}
                >
                  {inner}
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <p className="cov-legend">
        amber counts are encodings ahead of corpus ingestion
      </p>
    </>
  );
}
