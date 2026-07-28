import { NextResponse } from "next/server";
import { runtimeProxyGet } from "@/lib/axiom/runtime/api";

/** Certification-ledger passthrough: identity, vintage and entries,
 *  paginated by optional integer limit/offset. */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const query = new URLSearchParams();
  for (const name of ["limit", "offset"]) {
    const value = params.get(name);
    if (value === null) continue;
    if (!/^\d+$/.test(value)) {
      return NextResponse.json(
        { status: "error", error: { code: "invalid_pagination" } },
        { status: 400 }
      );
    }
    query.set(name, value);
  }
  const suffix = query.toString();
  const { status, body } = await runtimeProxyGet(
    `/certified${suffix ? `?${suffix}` : ""}`
  );
  return NextResponse.json(body, {
    status,
    headers: { "cache-control": "public, max-age=300" },
  });
}
