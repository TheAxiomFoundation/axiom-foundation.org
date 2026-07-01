/* v8 ignore start -- thin Next route wrapper */
import { NextResponse } from "next/server";
import { getEncodingStatus } from "@/lib/corpus-status";

export const dynamic = "force-dynamic";

export async function GET() {
  const status = await getEncodingStatus({ fresh: true });
  return NextResponse.json(status, {
    headers: { "Cache-Control": "no-store" },
  });
}
/* v8 ignore stop */
