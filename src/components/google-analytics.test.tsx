import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const navState = vi.hoisted(() => ({
  pathname: "/axiom",
  searchParams: new URLSearchParams("q=snap"),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navState.pathname,
  useSearchParams: () => navState.searchParams,
}));

vi.mock("next/script", () => ({
  default: ({
    children,
    id,
    src,
  }: {
    children?: React.ReactNode;
    id?: string;
    src?: string;
  }) =>
    src ? (
      <script data-testid="ga-loader" src={src} />
    ) : (
      <script data-testid={id}>{children}</script>
    ),
}));

async function loadGoogleAnalytics() {
  vi.resetModules();
  return import("./google-analytics");
}

describe("GoogleAnalytics", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    delete window.gtag;
    delete window.dataLayer;
  });

  it("does not render when the measurement ID is missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "");
    const { GoogleAnalytics } = await loadGoogleAnalytics();

    const { container } = render(<GoogleAnalytics />);

    expect(container).toBeEmptyDOMElement();
  });

  it("loads gtag and sends page views for app router navigation", async () => {
    vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "G-TEST123");
    const gtag = vi.fn();
    window.gtag = gtag;
    const { GoogleAnalytics } = await loadGoogleAnalytics();

    render(<GoogleAnalytics />);

    expect(screen.getByTestId("ga-loader")).toHaveAttribute(
      "src",
      "https://www.googletagmanager.com/gtag/js?id=G-TEST123",
    );
    expect(screen.getByTestId("google-analytics-init").textContent).toContain(
      "G-TEST123",
    );
    await waitFor(() =>
      expect(gtag).toHaveBeenCalledWith("config", "G-TEST123", {
        page_path: "/axiom?q=snap",
      }),
    );
  });
});
