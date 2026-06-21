import type { Metadata } from "next";
import { CorpusStatusPage } from "@/components/axiom/corpus-status-page";
import { getCorpusStatus } from "@/lib/corpus-status";
import { SITE_URL } from "@/lib/urls";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Operations Dashboard - Axiom Foundation",
  description:
    "Operational dashboard for Axiom corpus coverage, release validation, R2 artifacts, and Supabase indexing.",
  alternates: { canonical: `${SITE_URL}/ops` },
};

export default async function OpsPage() {
  const status = await getCorpusStatus();
  return <CorpusStatusPage status={status} />;
}
