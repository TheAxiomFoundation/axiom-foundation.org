import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

interface VercelRedirect {
  source: string;
  destination: string;
  permanent?: boolean;
}

interface VercelRewrite {
  source: string;
  destination: string;
}

interface VercelConfig {
  redirects?: VercelRedirect[];
  rewrites?: VercelRewrite[];
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

// Demo zones served under axiom.org/<slug>. Each zone app is configured
// with a matching basePath/base, so the destination keeps the slug prefix.
const DEMO_ZONES: Record<string, string> = {
  demos: "axiom-demo-shell",
  chatbot: "finbot-snap-demo",
  "reg-demo": "axiom-reg-demo",
  builder: "dashboard-builder-flax",
  workflow: "co-snap-workflow-checker",
  snap: "axiom-co-snap",
  microsim: "axiom-microsim",
  guidance: "guidance-impact-visualizer",
  architecture: "axiom-architecture-one",
  "graph-viewer": "rulespec-graph-viewer",
  oracles: "axiom-oracles",
  bills: "axiom-bills",
};

describe("demo zone rewrites", () => {
  it.each(Object.entries(DEMO_ZONES))(
    "proxies /%s to its Vercel project",
    (slug, project) => {
      expect(config.rewrites).toEqual(
        expect.arrayContaining([
          {
            source: `/${slug}`,
            destination: `https://${project}.vercel.app/${slug}`,
          },
          {
            source: `/${slug}/:path*`,
            destination: `https://${project}.vercel.app/${slug}/:path*`,
          },
        ]),
      );
    },
  );

  it("never claims a two-letter jurisdiction path or an existing app route", () => {
    const reserved =
      /^\/(?:[a-z]{2}(?:-[a-z]{2})?|canada|axiom|graph|start|about|team|privacy|docs|format|stack|reports|preview|proposal|pbif-proposal)$/;
    for (const slug of Object.keys(DEMO_ZONES)) {
      expect(`/${slug}`).not.toMatch(reserved);
    }
  });
});
