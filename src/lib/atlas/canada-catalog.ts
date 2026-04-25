/**
 * Curated index of every encoded Canadian rule that lives in the
 * ``rac-ca`` GitHub repo today. The Canadian rows in ``akn.rules``
 * cover a different (older) set of acts and don't intersect with the
 * encoded set, so the atlas's normal "browse by jurisdiction"
 * navigation wouldn't surface any of these — hence this curated
 * catalog. When the ingestion side starts pulling ITA/OAS/EI
 * sections into ``akn.rules``, those rows will replace these
 * static entries via the standard tree.
 *
 * Each entry knows its repo file path so the encoding can be
 * fetched from GitHub raw and shown inline.
 */

export interface CanadaCatalogEntry {
  /** URL slug relative to ``/atlas/canada/``. */
  slug: string;
  /** Group / act this rule belongs to, used as a header in the UI. */
  group: string;
  /** Short citation (``Income Tax Act § 122.5``). */
  citation: string;
  /** Plain-language title for the rule (e.g. "GST/HST credit"). */
  heading: string;
  /** One-line description for the catalog card. */
  summary: string;
  /** Path inside ``rac-ca`` (raw.githubusercontent.com prefix added at fetch time). */
  filePath: string;
  /** Authoritative source URL on laws-lois.justice.gc.ca. */
  sourceUrl: string;
}

export const CANADA_CATALOG: CanadaCatalogEntry[] = [
  {
    slug: "ita-122.5",
    group: "Income Tax Act",
    citation: "Income Tax Act § 122.5",
    heading: "GST/HST credit",
    summary:
      "Refundable credit for low- and modest-income individuals to offset GST/HST paid.",
    filePath: "statute/ITA/122.5/gst_hst_credit.cosilico",
    sourceUrl: "https://laws-lois.justice.gc.ca/eng/acts/I-3.3/section-122.5.html",
  },
  {
    slug: "ita-122.6",
    group: "Income Tax Act",
    citation: "Income Tax Act § 122.6",
    heading: "Definitions (Canada Child Benefit)",
    summary:
      "Definitions used throughout the CCB sections — eligible individual, qualified dependant, base taxation year.",
    filePath: "statute/ITA/122.6/definitions.cosilico",
    sourceUrl: "https://laws-lois.justice.gc.ca/eng/acts/I-3.3/section-122.6.html",
  },
  {
    slug: "ita-122.61",
    group: "Income Tax Act",
    citation: "Income Tax Act § 122.61",
    heading: "Canada Child Benefit",
    summary:
      "Tax-free monthly payment to help with the cost of raising children under 18.",
    filePath: "statute/ITA/122.61/ccb.cosilico",
    sourceUrl: "https://laws-lois.justice.gc.ca/eng/acts/I-3.3/section-122.61.html",
  },
  {
    slug: "ita-122.7",
    group: "Income Tax Act",
    citation: "Income Tax Act § 122.7",
    heading: "Canada Workers Benefit",
    summary:
      "Refundable tax credit supplementing the earnings of low-income workers.",
    filePath: "statute/ITA/122.7/cwb.cosilico",
    sourceUrl: "https://laws-lois.justice.gc.ca/eng/acts/I-3.3/section-122.7.html",
  },
  {
    slug: "ita-122.8",
    group: "Income Tax Act",
    citation: "Income Tax Act § 122.8",
    heading: "Climate Action Incentive Payment",
    summary:
      "Quarterly federal climate-action rebate paid to eligible residents of provinces using the federal pricing system.",
    filePath: "statute/ITA/122.8/caip.cosilico",
    sourceUrl: "https://laws-lois.justice.gc.ca/eng/acts/I-3.3/section-122.8.html",
  },
  {
    slug: "oas",
    group: "Old Age Security Act",
    citation: "Old Age Security Act",
    heading: "Old Age Security",
    summary:
      "Federal pension payable to most Canadians age 65 and over, with the Guaranteed Income Supplement and Allowance for low-income recipients.",
    filePath: "statute/OAS/oas.cosilico",
    sourceUrl: "https://laws-lois.justice.gc.ca/eng/acts/O-9/",
  },
  {
    slug: "ei",
    group: "Employment Insurance Act",
    citation: "Employment Insurance Act",
    heading: "Employment Insurance",
    summary:
      "Income support for workers who lose their job, plus regular, sickness, maternity, parental, and caregiving benefits.",
    filePath: "statute/EI/ei.cosilico",
    sourceUrl: "https://laws-lois.justice.gc.ca/eng/acts/E-5.6/",
  },
  {
    slug: "on-ontario-works",
    group: "Ontario provincial",
    citation: "Ontario Works Act, 1997",
    heading: "Ontario Works",
    summary:
      "Ontario's social assistance program — financial and employment assistance for people in temporary financial need.",
    filePath: "statute/provincial/ON/ow/ontario_works.cosilico",
    sourceUrl: "https://www.ontario.ca/laws/statute/97o25a",
  },
];

export function findCanadaCatalogEntry(
  slug: string
): CanadaCatalogEntry | null {
  return CANADA_CATALOG.find((e) => e.slug === slug) ?? null;
}

/**
 * Group catalog entries by ``group`` field so the catalog page can
 * render an "Income Tax Act → 5 sections" structure rather than a
 * flat list.
 */
export function groupedCanadaCatalog(): Array<{
  group: string;
  entries: CanadaCatalogEntry[];
}> {
  const buckets = new Map<string, CanadaCatalogEntry[]>();
  for (const entry of CANADA_CATALOG) {
    const arr = buckets.get(entry.group);
    if (arr) arr.push(entry);
    else buckets.set(entry.group, [entry]);
  }
  return Array.from(buckets.entries()).map(([group, entries]) => ({
    group,
    entries,
  }));
}

const RAW_GITHUB_BASE =
  "https://raw.githubusercontent.com/TheAxiomFoundation/rac-ca/main";

export function getCosilicoRawUrl(filePath: string): string {
  return `${RAW_GITHUB_BASE}/${filePath}`;
}

export function getCosilicoBlobUrl(filePath: string): string {
  return `https://github.com/TheAxiomFoundation/rac-ca/blob/main/${filePath}`;
}
