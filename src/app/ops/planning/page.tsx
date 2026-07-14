import type { Metadata } from "next";
import { PlanningModelPage } from "@/components/ops/planning-model-page";
import { SITE_URL } from "@/lib/urls";

export const metadata: Metadata = {
  title: "Compute planning model - Axiom Foundation",
  description:
    "Axiom's compute planning model: measured encoder token economics, coverage-tier demand, list-price cost translation, and development-fleet usage — every figure labeled measured, derived, or assumed.",
  // Unlisted: reachable by URL, not indexed and not linked from navigation.
  robots: { index: false, follow: false },
  alternates: { canonical: `${SITE_URL}/ops/planning` },
};

export default function OpsPlanningPage() {
  return <PlanningModelPage />;
}
