import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SDKSessionLogPage } from "@/components/encoding-runs/ops-log-detail-page";
import {
  getEncodingRunsBySession,
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
  const sessionId = decodeURIComponent(id);
  return {
    title: `${sessionId} - Encoder Session - Axiom Foundation`,
    description: "Detailed SDK session telemetry and agent event logs.",
    alternates: {
      canonical: `${SITE_URL}/ops/sessions/${encodeURIComponent(sessionId)}`,
    },
  };
}

export default async function SDKSessionPage({ params }: PageProps) {
  const { id } = await params;
  const sessionId = decodeURIComponent(id);
  const session = await getSDKSession(sessionId);
  if (!session) notFound();

  const [runs, events, transcripts] = await Promise.all([
    getEncodingRunsBySession(sessionId),
    getSDKSessionEvents(sessionId),
    getTranscriptsBySession(sessionId),
  ]);

  return (
    <SDKSessionLogPage
      session={session}
      runs={runs}
      events={events}
      transcripts={transcripts}
    />
  );
}
