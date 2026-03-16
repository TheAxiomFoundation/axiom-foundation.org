import type { Metadata } from "next";
import { JetBrains_Mono, Newsreader } from "next/font/google";
import { GeistSans } from "geist/font/sans";
import "./globals.css";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { GradientSync } from "@/components/gradient-sync";
import { PostHogProvider } from "@/components/posthog-provider";

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

const serif = Newsreader({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Axiom Foundation — The world's rules, encoded",
  description:
    "Machine-readable encodings of statutes, regulations, and policy rules. Ground truth for AI systems. Verifiable by design.",
  openGraph: {
    title: "Axiom Foundation",
    description: "The world's rules, encoded.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${mono.variable} ${GeistSans.variable} ${serif.variable}`}
    >
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body>
        <PostHogProvider />
        <GradientSync />
        <Nav />
        <main className="relative z-10">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
