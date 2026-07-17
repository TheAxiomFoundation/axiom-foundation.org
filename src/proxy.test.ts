import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";

function request(url: string, host: string): NextRequest {
  return new NextRequest(url, { headers: { host } });
}

describe("proxy", () => {
  it("rewrites app host paths into the Axiom app route", () => {
    const response = proxy(
      request("https://app.axiom-foundation.org/us/statute/7", "app.axiom-foundation.org")
    );

    expect(response.headers.get("x-middleware-rewrite")).toBe(
      "https://app.axiom-foundation.org/axiom/v2/us/statute/7"
    );
  });

  it("routes every jurisdiction-rooted path to the v2 surface", () => {
    for (const [path, expected] of [
      ["/us/statute/26/164", "/axiom/v2/us/statute/26/164"],
      ["/us/statute/7/2017/a", "/axiom/v2/us/statute/7/2017/a"],
      ["/us-co/regulation/10-ccr-2506-1/4.207.3", "/axiom/v2/us-co/regulation/10-ccr-2506-1/4.207.3"],
      // Browse depths render the v2 list view.
      ["/us/statute/26", "/axiom/v2/us/statute/26"],
      ["/us/statute", "/axiom/v2/us/statute"],
      ["/us", "/axiom/v2/us"],
      ["/us/policy/usda/snap", "/axiom/v2/us/policy/usda/snap"],
    ] as const) {
      const response = proxy(
        request(
          `https://app.axiom-foundation.org${path}`,
          "app.axiom-foundation.org"
        )
      );
      expect(response.headers.get("x-middleware-rewrite")).toBe(
        `https://app.axiom-foundation.org${expected}`
      );
    }
  });

  it("applies the same v2 routing on localhost", () => {
    const response = proxy(
      request("http://localhost:3000/us/statute/26/164", "localhost")
    );
    expect(response.headers.get("x-middleware-rewrite")).toBe(
      "http://localhost:3000/axiom/v2/us/statute/26/164"
    );
  });

  it("redirects site /axiom paths to the clean app subdomain URL", () => {
    const response = proxy(
      request("https://axiom-foundation.org/axiom/us/statute/7", "axiom-foundation.org")
    );

    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe(
      "https://app.axiom-foundation.org/us/statute/7"
    );
  });

  it("redirects site /axiom root to the clean app subdomain root", () => {
    const response = proxy(
      request("https://axiom-foundation.org/axiom", "axiom-foundation.org")
    );

    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe(
      "https://app.axiom-foundation.org/"
    );
  });

  it("redirects explicit app host /axiom paths without double-prefixing", () => {
    const response = proxy(
      request("https://app.axiom-foundation.org/axiom/us/statute/7", "app.axiom-foundation.org")
    );

    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe(
      "https://app.axiom-foundation.org/us/statute/7"
    );
  });

  it("redirects explicit app host /axiom root without double-prefixing", () => {
    const response = proxy(
      request("https://app.axiom-foundation.org/axiom", "app.axiom-foundation.org")
    );

    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe(
      "https://app.axiom-foundation.org/"
    );
  });

  it("bypasses framework and API paths on the app host", () => {
    const response = proxy(
      request("https://app.axiom-foundation.org/api/axiom", "app.axiom-foundation.org")
    );

    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("bypasses static public assets on the app host", () => {
    const response = proxy(
      request("https://app.axiom-foundation.org/logos/axiom-foundation.svg", "app.axiom-foundation.org")
    );

    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("rewrites the app host root into the Axiom app root", () => {
    const response = proxy(
      request("https://app.axiom-foundation.org/", "app.axiom-foundation.org")
    );

    expect(response.headers.get("x-middleware-rewrite")).toBe(
      "https://app.axiom-foundation.org/axiom"
    );
  });

  it("rewrites the ops dashboard into the Axiom app route", () => {
    const response = proxy(
      request("https://app.axiom-foundation.org/ops", "app.axiom-foundation.org")
    );

    expect(response.headers.get("x-middleware-rewrite")).toBe(
      "https://app.axiom-foundation.org/axiom/ops"
    );
  });

  it("rewrites jurisdiction paths on localhost into the Axiom app route", () => {
    const response = proxy(
      request("http://localhost:4944/us-co/statute", "localhost:4944")
    );

    expect(response.headers.get("x-middleware-rewrite")).toBe(
      "http://localhost:4944/axiom/v2/us-co/statute"
    );
  });

  it("rewrites jurisdiction paths on 127.0.0.1 into the Axiom app route", () => {
    const response = proxy(
      request("http://127.0.0.1:4944/uk/legislation", "127.0.0.1:4944")
    );

    expect(response.headers.get("x-middleware-rewrite")).toBe(
      "http://localhost:4944/axiom/v2/uk/legislation"
    );
  });

  it("rewrites jurisdiction paths on custom localhost names into the Axiom app route", () => {
    const response = proxy(
      request("http://app.localhost:4944/canada/regulation", "app.localhost:4944")
    );

    expect(response.headers.get("x-middleware-rewrite")).toBe(
      "http://app.localhost:4944/axiom/v2/canada/regulation"
    );
  });

  it("leaves marketing paths on localhost alone", () => {
    const response = proxy(request("http://localhost:4944/about", "localhost:4944"));

    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("passes through regular site pages", () => {
    const response = proxy(request("https://axiom-foundation.org/about", "axiom-foundation.org"));

    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
});
