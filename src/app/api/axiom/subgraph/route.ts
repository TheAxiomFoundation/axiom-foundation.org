import { NextResponse } from "next/server";
import { runtimeProxyGet } from "@/lib/axiom/runtime/api";

/** Certified-subgraph passthrough: the certified closure of the
 *  comma-separated root ids in ?roots= (ProgramGraph-shaped). */
export async function GET(request: Request) {
  const roots = new URL(request.url).searchParams.get("roots")?.trim();
  if (!roots || roots.length > 2000) {
    return NextResponse.json(
      { status: "error", error: { code: "invalid_roots" } },
      { status: 400 }
    );
  }
  const { status, body } = await runtimeProxyGet(
    `/subgraph?roots=${encodeURIComponent(roots)}`
  );
  return NextResponse.json(body, {
    status,
    headers: { "cache-control": "public, max-age=300" },
  });
}
