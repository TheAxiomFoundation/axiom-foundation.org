import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

interface VercelRedirect {
  source: string;
  destination: string;
  permanent?: boolean;
}

interface VercelConfig {
  redirects?: VercelRedirect[];
}

const config = JSON.parse(
  readFileSync(join(process.cwd(), "vercel.json"), "utf8"),
) as VercelConfig;

describe("vercel redirects", () => {
  it("keeps the PBIF proposal mounted on its dedicated subdomain", () => {
    expect(config.redirects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "/pbif-proposal",
          destination: "https://pbif-proposal.axiom-foundation.org/",
          permanent: false,
        }),
        expect.objectContaining({
          source: "/pbif-proposal/:path*",
          destination: "https://pbif-proposal.axiom-foundation.org/:path*",
          permanent: false,
        }),
      ]),
    );
  });
});
