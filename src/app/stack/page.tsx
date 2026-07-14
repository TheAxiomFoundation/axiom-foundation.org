import type { Metadata } from "next";
import { StackSystemPage } from "@/components/stack/stack-system-page";

// Round 1 pull-back — noindexed until the Jul 28 launch.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function StackPage() {
  return <StackSystemPage />;
}
