import { NextResponse } from "next/server";
import { runtimeProxyGet } from "@/lib/axiom/runtime/api";

const SLUG_RE = /^[a-z0-9-]{1,64}$/;

/** Program-graph passthrough for the in-app graph viewer. */
export async function GET(
  _request: Request,
  context: { params: Promise<{ jurisdiction: string; programId: string }> }
) {
  const { jurisdiction, programId } = await context.params;
  if (!SLUG_RE.test(jurisdiction) || !SLUG_RE.test(programId)) {
    return NextResponse.json(
      { status: "error", error: { code: "invalid_program" } },
      { status: 400 }
    );
  }
  const { status, body } = await runtimeProxyGet(
    `/runtime/packages/${encodeURIComponent(jurisdiction)}/${encodeURIComponent(
      programId
    )}/graph`
  );
  return NextResponse.json(body, {
    status,
    headers: { "cache-control": "public, max-age=300" },
  });
}
