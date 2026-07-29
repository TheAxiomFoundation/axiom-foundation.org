import { NextResponse } from "next/server";
import { readCertifiedNodes } from "@/lib/axiom/certification";

export async function GET() {
  const snapshot = await readCertifiedNodes();
  const available = snapshot.state === "ready";

  return NextResponse.json(snapshot, {
    status: available ? 200 : 503,
    headers: {
      "cache-control": available ? "public, max-age=300" : "no-store",
    },
  });
}
