import type { CoverageData } from "@/lib/axiom/coverage-page";

/**
 * The coverage hero: Axiom's holdings as a platform stack — three
 * isometric layers descending from raw source documents through
 * atomic provisions to machine-readable RuleSpec encodings. Depth is
 * the pipeline; breadth (jurisdictions, document types) rides in
 * each layer's callout. Server-rendered; hover pairing is CSS
 * (:has()), so the page stays static.
 *
 * On narrow screens the isometric visual hides and the callouts
 * carry everything as plain metric rows.
 */

const numberFormat = new Intl.NumberFormat("en-US");
const n = (value: number) => numberFormat.format(value);

const DOC_TYPE_LABELS: Record<string, string> = {
  statute: "statutes",
  regulation: "regulations",
  policy: "policy docs",
  guidance: "guidance docs",
  manual: "manuals",
  form: "forms",
  "district-plan": "district plans",
};

function docTypeLabel(type: string): string {
  return DOC_TYPE_LABELS[type] ?? type.replace(/-/g, " ");
}

export function StackHero({ data }: { data: CoverageData }) {
  const corpusJurisdictions = data.jurisdictions.filter(
    (j) => j.provisionCount > 0
  ).length;
  const encodedJurisdictions = data.jurisdictions.filter(
    (j) => j.encodingFileCount > 0
  ).length;
  const topTypes = data.docTypeTotals.slice(0, 3);

  const layers = [
    {
      key: "documents",
      name: "Source documents",
      value: data.totals.documents,
      breadth: `${corpusJurisdictions} jurisdictions · ${data.docTypeTotals.length} document types`,
      detail: topTypes
        .map(({ type, count }) => `${n(count)} ${docTypeLabel(type)}`)
        .join(" · "),
    },
    {
      key: "provisions",
      name: "Provisions",
      value: data.totals.provisions,
      breadth: "every document, split into atomic citable sections",
      detail: "the unit the reader, search, and citation graph work on",
    },
    {
      key: "encodings",
      name: "RuleSpec encodings",
      value: data.totals.encodingFiles,
      breadth: `${encodedJurisdictions} jurisdictions encoded so far`,
      detail: "machine-readable rules, linked back to their source provisions",
    },
  ] as const;

  return (
    <div className="pstack">
      <div className="pstack-visual" aria-hidden>
        {layers.map((layer, i) => (
          <div
            key={layer.key}
            className={`pstack-plane pstack-plane-${layer.key}`}
            style={{ "--layer": i } as React.CSSProperties}
          />
        ))}
      </div>
      <ol className="pstack-callouts">
        {layers.map((layer, i) => (
          <li
            key={layer.key}
            className="pstack-callout"
            data-layer={layer.key}
            style={{ "--layer": i } as React.CSSProperties}
          >
            <span className={`pstack-key pstack-key-${layer.key}`} aria-hidden />
            <div className="pstack-callout-body">
              <span className="pstack-callout-name">{layer.name}</span>
              <span className="pstack-callout-value">
                {n(layer.value)}
                <span className="pstack-callout-breadth"> {layer.breadth}</span>
              </span>
              <span className="pstack-callout-detail">{layer.detail}</span>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
