import { NextResponse } from "next/server";
import {
  getRuntimePackage,
  runCalculate,
  isRuntimeApiConfigured,
} from "@/lib/axiom/runtime/api";

export const dynamic = "force-dynamic";

const SLUG_RE = /^[a-z0-9-]{1,64}$/;

/**
 * Execute a package's canonical sample household — the first Run
 * surface (F2 slice 0). The browser sends only the program
 * coordinates; the sample request and the API key stay server-side.
 * A user-editable scenario endpoint comes later and will need input
 * validation this route deliberately avoids by not accepting
 * household payloads at all.
 */
export async function POST(request: Request) {
  if (!isRuntimeApiConfigured()) {
    return NextResponse.json(
      { error: "runtime_unconfigured" },
      { status: 503 }
    );
  }
  let body: { jurisdiction?: unknown; program_id?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const jurisdiction = body.jurisdiction;
  const programId = body.program_id;
  if (
    typeof jurisdiction !== "string" ||
    typeof programId !== "string" ||
    !SLUG_RE.test(jurisdiction) ||
    !SLUG_RE.test(programId)
  ) {
    return NextResponse.json({ error: "invalid_program" }, { status: 400 });
  }

  const detail = await getRuntimePackage(jurisdiction, programId);
  if (!detail?.sample_request) {
    return NextResponse.json({ error: "package_not_found" }, { status: 404 });
  }
  const result = await runCalculate(detail.sample_request);
  if (!result) {
    return NextResponse.json({ error: "calculate_failed" }, { status: 502 });
  }
  return NextResponse.json(
    {
      outputs: result.outputs,
      trace: result.trace ?? [],
      period: detail.default_period ?? null,
      sample: true,
    },
    { headers: { "cache-control": "no-store" } }
  );
}
