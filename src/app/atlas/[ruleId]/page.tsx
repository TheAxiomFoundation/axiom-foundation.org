import { supabaseArch } from "@/lib/supabase";
import { transformRuleToViewerDoc } from "@/lib/atlas-utils";
import { RulePageClient } from "./rule-page-client";
import Link from "next/link";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ruleId: string }>;
}): Promise<Metadata> {
  const { ruleId } = await params;

  try {
    const { data: rule } = await supabaseArch
      .from("rules")
      .select("heading, source_path")
      .eq("id", ruleId)
      .single();

    return {
      title: rule
        ? `${rule.heading || rule.source_path} — Atlas — Rules Foundation`
        : "Rule not found — Atlas — Rules Foundation",
    };
  } catch {
    return {
      title: "Rule not found — Atlas — Rules Foundation",
    };
  }
}

export default async function RulePage({
  params,
}: {
  params: Promise<{ ruleId: string }>;
}) {
  const { ruleId } = await params;

  try {
    const { data: rule, error: ruleError } = await supabaseArch
      .from("rules")
      .select("*")
      .eq("id", ruleId)
      .single();

    if (ruleError || !rule) {
      return (
        <div className="relative z-1 py-32 px-8 text-center">
          <p className="text-[var(--color-text-muted)] mb-4">
            Rule not found.
          </p>
          <Link href="/atlas" className="btn-outline">
            Back to Atlas
          </Link>
        </div>
      );
    }

    const { data: children } = await supabaseArch
      .from("rules")
      .select("*")
      .eq("parent_id", ruleId)
      .order("ordinal");

    const doc = transformRuleToViewerDoc(rule, children || []);

    return <RulePageClient document={doc} />;
  } catch {
    return (
      <div className="relative z-1 py-32 px-8 text-center">
        <p className="text-[var(--color-text-muted)] mb-4">
          Failed to load rule.
        </p>
        <Link href="/atlas" className="btn-outline">
          Back to Atlas
        </Link>
      </div>
    );
  }
}
