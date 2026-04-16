import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SNAP — Axiom Foundation",
  description:
    "Curated entry points to SNAP (Supplemental Nutrition Assistance Program) legal sources in Atlas: federal statute, federal regulations, and state implementations.",
};

type LinkItem = {
  href: string;
  label: string;
  sub?: string;
  external?: boolean;
};

const FEDERAL_STATUTE: LinkItem[] = [
  { href: "/atlas/us/statute/7/2011", label: "§ 2011", sub: "Congressional declaration of policy" },
  { href: "/atlas/us/statute/7/2012", label: "§ 2012", sub: "Definitions" },
  { href: "/atlas/us/statute/7/2013", label: "§ 2013", sub: "Establishment of SNAP" },
  { href: "/atlas/us/statute/7/2014", label: "§ 2014", sub: "Eligible households" },
  { href: "/atlas/us/statute/7/2015", label: "§ 2015", sub: "Eligibility disqualifications" },
  { href: "/atlas/us/statute/7/2016", label: "§ 2016", sub: "Issuance and use of program benefits" },
  { href: "/atlas/us/statute/7/2017", label: "§ 2017", sub: "Value of allotment" },
  { href: "/atlas/us/statute/7/2020", label: "§ 2020", sub: "Administration" },
  { href: "/atlas/us/statute/7/2025", label: "§ 2025", sub: "Administrative cost-sharing and quality control" },
  { href: "/atlas/us/statute/7/2026", label: "§ 2026", sub: "Research, demonstration, and evaluations" },
  { href: "/atlas/us/statute/7/2029", label: "§ 2029", sub: "Workfare" },
  { href: "/atlas/us/statute/7/2035", label: "§ 2035", sub: "Simplified SNAP" },
];

const FEDERAL_REG_PARTS: LinkItem[] = [
  { href: "/atlas/us/regulation/7/271", label: "Part 271", sub: "General information and definitions" },
  { href: "/atlas/us/regulation/7/272", label: "Part 272", sub: "Requirements for participating state agencies" },
  { href: "/atlas/us/regulation/7/273", label: "Part 273", sub: "Certification of eligible households" },
  { href: "/atlas/us/regulation/7/274", label: "Part 274", sub: "Issuance and use of program benefits" },
  { href: "/atlas/us/regulation/7/275", label: "Part 275", sub: "Performance reporting system" },
  { href: "/atlas/us/regulation/7/276", label: "Part 276", sub: "State agency liabilities and federal sanctions" },
  { href: "/atlas/us/regulation/7/277", label: "Part 277", sub: "Payments of administrative costs of state agencies" },
  { href: "/atlas/us/regulation/7/278", label: "Part 278", sub: "Participation of retail food stores, wholesale food concerns" },
  { href: "/atlas/us/regulation/7/279", label: "Part 279", sub: "Administrative and judicial review" },
  { href: "/atlas/us/regulation/7/281", label: "Part 281", sub: "Administration of SNAP on Indian reservations" },
  { href: "/atlas/us/regulation/7/282", label: "Part 282", sub: "Demonstration, research, and evaluation projects" },
  { href: "/atlas/us/regulation/7/283", label: "Part 283", sub: "Appeals" },
];

const CFR_273_KEY_SECTIONS: LinkItem[] = [
  { href: "/atlas/us/regulation/7/273/1", label: "§ 273.1", sub: "Household concept" },
  { href: "/atlas/us/regulation/7/273/2", label: "§ 273.2", sub: "Office operations and application processing" },
  { href: "/atlas/us/regulation/7/273/5", label: "§ 273.5", sub: "Students" },
  { href: "/atlas/us/regulation/7/273/7", label: "§ 273.7", sub: "Work provisions" },
  { href: "/atlas/us/regulation/7/273/8", label: "§ 273.8", sub: "Resource eligibility standards" },
  { href: "/atlas/us/regulation/7/273/9", label: "§ 273.9", sub: "Income and deductions" },
  { href: "/atlas/us/regulation/7/273/10", label: "§ 273.10", sub: "Determining eligibility and benefit levels" },
  { href: "/atlas/us/regulation/7/273/11", label: "§ 273.11", sub: "Households with special circumstances" },
  { href: "/atlas/us/regulation/7/273/12", label: "§ 273.12", sub: "Reporting requirements" },
];

const STATE_SOURCES: LinkItem[] = [
  {
    href: "https://www.hhs.texas.gov/handbooks/texas-works-handbook",
    label: "Texas Works Handbook",
    sub: "TX HHSC — policy manual used by SNAP eligibility staff",
    external: true,
  },
  {
    href: "https://www.ecfr.gov/current/title-7/chapter-II/subchapter-C",
    label: "7 CFR Subchapter C at eCFR",
    sub: "Point-in-time version browser",
    external: true,
  },
  {
    href: "https://fns-prod.azureedge.us/sites/default/files/resource-files/snap-302-bpg.pdf",
    label: "USDA FNS — SNAP State Options Report",
    sub: "Federal guidance on state flexibility",
    external: true,
  },
];

function LinkCard({ item }: { item: LinkItem }) {
  const inner = (
    <div className="h-full p-5 bg-[var(--color-paper-elevated)] border border-[var(--color-rule)] rounded-md transition-colors hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-light)]">
      <div className="flex items-start justify-between gap-2">
        <div className="font-mono text-sm text-[var(--color-accent)]">
          {item.label}
        </div>
        {item.external ? (
          <span className="font-mono text-xs text-[var(--color-ink-muted)]">
            ↗
          </span>
        ) : null}
      </div>
      {item.sub ? (
        <div className="mt-2 text-sm text-[var(--color-ink-secondary)] leading-snug">
          {item.sub}
        </div>
      ) : null}
    </div>
  );

  return item.external ? (
    <a
      href={item.href}
      target="_blank"
      rel="noopener noreferrer"
      className="block"
    >
      {inner}
    </a>
  ) : (
    <Link href={item.href} className="block">
      {inner}
    </Link>
  );
}

function Section({
  title,
  eyebrow,
  description,
  items,
}: {
  title: string;
  eyebrow: string;
  description: string;
  items: LinkItem[];
}) {
  return (
    <section className="mb-16">
      <div className="mb-6">
        <div className="font-mono text-xs uppercase tracking-wider text-[var(--color-ink-muted)] mb-2">
          {eyebrow}
        </div>
        <h2 className="heading-sub mb-2">{title}</h2>
        <p className="font-body text-[1rem] text-[var(--color-ink-secondary)] leading-relaxed max-w-[700px]">
          {description}
        </p>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3">
        {items.map((item) => (
          <LinkCard key={item.href} item={item} />
        ))}
      </div>
    </section>
  );
}

export default function SnapTopicPage() {
  return (
    <div className="relative z-1 pt-24 pb-16 px-8">
      <div className="max-w-[1100px] mx-auto">
        <nav
          aria-label="Breadcrumb"
          className="font-mono text-sm text-[var(--color-ink-muted)] mb-6"
        >
          <Link href="/" className="hover:text-[var(--color-accent)]">
            Axiom
          </Link>
          <span className="mx-2">/</span>
          <Link
            href="/topics"
            className="hover:text-[var(--color-accent)]"
          >
            Topics
          </Link>
          <span className="mx-2">/</span>
          <span className="text-[var(--color-ink)]">SNAP</span>
        </nav>

        <header className="mb-14">
          <h1 className="heading-page mb-4">
            Supplemental Nutrition Assistance Program
          </h1>
          <p className="font-body text-xl text-[var(--color-ink-secondary)] leading-relaxed max-w-[780px]">
            SNAP (formerly Food Stamps) is administered by the USDA Food and
            Nutrition Service and delivered by state agencies. The authoritative
            sources below are all reachable in Atlas. State-specific manuals
            that Atlas has not yet ingested link out to their official
            publishers.
          </p>
        </header>

        <Section
          eyebrow="Federal statute"
          title="7 USC Chapter 51 — Food and Nutrition Act of 2008"
          description="The statutory basis for SNAP. All 26 sections of Chapter 51 are in Atlas as full USLM-parsed statutes. Listed below are the sections most commonly referenced in eligibility and benefit logic."
          items={FEDERAL_STATUTE}
        />

        <Section
          eyebrow="Federal regulations"
          title="7 CFR Parts 271–283 — SNAP administration and eligibility"
          description="Regulations issued by USDA FNS under the Act. Part 273 (certification of eligible households) contains the eligibility, income, deduction, and benefit-level rules implemented by state agencies."
          items={FEDERAL_REG_PARTS}
        />

        <Section
          eyebrow="Key sections in 7 CFR 273"
          title="Eligibility and benefit levels"
          description="The sections that drive the day-to-day benefit calculation — who counts as a household, what income is counted, what deductions apply, and how the monthly allotment is determined."
          items={CFR_273_KEY_SECTIONS}
        />

        <Section
          eyebrow="State and guidance sources"
          title="State implementations and federal guidance"
          description="Each state administers SNAP under its own eligibility manual. These link to official publishers while Atlas builds parsers for state-level handbooks and federal guidance memos."
          items={STATE_SOURCES}
        />

        <section className="mt-16 pt-8 border-t border-[var(--color-rule)]">
          <div className="font-mono text-xs uppercase tracking-wider text-[var(--color-ink-muted)] mb-2">
            Coverage note
          </div>
          <p className="font-body text-sm text-[var(--color-ink-secondary)] leading-relaxed max-w-[780px]">
            Federal SNAP sources (statute and regulations) are ingested and
            navigable in Atlas. State manuals and USDA guidance memos are next
            on the ingestion roadmap; in the interim, this page links to
            official publishers. Effective date for the regulation snapshot:
            2024-04-16 (eCFR). Statute sources are refreshed from{" "}
            <a
              href="https://uscode.house.gov/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--color-accent)] hover:underline"
            >
              uscode.house.gov
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
