import { render } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { FocusScroll } from "./focus-scroll";

describe("FocusScroll", () => {
  beforeEach(() => {
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    });
    vi.stubGlobal("cancelAnimationFrame", () => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
  });

  it("scrolls the focused element into view on mount", () => {
    const el = document.createElement("section");
    el.id = "c";
    el.scrollIntoView = vi.fn();
    document.body.appendChild(el);

    render(<FocusScroll anchor="c" />);
    expect(el.scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "start",
    });
  });

  it("does nothing when the anchor does not exist", () => {
    expect(() => render(<FocusScroll anchor="missing" />)).not.toThrow();
  });

  it("renders no visible output", () => {
    const { container } = render(<FocusScroll anchor="missing" />);
    expect(container.firstChild).toBeNull();
  });
});
