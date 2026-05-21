import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EncodingRunLogPage } from "@/components/encoding-runs/ops-log-detail-page";
import {
  getEncodingRunById,
  getSDKSession,
  getSDKSessionEvents,
  getTranscriptsBySession,
} from "@/lib/supabase";
import { SITE_URL } from "@/lib/urls";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const run = await getEncodingRunById(decodeURIComponent(id));
  const title = run?.citation ?? decodeURIComponent(id);
  return {
    title: `${title} - Encoder Run - Axiom Foundation`,
    description: "Detailed encoder run metadata and agent event logs.",
    alternates: {
      canonical: `${SITE_URL}/ops/runs/${encodeURIComponent(decodeURIComponent(id))}`,
    },
  };
}

export default async function EncodingRunPage({ params }: PageProps) {
  const { id } = await params;
  const run = await getEncodingRunById(decodeURIComponent(id));
  if (!run) notFound();

  const [session, events, transcripts] = await Promise.all([
    run.session_id ? getSDKSession(run.session_id) : Promise.resolve(null),
    run.session_id ? getSDKSessionEvents(run.session_id) : Promise.resolve([]),
    run.session_id ? getTranscriptsBySession(run.session_id) : Promise.resolve([]),
  ]);

  return (
    <EncodingRunLogPage
      run={run}
      session={session}
      events={events}
      transcripts={transcripts}
    />
  );
}
