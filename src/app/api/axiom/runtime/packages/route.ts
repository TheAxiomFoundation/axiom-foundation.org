import { NextResponse } from "next/server";
import { runtimeProxyGet } from "@/lib/axiom/runtime/api";

/** Registry passthrough for the in-app graph viewer. */
export async function GET() {
  const { status, body } = await runtimeProxyGet("/runtime/packages");
  return NextResponse.json(body, {
    status,
    headers: { "cache-control": "public, max-age=300" },
  });
}
