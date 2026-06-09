import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { hostname: "maxghenis.com" },
    ],
  },
  // Mirrors the /proposal rewrites in vercel.json. Vercel's platform
  // rewrites serve production; this copy makes `next dev` proxy to the
  // same upstream instead of a different deployment.
  async rewrites() {
    return [
      {
        source: "/proposal",
        destination: "https://proposal.axiom-foundation.org/",
      },
      {
        source: "/proposal/:path*",
        destination: "https://proposal.axiom-foundation.org/:path*",
      },
    ];
  },
};

export default nextConfig;
