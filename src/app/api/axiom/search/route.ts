/* v8 ignore start -- thin Next route wrapper */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { searchAxiom } from "@/lib/axiom/search";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  const jurisdiction = cleanParam(request.nextUrl.searchParams.get("jurisdiction"));
  const docType = cleanParam(request.nextUrl.searchParams.get("docType"));
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "20");

  const results = await searchAxiom(q, {
    jurisdiction,
    docType,
    limit: Number.isFinite(limit) ? limit : undefined,
  });

  return NextResponse.json(results, {
    headers: { "cache-control": "public, max-age=60" },
  });
}

function cleanParam(value: string | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
/* v8 ignore stop */
