import type { Metadata } from "next";
import { EncodingScalePlanningPage } from "@/components/axiom/encoding-scale-planning-page";

export const metadata: Metadata = {
  title: "Encoding scale planning - Axiom Foundation",
  description:
    "Forward-looking encoding cost, capability, throughput, and cloud-scaling scenarios.",
  robots: { index: false, follow: false },
};

export default function PlanningPage() {
  return <EncodingScalePlanningPage />;
}
