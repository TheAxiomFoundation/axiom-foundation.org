import type { Metadata } from "next";
import { AxiomSearch } from "@/components/axiom/axiom-search";

export const metadata: Metadata = {
  title: "Search — Axiom",
  description:
    "Search programs, encoded RuleSpecs, and source law across every Axiom jurisdiction.",
};

export default async function AxiomSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  return (
    <div className="relative z-1 py-24 px-8">
      <div className="max-w-[800px] mx-auto">
        <header className="mb-10">
          <h1 className="heading-page mb-4">Search Axiom</h1>
          <p className="font-body text-lg text-[var(--color-ink-secondary)] leading-relaxed">
            Programs, encoded rules, and source text in one ranked list. Try a
            program and topic (&ldquo;colorado snap deduction&rdquo;), a
            citation (&ldquo;7 CFR 273.9&rdquo;), or plain words.
          </p>
        </header>
        <AxiomSearch initialQuery={q} />
      </div>
    </div>
  );
}
