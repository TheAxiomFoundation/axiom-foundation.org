import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { hostname: "maxghenis.com" },
    ],
  },
  async redirects() {
    return [
      {
        source: "/atlas/us/federal/:path*",
        destination: "/atlas/us/:path*",
        permanent: true,
      },
      {
        source: "/atlas/us/oh/:path*",
        destination: "/atlas/us-oh/:path*",
        permanent: true,
      },
    ];
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
