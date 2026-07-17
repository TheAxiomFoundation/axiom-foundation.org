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
      "https://app.axiom-foundation.org/axiom/us/statute/7"
    );
  });

  it("redirects site /axiom paths to the clean app subdomain URL", () => {
    const response = proxy(
      request("https://axiom.org/axiom/us/statute/7", "axiom.org")
    );

    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe(
      "https://app.axiom-foundation.org/us/statute/7"
    );
  });

  it("redirects site /axiom root to the clean app subdomain root", () => {
    const response = proxy(
      request("https://axiom.org/axiom", "axiom.org")
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
      "http://localhost:4944/axiom/us-co/statute"
    );
  });

  it("rewrites jurisdiction paths on 127.0.0.1 into the Axiom app route", () => {
    const response = proxy(
      request("http://127.0.0.1:4944/uk/legislation", "127.0.0.1:4944")
    );

    expect(response.headers.get("x-middleware-rewrite")).toBe(
      "http://localhost:4944/axiom/uk/legislation"
    );
  });

  it("rewrites jurisdiction paths on custom localhost names into the Axiom app route", () => {
    const response = proxy(
      request("http://app.localhost:4944/canada/regulation", "app.localhost:4944")
    );

    expect(response.headers.get("x-middleware-rewrite")).toBe(
      "http://app.localhost:4944/axiom/canada/regulation"
    );
  });

  it("leaves marketing paths on localhost alone", () => {
    const response = proxy(request("http://localhost:4944/about", "localhost:4944"));

    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("passes through regular site pages", () => {
    const response = proxy(request("https://axiom.org/about", "axiom.org"));

    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
});
