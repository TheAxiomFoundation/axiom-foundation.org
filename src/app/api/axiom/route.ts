/* v8 ignore start -- thin Next route wrapper */
import type { NextRequest } from "next/server";
import {
  axiomApiJson,
  axiomApiOptions,
  makeAxiomApiDiscovery,
} from "@/lib/axiom-api";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return axiomApiOptions();
}

export function GET(request: NextRequest) {
  return axiomApiJson(makeAxiomApiDiscovery(request.nextUrl.origin));
}
/* v8 ignore stop */
