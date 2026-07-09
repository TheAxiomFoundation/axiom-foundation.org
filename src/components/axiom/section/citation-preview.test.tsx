import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CitationPreviewLayer } from "./citation-preview";

const { getProvisionByCitationPathMock } = vi.hoisted(() => ({
  getProvisionByCitationPathMock: vi.fn(),
}));

vi.mock("@/lib/axiom/navigation-index/read", () => ({
  getProvisionByCitationPath: getProvisionByCitationPathMock,
}));

function addCiteLink(path: string): HTMLAnchorElement {
  const link = document.createElement("a");
  link.href = `/axiom/v2/${path}`;
  link.setAttribute("data-cite", path);
  link.textContent = path;
  document.body.appendChild(link);
  return link;
}

describe("CitationPreviewLayer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    getProvisionByCitationPathMock.mockReset().mockResolvedValue({
      heading: "Dependent defined",
      body: "For purposes of this subtitle, the term dependent means a qualifying child or a qualifying relative.",
      effective_date: "2026-01-01",
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  async function hoverAndShow(link: HTMLElement) {
    fireEvent.mouseOver(link);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300); // past SHOW_DELAY_MS + fetch
    });
  }

  it("shows a preview card with heading, snippet, and effective date on hover", async () => {
    render(<CitationPreviewLayer />);
    const link = addCiteLink("us/statute/26/152");
    await hoverAndShow(link);

    const card = screen.getByTestId("citation-preview");
    expect(card).toHaveTextContent("us/statute/26/152");
    expect(card).toHaveTextContent("Dependent defined");
    expect(card).toHaveTextContent(/qualifying child/);
    expect(card).toHaveTextContent("Effective 2026-01-01");
  });

  it("hides the card after the pointer leaves the link", async () => {
    render(<CitationPreviewLayer />);
    const link = addCiteLink("us/statute/26/152");
    await hoverAndShow(link);
    expect(screen.getByTestId("citation-preview")).toBeInTheDocument();

    fireEvent.mouseOut(link, { relatedTarget: document.body });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250); // past HIDE_GRACE_MS
    });
    expect(screen.queryByTestId("citation-preview")).not.toBeInTheDocument();
  });

  it("caches fetches per citation path", async () => {
    render(<CitationPreviewLayer />);
    const link = addCiteLink("us/statute/26/152");
    await hoverAndShow(link);
    fireEvent.mouseOut(link, { relatedTarget: document.body });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });
    await hoverAndShow(link);

    expect(getProvisionByCitationPathMock).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("citation-preview")).toBeInTheDocument();
  });

  it("shows nothing for links without data-cite or unfetchable targets", async () => {
    render(<CitationPreviewLayer />);
    const plain = document.createElement("a");
    plain.href = "/somewhere";
    plain.textContent = "plain";
    document.body.appendChild(plain);
    fireEvent.mouseOver(plain);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    expect(screen.queryByTestId("citation-preview")).not.toBeInTheDocument();

    getProvisionByCitationPathMock.mockResolvedValue(null);
    const missing = addCiteLink("us/statute/99/9999");
    fireEvent.mouseOver(missing);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    expect(screen.queryByTestId("citation-preview")).not.toBeInTheDocument();
  });

  it("survives fetch errors quietly", async () => {
    getProvisionByCitationPathMock.mockRejectedValue(new Error("down"));
    render(<CitationPreviewLayer />);
    const link = addCiteLink("us/statute/26/152");
    await hoverAndShow(link);
    expect(screen.queryByTestId("citation-preview")).not.toBeInTheDocument();
  });
});
