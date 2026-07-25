import type { Metadata } from "next";
import { VerifyPage } from "@/components/verify/verify-page";

export const metadata: Metadata = {
  title: "Verify — Axiom Foundation",
  description:
    "What each claim on this site is labelled, the command that tests it, and what the test does not cover.",
  // Round 1 pull-back — noindexed until the Jul 28 launch.
  robots: { index: false, follow: false },
};

export default function Page() {
  return <VerifyPage />;
}
