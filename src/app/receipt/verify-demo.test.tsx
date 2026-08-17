import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { VerifyDemo } from "./verify-demo";

describe("receipt verify demo", () => {
  it("opens on a passing clone with the real PASS shape", () => {
    render(<VerifyDemo />);
    expect(
      screen.getByText("ESTABLISHED OFFLINE, FROM THIS CLONE ALONE"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("VERDICT: PASS — custody and corpus binding"),
    ).toBeInTheDocument();
  });

  it("stops at the first failing pass, so later passes never appear", () => {
    render(<VerifyDemo />);
    fireEvent.click(screen.getByRole("button", { name: "swap the signing key" }));
    expect(screen.getByText(/\[FAIL\] custody/)).toBeInTheDocument();
    expect(screen.getByText(/not code-pinned/)).toBeInTheDocument();
    // binding and declarations did not run — the fail-closed order.
    expect(screen.queryByText(/\[ok {2}\] binding/)).not.toBeInTheDocument();
    expect(screen.queryByText(/declarations/)).not.toBeInTheDocument();
  });

  it("refuses a rewritten rule with both digests, tree vs journal", () => {
    render(<VerifyDemo />);
    fireEvent.click(screen.getByRole("button", { name: "rewrite a rule" }));
    expect(screen.getByText(/does not match its/)).toBeInTheDocument();
    expect(screen.getByText(/tree has e4075851568e/)).toBeInTheDocument();
    expect(screen.getByText(/binds e218ac6d2f12/)).toBeInTheDocument();
  });

  it("admits that wholesale regeneration passes on first contact", () => {
    render(<VerifyDemo />);
    fireEvent.click(
      screen.getByRole("button", { name: "regenerate everything" }),
    );
    expect(
      screen.getByText("VERDICT: PASS — custody and corpus binding"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/NOT prove the history was never rewritten/),
    ).toBeInTheDocument();
  });

  it("catches regeneration once the auditor supplies a base ref", () => {
    render(<VerifyDemo />);
    fireEvent.click(
      screen.getByRole("button", { name: "regenerate everything" }),
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "add --base-ref from the auditor's records",
      }),
    );
    expect(screen.getByText(/\[FAIL\] history/)).toBeInTheDocument();
    expect(
      screen.getByText(/bytes changed relative to 5b0d266:/),
    ).toBeInTheDocument();
  });

  it("refuses a dropped gate declaration by naming the required gate", () => {
    render(<VerifyDemo />);
    fireEvent.click(
      screen.getByRole("button", { name: "drop a gate declaration" }),
    );
    expect(screen.getByText(/\[FAIL\] declarations/)).toBeInTheDocument();
    expect(screen.getByText(/pinned spec requires:/)).toBeInTheDocument();
    expect(screen.getByText(/'rulespec\/compile'/)).toBeInTheDocument();
  });
});
