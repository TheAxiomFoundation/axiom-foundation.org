import type { Metadata } from "next";
import { VerifyPage } from "@/components/verify/verify-page";

export const metadata: Metadata = {
  title: "Verify — Axiom Foundation",
  description:
    "US launch verification evidence, reproducible checks, repository closure, and open issues.",
};

export default function Page() {
  return <VerifyPage />;
}
