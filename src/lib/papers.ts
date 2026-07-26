/**
 * The papers index.
 *
 * Source lives in `papers/<slug>/`; `papers/render.py` publishes the HTML render
 * and the PDF into `public/papers/<slug>/`. Adding a paper means adding a Quarto
 * project and a row here — the routes are generated from this list.
 *
 * `preprintUrl` stays undefined until a preprint is actually live. An empty
 * field renders nothing; it never renders "coming soon".
 */

export interface Paper {
  slug: string;
  title: string;
  subtitle: string;
  /** Publication date, ISO. Displayed as the paper's date. */
  date: string;
  /** One paragraph, plain text — the gallery card and the page intro. */
  summary: string;
  /** What a reader gets that they would not get from the site. */
  contribution: string;
  status: "published" | "draft";
  preprintUrl?: string;
  /** Repos a reader can check the paper's claims against. */
  sources: { label: string; href: string }[];
}

export const papers: Paper[] = [
  {
    slug: "conformance",
    title: "Conformance without match rates",
    subtitle:
      "An auditable predicate for validating encoded tax and benefit law against reference implementations",
    date: "2026-07-28",
    summary:
      "Encodings of tax and benefit law are usually validated by comparing them against an existing microsimulation model and reporting an agreement rate. A rate counts a difference traced to a documented defect in the reference implementation the same as a difference nobody has explained. This paper replaces the rate with a predicate over classified evidence, and reports results for four jurisdiction-oracle pairs.",
    contribution:
      "Includes one comparison suite decomposed in full — 18,791 mismatches across 3.9 million comparisons resolving into four documented causes with no remainder — and one policy that sits at 42% raw agreement while being conformant.",
    status: "published",
    sources: [
      {
        label: "axiom-oracles",
        href: "https://github.com/TheAxiomFoundation/axiom-oracles",
      },
    ],
  },
];

export function getPaper(slug: string): Paper | undefined {
  return papers.find((paper) => paper.slug === slug);
}

export function paperWebPath(slug: string): string {
  return `/papers/${slug}/web/index.html`;
}

export function paperPdfPath(slug: string): string {
  return `/papers/${slug}/${slug}.pdf`;
}
