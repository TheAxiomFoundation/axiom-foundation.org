import { NextResponse } from "next/server";
import { runtimeProxyGet } from "@/lib/axiom/runtime/api";

/** Live corpus census passthrough for the landing field and the
 *  viewer's subtree picker: every provision-rooted subtree the
 *  rulespec mirror serves (compositions excluded). Clients merge the
 *  committed snapshot for sizes and fall back to it entirely when
 *  this answers anything but ok. */
export async function GET() {
  const { status, body } = await runtimeProxyGet("/corpus/subtrees");
  return NextResponse.json(body, {
    status,
    headers: { "cache-control": "public, max-age=600" },
  });
}
