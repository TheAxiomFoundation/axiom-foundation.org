import Link from "next/link";
import { notFound } from "next/navigation";
import { getRuleSpecRepoForJurisdiction } from "@/lib/axiom/repo-map";
import { fetchEncodedFile } from "@/lib/axiom/rulespec/repo-listing";
import { getJurisdictionLabel } from "@/lib/axiom-utils";
import type { RuleEncodingData } from "@/lib/supabase";
import { RuleSpecTab } from "@/components/axiom/rulespec-tab";

export const dynamic = "force-static";
export const revalidate = 600;

interface ViewerProps {
  params: Promise<{ path: string[] }>;
}

export default async function EncodedRuleViewerPage({ params }: ViewerProps) {
  const { path } = await params;
  const citationPath = path.join("/");
  const jurisdiction = path[0];
  const repo = getRuleSpecRepoForJurisdiction(jurisdiction);
  const fetched = await fetchEncodedFile(citationPath);
  if (!fetched || !repo) notFound();

  // Synthesise the same RuleEncodingData shape that the live rule-detail
  // panel constructs for GitHub-sourced encodings, so RuleSpecTab can
  // consume it without branching for this surface.
  const encoding: RuleEncodingData = {
    encoding_run_id: `github:${fetched.filePath}`,
    citation: citationPath,
    session_id: null,
    file_path: fetched.filePath,
    rulespec_content: fetched.content,
    final_scores: null,
    iterations: null,
    total_duration_ms: null,
    agent_type: null,
    agent_model: null,
    data_source: null,
    has_issues: null,
    note: null,
    timestamp: null,
    encoder_version: null,
  };

  return (
    <div className="px-8 py-10 max-w-[1100px] mx-auto">
      <nav className="text-xs mb-6">
        <Link
          href="/axiom/encoded"
          className="font-mono uppercase tracking-wider text-[var(--color-ink-muted)] no-underline hover:text-[var(--color-accent)]"
        >
          ← Encoded rules
        </Link>
      </nav>
      <header className="mb-8">
        <div className="eyebrow mb-3 flex items-center gap-3">
          <span>{getJurisdictionLabel(jurisdiction)}</span>
          <span aria-hidden="true">·</span>
          <span>{repo}</span>
        </div>
        <h1
          className="heading-section text-[var(--color-ink)] m-0 break-all"
          style={{ fontFamily: "var(--f-serif)" }}
        >
          {citationPath}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[var(--color-ink-secondary)]">
          Rendered from{" "}
          <code className="font-mono text-xs text-[var(--color-accent)]">
            {fetched.filePath}
          </code>{" "}
          in the canonical repo. The corpus database does not yet have a
          provision row for this citation, so the source-text panel is
          unavailable here — only the encoding view.
        </p>
      </header>
      <article>
        <RuleSpecTab
          encoding={encoding}
          loading={false}
          jurisdiction={jurisdiction}
        />
      </article>
    </div>
  );
}
