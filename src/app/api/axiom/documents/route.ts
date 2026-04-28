/* v8 ignore start -- thin Next route wrapper */
import type { NextRequest } from "next/server";
import {
  axiomApiErrorResponse,
  axiomApiJson,
  axiomApiOptions,
  listAxiomDocuments,
  parseAxiomDocumentListOptions,
} from "@/lib/axiom-api";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return axiomApiOptions();
}

export async function GET(request: NextRequest) {
  try {
    const options = parseAxiomDocumentListOptions(request.nextUrl.searchParams);
    const result = await listAxiomDocuments(options);
    return axiomApiJson(result);
  } catch (error) {
    return axiomApiErrorResponse(error);
  }
}
/* v8 ignore stop */
