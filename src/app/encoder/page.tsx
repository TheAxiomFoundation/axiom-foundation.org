import type { Metadata } from "next";
import { EncoderSystemPage } from "@/components/encoder/encoder-system-page";

// Round 1 pull-back — noindexed until the Jul 28 launch.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function EncoderPage() {
  return <EncoderSystemPage />;
}
