import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { TreeNodeList } from "./tree-node-list";
import type { TreeNode } from "@/lib/tree-data";

vi.mock("@/lib/supabase", () => ({}));

function makeNode(overrides: Partial<TreeNode> = {}): TreeNode {
  return {
    segment: "us",
    label: "United States",
    hasChildren: true,
    childCount: 60000,
    nodeType: "jurisdiction",
    ...overrides,
  };
}

describe("TreeNodeList", () => {
  it("shows loading state", () => {
    render(
      <TreeNodeList
        nodes={[]}
        onNavigate={vi.fn()}
        loading={true}
        error={null}
      />
    );
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("shows error message", () => {
    render(
      <TreeNodeList
        nodes={[]}
        onNavigate={vi.fn()}
        loading={false}
        error="Connection failed"
      />
    );
    expect(screen.getByText("Connection failed")).toBeInTheDocument();
  });

  it("shows empty state", () => {
    render(
      <TreeNodeList
        nodes={[]}
        onNavigate={vi.fn()}
        loading={false}
        error={null}
      />
    );
    expect(screen.getByText("No items found.")).toBeInTheDocument();
  });

  it("renders node labels", () => {
    const nodes = [
      makeNode({ segment: "us", label: "United States" }),
      makeNode({ segment: "uk", label: "United Kingdom" }),
    ];
    render(
      <TreeNodeList
        nodes={nodes}
        onNavigate={vi.fn()}
        loading={false}
        error={null}
      />
    );
    expect(screen.getByText("United States")).toBeInTheDocument();
    expect(screen.getByText("United Kingdom")).toBeInTheDocument();
  });

  it("renders child count for nodes with childCount", () => {
    const nodes = [makeNode({ childCount: 1558 })];
    render(
      <TreeNodeList
        nodes={nodes}
        onNavigate={vi.fn()}
        loading={false}
        error={null}
      />
    );
    expect(screen.getByText("1,558")).toBeInTheDocument();
  });

  it("does not render count for nodes without childCount", () => {
    const nodes = [makeNode({ childCount: undefined })];
    render(
      <TreeNodeList
        nodes={nodes}
        onNavigate={vi.fn()}
        loading={false}
        error={null}
      />
    );
    // No count span should be rendered
    expect(screen.queryByText(/^\d/)).not.toBeInTheDocument();
  });

  it("calls onNavigate when node row is clicked", () => {
    const onNavigate = vi.fn();
    const node = makeNode();
    render(
      <TreeNodeList
        nodes={[node]}
        onNavigate={onNavigate}
        loading={false}
        error={null}
      />
    );
    fireEvent.click(screen.getByText("United States"));
    expect(onNavigate).toHaveBeenCalledWith(node);
  });

  it("shows ▸ for nodes with hasChildren=true", () => {
    const nodes = [makeNode({ hasChildren: true })];
    render(
      <TreeNodeList
        nodes={nodes}
        onNavigate={vi.fn()}
        loading={false}
        error={null}
      />
    );
    expect(screen.getByText("\u25B8")).toBeInTheDocument();
  });

  it("shows · for nodes with hasChildren=false", () => {
    const nodes = [makeNode({ hasChildren: false })];
    render(
      <TreeNodeList
        nodes={nodes}
        onNavigate={vi.fn()}
        loading={false}
        error={null}
      />
    );
    expect(screen.getByText("\u00B7")).toBeInTheDocument();
  });

  it("shows RAC badge for nodes with hasRac", () => {
    const nodes = [makeNode({ hasRac: true })];
    render(
      <TreeNodeList
        nodes={nodes}
        onNavigate={vi.fn()}
        loading={false}
        error={null}
      />
    );
    expect(screen.getByText("RAC")).toBeInTheDocument();
  });

  it("does not show RAC badge for nodes without hasRac", () => {
    const nodes = [makeNode({ hasRac: false })];
    render(
      <TreeNodeList
        nodes={nodes}
        onNavigate={vi.fn()}
        loading={false}
        error={null}
      />
    );
    expect(screen.queryByText("RAC")).not.toBeInTheDocument();
  });

  it("handles keyboard navigation with Enter", () => {
    const onNavigate = vi.fn();
    const node = makeNode();
    render(
      <TreeNodeList
        nodes={[node]}
        onNavigate={onNavigate}
        loading={false}
        error={null}
      />
    );
    const row = screen.getByRole("button");
    fireEvent.keyDown(row, { key: "Enter" });
    expect(onNavigate).toHaveBeenCalledWith(node);
  });

  it("handles keyboard navigation with Space", () => {
    const onNavigate = vi.fn();
    const node = makeNode();
    render(
      <TreeNodeList
        nodes={[node]}
        onNavigate={onNavigate}
        loading={false}
        error={null}
      />
    );
    const row = screen.getByRole("button");
    fireEvent.keyDown(row, { key: " " });
    expect(onNavigate).toHaveBeenCalledWith(node);
  });
});
