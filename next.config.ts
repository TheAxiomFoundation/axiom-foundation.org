import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { hostname: "maxghenis.com" },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/proposal/:path*",
        destination:
          "https://nextladder-proposal-policy-engine.vercel.app/:path*",
      },
    ];
  },
};

export default nextConfig;
