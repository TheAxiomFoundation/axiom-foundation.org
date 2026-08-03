"use client";

import { GuidedTour, type TourStep } from "./guided-tour";

/** Three beats, launcher-screen only: what this place is, how to find
 *  a provision, what opening one gets you. Deep links skip the
 *  launcher, so the tour simply waits for a visit that shows it. */
const PLANE_TOUR_STEPS: TourStep[] = [
  {
    title: "Welcome to the Plane",
    description:
      "Each entry here is a provision-rooted subtree: a provision and the interconnected rules encoded from it. Open one to explore its rule graph — which rules feed which — and run it.",
  },
  {
    element: '[data-testid="launcher-controls"]',
    title: "Find a provision",
    description:
      "Search every encoded provision here, or switch views: the Field is the open map of everything encoded, the List is a searchable index by jurisdiction.",
  },
  {
    title: "Open a law, then run it",
    description:
      "Inside a graph, click any node to inspect it and read the statute behind it. Set inputs on the left and “Run it all” computes a result traced back to the law.",
  },
];

/** Once per session, the first time a subgraph opens: the canvas is
 *  the navigation, the inspector walks it, the run toggle executes
 *  it, Overview is the way back. Inspector steps only appear when a
 *  node is inspected (compose focus opens one); the run toggle waits
 *  on the graph fetch and the tour waits with it. */
const SUBGRAPH_TOUR_STEPS: TourStep[] = [
  {
    title: "This is the law, as a graph",
    description:
      "Every node is a provision or a rule derived from one, wired the way the statute wires them. Click any node to explore it.",
  },
  {
    element: ".node-inspector .mini-graph",
    title: "Built from, used by",
    description:
      "The selected rule between what feeds it and what depends on it. These lists are navigation — click a neighbor to walk the graph.",
  },
  {
    element: '[data-testid="read-the-law"]',
    title: "Read the law",
    description:
      "Every rule traces to statute. This opens the section text at this exact node, without leaving the graph.",
    // The button sits at the bottom of the inspector's scrollbox —
    // reveal it there so driver doesn't scroll the whole document.
    prepare: () =>
      document
        .querySelector('[data-testid="read-the-law"]')
        ?.scrollIntoView({ block: "nearest" }),
  },
  {
    element: ".run-toggle",
    title: "Run a scenario",
    description:
      "Answer a household's questions and execute the law — unanswered inputs use the program's defaults, and results trace through the graph.",
  },
  {
    element: '[data-testid="back-to-overview"]',
    title: "Back to the overview",
    description:
      "Return to the field any time to pick another provision.",
  },
];

/**
 * The Plane's tours, staged by what's on screen: the launcher gets
 * the welcome tour (once per browser), an open subgraph gets its own
 * (once per session). One mount, so the replay "?" always replays
 * the tour for the view you're in.
 */
export function PlaneTour({ stage }: { stage: "launcher" | "subgraph" }) {
  return stage === "subgraph" ? (
    <GuidedTour surface="subgraph" steps={SUBGRAPH_TOUR_STEPS} />
  ) : (
    <GuidedTour surface="graph" steps={PLANE_TOUR_STEPS} />
  );
}
