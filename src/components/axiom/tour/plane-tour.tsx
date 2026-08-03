"use client";

import { GuidedTour, type TourStep } from "./guided-tour";

/** The subtree the launcher tour's closing CTA opens — the EITC
 *  (26 USC § 32), the corpus's most recognizable program. Opening it
 *  hands the visitor straight to the subgraph tour. */
export const TOUR_EXAMPLE_TARGET = "us:statutes/26/32";

/** Three beats, launcher-screen only: what this place is, how to find
 *  a provision, what opening one gets you. Deep links skip the
 *  launcher, so the tour simply waits for a visit that shows it. On
 *  the last step the field glides to the EITC and pins its label —
 *  presented, not opened — and the CTA does the opening. */
function launcherSteps(
  onOpenExample?: () => void,
  onSpotlightExample?: (on: boolean) => void
): TourStep[] {
  return [
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
      onEnter: onSpotlightExample
        ? () => onSpotlightExample(true)
        : undefined,
      // The camera centers the spotlighted subtree — sit below it,
      // not on it.
      popoverClass: onSpotlightExample ? "axiom-tour-below" : undefined,
      action: onOpenExample
        ? {
            label: "Open an example — the EITC →",
            onClick: onOpenExample,
          }
        : undefined,
    },
  ];
}

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
export function PlaneTour({
  stage,
  onOpenExample,
  onSpotlightExample,
}: {
  stage: "launcher" | "subgraph";
  /** Opens the example subtree (TOUR_EXAMPLE_TARGET) in compose
   *  mode — the launcher tour's closing CTA. Omit if the example
   *  isn't in the corpus. */
  onOpenExample?: () => void;
  /** Points the corpus field's camera at the example subtree (true)
   *  or releases it (false) — the closing step's presentation. */
  onSpotlightExample?: (on: boolean) => void;
}) {
  return stage === "subgraph" ? (
    <GuidedTour surface="subgraph" steps={SUBGRAPH_TOUR_STEPS} />
  ) : (
    <GuidedTour
      surface="graph"
      steps={launcherSteps(onOpenExample, onSpotlightExample)}
      onEnd={onSpotlightExample ? () => onSpotlightExample(false) : undefined}
    />
  );
}
