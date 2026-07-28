import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, back: vi.fn() }),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
    [k: string]: unknown;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { CorpusField } from "./corpus-field";
import {
  FIELD_HEIGHT,
  FIELD_HIGHLIGHTS,
  FIELD_WIDTH,
  buildFieldLayout,
} from "@/lib/axiom/corpus-field";
import corpusSubtrees from "@/lib/axiom/corpus-subtrees.json";

async function renderField() {
  const view = render(<CorpusField />);
  // The census loads through a dynamic import — wait for the field.
  await waitFor(() =>
    expect(
      screen.getByTestId("corpus-field").getAttribute("data-dot-count")
    ).not.toBe("0")
  );
  return view;
}

/** Point the canvas hit-testing math at a real dot: jsdom's zero-size
 *  rects are replaced with a rect matching the field's aspect. */
function stubCanvasRect() {
  const canvas = screen.getByRole("img") as HTMLCanvasElement;
  canvas.getBoundingClientRect = () =>
    ({
      left: 0,
      top: 0,
      width: FIELD_WIDTH,
      height: FIELD_HEIGHT,
      right: FIELD_WIDTH,
      bottom: FIELD_HEIGHT,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }) as DOMRect;
  return canvas;
}

describe("CorpusField", () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it("renders every subtree in the census as a field dot", async () => {
    await renderField();
    const field = screen.getByTestId("corpus-field");
    expect(Number(field.getAttribute("data-dot-count"))).toBe(
      corpusSubtrees.modules.length
    );
  });

  it("shows the six highlighted entry points as compose-viewer links", async () => {
    await renderField();
    const highlights = screen.getAllByTestId("corpus-field-highlight");
    expect(highlights).toHaveLength(FIELD_HIGHLIGHTS.length);
    const byLabel = new Map(
      highlights.map((el) => [el.textContent, el.getAttribute("href")])
    );
    expect(byLabel.get("Net income · 7 USC 2014(e)(6)")).toBe(
      `/axiom/graph?compose=${encodeURIComponent("us:statutes/7/2014/e/6/A")}`
    );
    expect(byLabel.get("SNAP allotment machinery")).toBe(
      `/axiom/graph?compose=${encodeURIComponent("us:regulations/7-cfr/273/10")}`
    );
  });

  it("labels the large jurisdiction clusters", async () => {
    await renderField();
    const labels = screen
      .getAllByTestId("corpus-field-cluster")
      .map((el) => el.textContent);
    expect(labels).toContain("US · Federal");
    expect(labels).toContain("US · CO");
    expect(labels.length).toBeGreaterThan(5);
  });

  it("computes the stat line from the census", async () => {
    await renderField();
    const line = screen.getByTestId("corpus-field-stats").textContent!;
    expect(line).toContain(
      corpusSubtrees.modules.length.toLocaleString("en-US")
    );
    expect(line).toContain("encoded rules");
    expect(line).toContain("every node cites its law");
  });

  it("shows a humanized tooltip on hover and navigates on click", async () => {
    await renderField();
    const canvas = stubCanvasRect();
    // A plain (non-highlight) dot from the real layout.
    const layout = buildFieldLayout(corpusSubtrees.modules);
    const dot = layout.dots.find((d) => !d.highlightLabel && d.ruleCount > 5)!;

    fireEvent.mouseMove(canvas, { clientX: dot.x, clientY: dot.y });
    const tooltip = await screen.findByTestId("corpus-field-tooltip");
    expect(tooltip.textContent).toContain(`${dot.ruleCount} rules`);
    expect(tooltip.textContent).toContain(dot.bucket);

    fireEvent.click(canvas, { clientX: dot.x, clientY: dot.y });
    expect(mockPush).toHaveBeenCalledWith(
      `/axiom/graph?compose=${encodeURIComponent(dot.target)}`
    );

    fireEvent.mouseLeave(canvas);
    expect(
      screen.queryByTestId("corpus-field-tooltip")
    ).not.toBeInTheDocument();
  });

  it("ignores pointer math when the canvas has no size (jsdom default)", async () => {
    await renderField();
    const canvas = screen.getByRole("img");
    fireEvent.click(canvas, { clientX: 10, clientY: 10 });
    expect(mockPush).not.toHaveBeenCalled();
  });
});
