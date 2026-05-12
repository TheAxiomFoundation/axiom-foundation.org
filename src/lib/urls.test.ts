import { describe, expect, it } from "vitest";
import { axiomAppHref } from "./urls";

describe("axiomAppHref", () => {
  it("uses the in-site app route so preview deployments do not leave the preview", () => {
    expect(axiomAppHref()).toBe("/axiom");
    expect(axiomAppHref("us/statute/26/32")).toBe(
      "/axiom/us/statute/26/32"
    );
    expect(axiomAppHref("/us/statute/26/32")).toBe(
      "/axiom/us/statute/26/32"
    );
  });
});
