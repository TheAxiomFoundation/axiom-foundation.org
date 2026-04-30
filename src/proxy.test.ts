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

  it("passes through site /axiom paths", () => {
    const response = proxy(
      request("https://axiom-foundation.org/axiom/us/statute/7", "axiom-foundation.org")
    );

    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("bypasses framework and API paths on the app host", () => {
    const response = proxy(
      request("https://app.axiom-foundation.org/api/axiom", "app.axiom-foundation.org")
    );

    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("passes through regular site pages", () => {
    const response = proxy(request("https://axiom-foundation.org/about", "axiom-foundation.org"));

    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
});
