import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { VerifyDemo } from "./verify-demo";
import { RECEIPT_VERSION, TRANSCRIPTS } from "./verify-transcripts";

// These assert the *shape* of receipt's verdict, never a digest or an OID:
// the transcripts are regenerated against each release and every commit,
// tree, key and timestamp in them changes when they are. What must not change
// silently is which pass refuses which attack, that a run stops at the first
// failure, and that the demo's colouring still finds the lines it colours.
//
// A release that renames a pass or reshapes a refusal will fail here, which is
// the point: the page claims to print receipt's own words, so it should break
// loudly rather than keep showing the previous release's.

const attack = (name: string) =>
  fireEvent.click(screen.getByRole("button", { name }));

const pin = (action: string) =>
  fireEvent.click(screen.getByRole("button", { name: action }));

describe("receipt verify demo", () => {
  it("opens on the passing clone, with 0.6.0's header and verdict", () => {
    render(<VerifyDemo />);

    expect(
      screen.getByText("ESTABLISHED OFFLINE, FROM THIS CLONE ALONE"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("VERDICT: PASS — custody and corpus binding"),
    ).toBeInTheDocument();
    // 0.6.0's header names the subject of the verdict, not just the root.
    expect(screen.getByText(/^commit [0-9a-f]{40} \(tree [0-9a-f]{40}\)$/))
      .toBeInTheDocument();
    expect(screen.getByText("names portable")).toBeInTheDocument();
    expect(screen.getByText("objects not requested")).toBeInTheDocument();
    expect(screen.getByText(/^sha256 [0-9a-f]{64}$/)).toBeInTheDocument();
    expect(
      screen.getByText(`receipt ${RECEIPT_VERSION} — receipt test corpus`),
    ).toBeInTheDocument();
  });

  it("names all four passes in the singular receipt 0.6.0 uses", () => {
    render(<VerifyDemo />);

    expect(screen.getByText(/\[ok +\] custody/)).toBeInTheDocument();
    expect(screen.getByText(/\[ok +\] binding/)).toBeInTheDocument();
    expect(screen.getByText(/\[ok +\] declaration$/)).toBeInTheDocument();
    expect(screen.queryByText(/declarations/)).not.toBeInTheDocument();

    pin("add --base-ref from the auditor's records");
    pin("pin --expect-commit as well");
    expect(screen.getByText(/\[ok +\] history/)).toBeInTheDocument();
  });

  it("stops at the first failing pass, marking the rest not reached", () => {
    render(<VerifyDemo />);
    attack("swap the signing key");

    expect(screen.getByText(/\[FAIL\] custody/)).toBeInTheDocument();
    // Once beside the failing pass, once again under FAILED: — receipt
    // repeats the refusal rather than making the reader scroll back for it.
    expect(
      screen.getAllByText(
        /producer public-key SPKI is not code-pinned: [0-9a-f]{64}/,
      ),
    ).toHaveLength(2);
    // binding is reported unrun rather than passed, and declaration never
    // appears at all — the fail-closed order.
    expect(screen.getByText(/\[FAIL\] binding/)).toBeInTheDocument();
    expect(screen.getByText("not reached")).toBeInTheDocument();
    expect(
      screen.queryByText(/\[(ok +|FAIL)\] declaration/),
    ).not.toBeInTheDocument();
    expect(screen.getByText("VERDICT: FAIL — custody")).toBeInTheDocument();
  });

  it("refuses the hand edit with both digests, tree against journal", () => {
    render(<VerifyDemo />);
    attack("hand-edit the fix");

    expect(
      screen.getAllByText(
        /content file 'rules\/tax\/rate.yaml' does not match its witnessed digest: tree has [0-9a-f]{64}, journal binds [0-9a-f]{64}/,
      ),
    ).toHaveLength(2);
    // The refusal is repeated under its own heading before the verdict line.
    expect(screen.getByText("FAILED: binding")).toBeInTheDocument();
    expect(screen.getByText("VERDICT: FAIL — binding")).toBeInTheDocument();
  });

  it("passes the same correction when it arrives by re-encoding", () => {
    render(<VerifyDemo />);
    attack("re-encode the fix");

    expect(
      screen.getByText("VERDICT: PASS — custody and corpus binding"),
    ).toBeInTheDocument();
    expect(screen.getByText(/^3 release\(s\), HEAD 0002-/)).toBeInTheDocument();
  });

  it("admits that wholesale regeneration passes on first contact", () => {
    render(<VerifyDemo />);
    attack("regenerate everything");

    expect(
      screen.getByText("VERDICT: PASS — custody and corpus binding"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/It does NOT prove the history was never rewritten/),
    ).toBeInTheDocument();
  });

  it("refuses --base-ref until the revision under test is pinned too", () => {
    render(<VerifyDemo />);
    attack("regenerate everything");
    pin("add --base-ref from the auditor's records");

    expect(
      screen.getByText("receipt verify: --base-ref requires --expect-commit"),
    ).toBeInTheDocument();
    expect(screen.getByText(/^exit 2/)).toBeInTheDocument();
    expect(screen.queryByText(/VERDICT/)).not.toBeInTheDocument();
  });

  it("catches regeneration once the auditor pins both", () => {
    render(<VerifyDemo />);
    attack("regenerate everything");
    pin("add --base-ref from the auditor's records");
    pin("pin --expect-commit as well");

    expect(screen.getByText(/\[FAIL\] history/)).toBeInTheDocument();
    expect(
      screen.getAllByText(/release history is not immutable/),
    ).toHaveLength(2);
    expect(screen.getByText("VERDICT: FAIL — history")).toBeInTheDocument();
    // history runs before custody, so custody is the pass left unrun.
    expect(screen.getByText(/\[FAIL\] custody/)).toBeInTheDocument();
    expect(screen.getByText("not reached")).toBeInTheDocument();
  });

  it("refuses an undeclared gate by naming the gate the spec requires", () => {
    render(<VerifyDemo />);
    attack("drop a gate declaration");

    expect(screen.getByText(/\[ok +\] custody/)).toBeInTheDocument();
    expect(screen.getByText(/\[ok +\] binding/)).toBeInTheDocument();
    expect(screen.getByText(/\[FAIL\] declaration/)).toBeInTheDocument();
    expect(
      screen.getAllByText(
        /the witnessed journal does not declare a gate the pinned spec requires: 'rulespec\/compile'/,
      ),
    ).toHaveLength(2);
    expect(screen.getByText("VERDICT: FAIL — declaration")).toBeInTheDocument();
  });

  it("resets the auditor's pins when another attack is chosen", () => {
    render(<VerifyDemo />);
    pin("add --base-ref from the auditor's records");
    expect(screen.getByText(/^exit 2/)).toBeInTheDocument();

    attack("hand-edit the fix");
    expect(screen.getByText(/^exit 1/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "add --base-ref from the auditor's records",
      }),
    ).toBeInTheDocument();
  });

  it("shows the exact command each transcript was captured from", () => {
    render(<VerifyDemo />);
    const { command } = TRANSCRIPTS.pristine.none;

    expect(command.startsWith("receipt verify ")).toBe(true);
    expect(screen.getByText(`$ ${command}`)).toBeInTheDocument();
  });
});
