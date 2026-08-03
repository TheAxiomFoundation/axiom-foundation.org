"use client";

import { GuidedTour, type TourStep } from "./guided-tour";

/** Four beats through the reading surface, in the order the eye
 *  meets them: where you are, how to move, what you can do, what the
 *  machine knows. Anchors that a given page lacks (no TOC below xl,
 *  no rail without encodings) drop out automatically. */
const READER_TOUR_STEPS: TourStep[] = [
  {
    element: 'nav[aria-label="Breadcrumb"]',
    title: "You are inside a citation",
    description:
      "The path mirrors the URL — every level is a link, from the jurisdiction down to this section.",
  },
  {
    element: '[data-testid="section-toc"]',
    title: "Move within the section",
    description:
      "The contents rail follows your scroll and jumps straight to any subsection.",
  },
  {
    element: '[data-testid="action-strip"]',
    title: "Do things with this law",
    description:
      "Open the section as an executable graph, build a calculator on it, or copy an exact citation.",
  },
  {
    element: '[data-testid="rail-header"]',
    title: "The encoding rail",
    description:
      "The machine-readable encodings behind this section, alongside everything it cites and everything that cites it.",
  },
];

export function ReaderTour() {
  return <GuidedTour surface="reader" steps={READER_TOUR_STEPS} />;
}
