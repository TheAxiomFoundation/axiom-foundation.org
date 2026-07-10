import type { Metadata } from "next";
import { JetBrains_Mono, Newsreader } from "next/font/google";
import { GeistSans } from "geist/font/sans";
import Link from "next/link";
import "./globals.css";
import { NavWrapper } from "@/components/nav-wrapper";
import { Footer, GradientSync } from "@axiom-foundation/ui";
import { GoogleAnalytics } from "@/components/google-analytics";
import { PostHogProvider } from "@/components/posthog-provider";
import { SITE_URL, axiomAppHref } from "@/lib/urls";

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
  metadataBase: new URL(SITE_URL),
  title: "Axiom Foundation — Computable law for all",
  description:
    "Open, machine-readable encodings of the world's rules, starting with tax and benefit policy. Cited, time-aware, and executable, so anyone can run, audit, or reform them.",
  openGraph: {
    title: "Axiom Foundation",
    // Round 1 tease — shares should carry the launch date. Update at launch.
    description:
      "Launching publicly July 28, 2026. Open, machine-readable encodings of the world's rules — starting with tax and benefit policy.",
    // TODO(⛳): design a proper launch OG card before Jul 13 — the icon is a
    // stopgap so shares don't 404 (og-image.png was never added to /public).
    images: ["/axiom-icon-1024.png"],
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
      data-scroll-behavior="smooth"
      className={`${mono.variable} ${GeistSans.variable} ${serif.variable}`}
    >
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body>
        <GoogleAnalytics />
        <PostHogProvider />
        <GradientSync />
        <NavWrapper />
        <main className="relative z-10">{children}</main>
        <Footer renderLink={Link} appUrl={axiomAppHref()} />
      </body>
    </html>
  );
}
