// Headless sanity for the corpus-field landing: the field renders the
// whole census as an open world — wheel-zoomable, pannable — with
// computed doors; clicking zooms into the subtree and mounts the
// compose viewer in place, and browser BACK returns to the field.
// Run with the dev server on :3742 (`PORT=3742 bun run dev`).
import puppeteer from "puppeteer-core";

const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
const page = await browser.newPage();
await page.setViewport({ width: 1500, height: 950 });
page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));
await page.goto("http://localhost:3742/axiom", {
  waitUntil: "networkidle2",
  timeout: 60000,
});

// 1) The field draws the whole census (dot count lives on the field
//    element; the dots themselves are canvas pixels).
await page.waitForFunction(
  () => {
    const field = document.querySelector('[data-testid="corpus-field"]');
    return field && Number(field.getAttribute("data-dot-count")) > 100;
  },
  { timeout: 60000 },
);
const dotCount = await page.evaluate(() =>
  Number(
    document
      .querySelector('[data-testid="corpus-field"]')
      ?.getAttribute("data-dot-count"),
  ),
);
console.log("field dots:", dotCount);

// 2) Aggregated jurisdiction clusters + the computed doors (the
//    census's own top-scored subtrees; must be ≥ 10).
const clusterCount = await page.evaluate(
  () => document.querySelectorAll('[data-testid="corpus-field-cluster"]').length,
);
const highlightCount = await page.evaluate(
  () =>
    document.querySelectorAll('[data-testid="corpus-field-highlight"]').length,
);
console.log("cluster labels:", clusterCount, "· computed doors:", highlightCount);
// Doors are linked-rule scored: the known non-compiling roots (and
// dust modules — unit-tested) must never be doors.
const badDoors = await page.evaluate(() => {
  const banned = ["42%2F1396a%2Fa%2F10", "42%2F415%2Fa", "42%2F415%2Fb", "42%2F415%2Fi"];
  return [
    ...document.querySelectorAll('[data-testid="corpus-field-highlight"]'),
  ].filter((el) =>
    banned.some((fragment) => (el.getAttribute("href") ?? "").endsWith(fragment)),
  ).length;
});
console.log("non-compiling roots offered as doors:", badDoors);
// Doors lead with the humanized headline rule — "… — citation".
const headlineDoors = await page.evaluate(
  () =>
    [...document.querySelectorAll('[data-testid="corpus-field-highlight"]')]
      .filter((el) => (el.textContent ?? "").includes(" — ")).length,
);
console.log("doors with headline names:", headlineDoors);

// 3) Presentation: no stat line, no bucket legend — the field is
//    the whole UI. Liveness reads from the data attribute instead.
const statAbsent = await page.evaluate(
  () => !document.querySelector('[data-testid="corpus-field-stats"]'),
);
const legendAbsent = await page.evaluate(
  () =>
    ![...document.querySelectorAll("span")].some((el) =>
      ["statutes", "regulations", "policies"].includes(
        el.textContent?.trim() ?? "",
      ),
    ),
);
const corpusSource = await page.evaluate(() =>
  document
    .querySelector('[data-testid="corpus-field"]')
    ?.getAttribute("data-corpus-source"),
);
console.log(
  "stat line absent:",
  statAbsent,
  "· legend absent:",
  legendAbsent,
  "· source:",
  corpusSource,
);

// 4) The search box (second entry path) is present above the field.
const hasSearch = await page.evaluate(() =>
  Boolean(document.querySelector("#axiom-hero-search")),
);
console.log("hero search present:", hasSearch);

// 5) Open world: wheel-zoom over the field changes the camera.
const fieldBox = await (await page.$('[data-testid="corpus-field"]')).boundingBox();
const zoomBefore = await page.evaluate(() =>
  Number(
    document
      .querySelector('[data-testid="corpus-field"]')
      ?.getAttribute("data-zoom"),
  ),
);
await page.mouse.move(
  fieldBox.x + fieldBox.width / 2,
  fieldBox.y + fieldBox.height / 2,
);
await page.mouse.wheel({ deltaY: -300 });
await new Promise((r) => setTimeout(r, 300));
const zoomAfterWheel = await page.evaluate(() =>
  Number(
    document
      .querySelector('[data-testid="corpus-field"]')
      ?.getAttribute("data-zoom"),
  ),
);
const lodMid = await page.evaluate(() =>
  document
    .querySelector('[data-testid="corpus-field"]')
    ?.getAttribute("data-lod"),
);
console.log("wheel zoom:", zoomBefore, "→", zoomAfterWheel, "· lod:", lodMid);

// 5a) LOD: pushing past the motif threshold turns dots into
//     miniature graph sketches (data-lod flips to "motif").
await page.mouse.wheel({ deltaY: -600 });
await new Promise((r) => setTimeout(r, 300));
const lodNear = await page.evaluate(() => ({
  lod: document
    .querySelector('[data-testid="corpus-field"]')
    ?.getAttribute("data-lod"),
  zoom: Number(
    document
      .querySelector('[data-testid="corpus-field"]')
      ?.getAttribute("data-zoom"),
  ),
  // TRUE structure edges drawn this frame (v4 census graphs).
  trueEdges: Number(
    document
      .querySelector('[data-testid="corpus-field"]')
      ?.getAttribute("data-true-edges-drawn") ?? 0,
  ),
}));
console.log(
  "near zoom:",
  lodNear.zoom,
  "· lod:",
  lodNear.lod,
  "· true edges drawn:",
  lodNear.trueEdges,
);

// 5b) Drag pans the camera.
const txBefore = await page.evaluate(() =>
  Number(
    document
      .querySelector('[data-testid="corpus-field"]')
      ?.getAttribute("data-tx"),
  ),
);
await page.mouse.move(fieldBox.x + 700, fieldBox.y + 300);
await page.mouse.down();
await page.mouse.move(fieldBox.x + 560, fieldBox.y + 260, { steps: 6 });
await page.mouse.up();
await new Promise((r) => setTimeout(r, 200));
const txAfterDrag = await page.evaluate(() =>
  Number(
    document
      .querySelector('[data-testid="corpus-field"]')
      ?.getAttribute("data-tx"),
  ),
);
console.log("drag pan tx:", txBefore, "→", txAfterDrag);

// Back to the overview so every door is on screen for the click.
await page.click('[data-testid="corpus-field-reset"]');
await page.waitForFunction(
  () =>
    Number(
      document
        .querySelector('[data-testid="corpus-field"]')
        ?.getAttribute("data-zoom"),
    ) === 1,
  { timeout: 10000 },
);

// 6) Click a door: the camera zooms in and the compose viewer mounts
//    in place, with the URL pushed to the real compose deep link.
const clickedHref = await page.evaluate(() => {
  const doors = [
    ...document.querySelectorAll('[data-testid="corpus-field-highlight"]'),
  ];
  const door = doors[0];
  if (!door) return null;
  const href = door.getAttribute("href");
  door.click();
  return href;
});
console.log("clicked door:", clickedHref);

await page.waitForFunction(
  () => window.location.search.includes("compose="),
  { timeout: 30000 },
);
const zoomAtEnter = await page.evaluate(() =>
  Number(
    document
      .querySelector('[data-testid="corpus-field"]')
      ?.getAttribute("data-zoom"),
  ),
);
await page.waitForSelector(".graph-viewer-root", { timeout: 60000 });
const composeUrl = await page.evaluate(() => window.location.href);
console.log("compose viewer mounted in place:", composeUrl);
console.log("camera zoom at enter:", zoomAtEnter);

// 7) Run-by-root state (informational): the run affordance only
//    appears in compose mode when the API answers the root shape.
await new Promise((r) => setTimeout(r, 5000));
const runToggle = await page.evaluate(() =>
  Boolean(document.querySelector(".run-toggle")),
);
console.log(
  "compose run affordance:",
  runToggle ? "LIVE (root calculate supported)" : "feature-detected off",
);

// 8) Browser BACK returns to the field (viewer unmounts, camera
//    pulls back out).
await page.goBack();
await page.waitForFunction(
  () =>
    !document.querySelector(".graph-viewer-root") &&
    Boolean(document.querySelector('[data-testid="corpus-field"]')),
  { timeout: 30000 },
);
const backUrl = await page.evaluate(() => window.location.pathname);
await page.waitForFunction(
  () =>
    Number(
      document
        .querySelector('[data-testid="corpus-field"]')
        ?.getAttribute("data-zoom"),
    ) === 1,
  { timeout: 10000 },
);
console.log("BACK returned to the field at:", backUrl, "(camera zoomed out)");

// 9) The field mirrors the corpus, live, US-only, one-node-filtered:
//    with :8787 up the count sits above the filtered snapshot (2,892)
//    and well below the unfiltered census (4,392).
const liveField =
  corpusSource === "live" && dotCount > 2892 && dotCount < 4392;
console.log(
  "live mirror (US-only, one-node-filtered):",
  liveField ? `yes (${dotCount} subtrees)` : `NO (${dotCount})`,
);
const landingNonUsClusters = await page.evaluate(() =>
  [...document.querySelectorAll('[data-testid="corpus-field-cluster"]')]
    .map((el) => el.textContent ?? "")
    .filter((label) => !/^US/.test(label)),
);
console.log("landing non-US clusters:", JSON.stringify(landingNonUsClusters));

// 10) The launcher: its first view IS the field. Cold /axiom/graph
//     opens on the embedded open-world corpus field (US-only stat),
//     with the list picker one toggle away — no program cards ever.
const picker = await browser.newPage();
picker.on("pageerror", (e) => console.log("PICKER PAGE ERROR:", e.message));
await picker.setViewport({ width: 1500, height: 950 });
await picker.goto("http://localhost:3742/axiom/graph", {
  waitUntil: "networkidle2",
  timeout: 60000,
});
await picker.waitForSelector('[data-testid="launcher-field"]', {
  timeout: 60000,
});
await picker.waitForFunction(
  () => {
    const field = document.querySelector(
      '[data-testid="launcher-field"] [data-testid="corpus-field"]',
    );
    return field && Number(field.getAttribute("data-dot-count")) > 100;
  },
  { timeout: 60000 },
);
const launcherFieldState = await picker.evaluate(() => {
  const canvas = document.querySelector(
    '[data-testid="launcher-field"] canvas',
  );
  const rect = canvas?.getBoundingClientRect();
  const controls = document
    .querySelector('[data-testid="launcher-controls"]')
    ?.getBoundingClientRect();
  return {
    dotCount: Number(
      document
        .querySelector(
          '[data-testid="launcher-field"] [data-testid="corpus-field"]',
        )
        ?.getAttribute("data-dot-count"),
    ),
    source: document
      .querySelector('[data-testid="launcher-field"] [data-testid="corpus-field"]')
      ?.getAttribute("data-corpus-source"),
    statAbsent: !document.querySelector('[data-testid="corpus-field-stats"]'),
    // Full-bleed: the field canvas covers ≥ ~80% of the viewport.
    canvasViewportShare: rect
      ? (rect.width * rect.height) / (window.innerWidth * window.innerHeight)
      : 0,
    // The control cluster floats top-right over the field.
    controlsTopRight: Boolean(
      controls &&
        controls.top < 160 &&
        controls.right > window.innerWidth * 0.7,
    ),
    nonUsClusters: [
      ...document.querySelectorAll(
        '[data-testid="launcher-field"] [data-testid="corpus-field-cluster"]',
      ),
    ]
      .map((el) => el.textContent ?? "")
      .filter((label) => !/^US/.test(label)),
    searchPresent: Boolean(
      document.querySelector('[data-testid="picker-search"]'),
    ),
    programCards: document.querySelectorAll(
      ".plane-launcher-card, .plane-launcher-grid, .constellation, .constellation-summit",
    ).length,
    copyGone: !document.querySelector(
      ".plane-launcher-title, .plane-launcher-sub",
    ),
    fieldChipActive:
      document
        .querySelector('[data-testid="launcher-mode-field"]')
        ?.getAttribute("aria-selected") === "true",
  };
});
console.log("launcher field:", JSON.stringify(launcherFieldState));

// One-node subtrees are gone from every surface: searching for a
// known single-rule module finds nothing.
await picker.type(
  '[data-testid="picker-search"]',
  "chapter-02-application-processing/211",
);
await picker.waitForSelector(".picker-empty", { timeout: 15000 });
const oneNodeAbsent = await picker.evaluate(
  () => document.querySelectorAll('[data-testid="picker-result"]').length === 0,
);
console.log("one-node module searchable:", !oneNodeAbsent ? "YES (bad)" : "no");
await picker.evaluate(() => {
  const input = document.querySelector('[data-testid="picker-search"]');
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value",
  ).set;
  setter.call(input, "");
  input.dispatchEvent(new Event("input", { bubbles: true }));
});

// Toggle → List: doors appear, the field steps aside.
await picker.click('[data-testid="launcher-mode-list"]');
await picker.waitForSelector('[data-testid="picker-door"]', {
  timeout: 15000,
});
const pickerState = await picker.evaluate(() => ({
  programCards: document.querySelectorAll(
    ".plane-launcher-card, .plane-launcher-grid, .constellation, .constellation-summit",
  ).length,
  doors: document.querySelectorAll('[data-testid="picker-door"]').length,
  fieldGone: !document.querySelector('[data-testid="launcher-field"]'),
}));
console.log(
  "list mode: program cards:",
  pickerState.programCards,
  "· doors:",
  pickerState.doors,
  "· field stepped aside:",
  pickerState.fieldGone,
);

// Search "273.10" → pick → the compose viewer opens for that root.
await picker.type('[data-testid="picker-search"]', "273.10");
await picker.waitForSelector('[data-testid="picker-result"]', {
  timeout: 15000,
});
const pickedLabel = await picker.evaluate(() => {
  const result = document.querySelector('[data-testid="picker-result"]');
  const label = result?.textContent ?? null;
  result?.click();
  return label;
});
console.log("picked:", pickedLabel?.slice(0, 60));
await picker.waitForFunction(
  () => window.location.search.includes("compose="),
  { timeout: 30000 },
);
// Root-first: the opening flight lands on the subtree's true root
// and the inspector opens on it.
await picker.waitForSelector(".node-inspector-title", { timeout: 60000 });
const composeState = await picker.evaluate(() => ({
  inspector:
    document.querySelector(".node-inspector-title")?.textContent ?? "",
  topMetaAbsent: !document.querySelector(".top-meta"),
  standaloneNote:
    document.querySelector('[data-testid="standalone-note"]')?.textContent ??
    "",
}));
const pickerComposeUrl = await picker.evaluate(() => window.location.href);
console.log("picker → compose viewer:", pickerComposeUrl);
console.log(
  "root inspector:",
  composeState.inspector,
  "· top-meta absent:",
  composeState.topMetaAbsent,
  "· note:",
  composeState.standaloneNote,
);

// 10b) Editable facts, end to end: run on defaults, then TYPE a fact
//      — the outputs must change and the sheet must echo the input.
await picker.waitForSelector(".run-toggle", { timeout: 60000 });
await picker.click(".run-toggle");
await picker.waitForSelector(".run-button", { timeout: 15000 });
await picker.click(".run-button");
await picker.waitForSelector(".results-sheet", { timeout: 60000 });
const baseline = await picker.evaluate(
  () =>
    [...document.querySelectorAll(".results-cell")].map(
      (el) => el.textContent,
    ),
);
// The sheet slides in — evaluate-click so animation can't move the
// button out from under a trusted click.
await new Promise((r) => setTimeout(r, 800));
await picker.evaluate(() =>
  document.querySelector(".results-edit-inputs")?.click(),
);
await picker.waitForSelector(".run-overview-search", { timeout: 30000 });
await picker.type(".run-overview-search", "gross monthly earned");
await picker.waitForSelector(".run-picker-row", { timeout: 15000 });
await picker.evaluate(() =>
  document.querySelector(".run-picker-row")?.click(),
);
await picker.waitForSelector(".scenario-field input", { timeout: 15000 });
await picker.type(".scenario-field input", "2000");
await picker.evaluate(() =>
  document.querySelector(".run-button")?.click(),
);
await picker.waitForFunction(
  () => !document.querySelector(".run-spinner"),
  { timeout: 60000 },
);
await picker.waitForSelector(".results-sheet", { timeout: 60000 });
await new Promise((r) => setTimeout(r, 1500));
const afterFact = await picker.evaluate(() => ({
  cells: [...document.querySelectorAll(".results-cell")].map(
    (el) => el.textContent,
  ),
  echo:
    document.querySelector('[data-testid="results-inputs"]')?.textContent ??
    "",
  note:
    [...document.querySelectorAll(".results-note")]
      .map((el) => el.textContent)
      .join(" ") ?? "",
}));
const outputsChanged =
  JSON.stringify(afterFact.cells) !== JSON.stringify(baseline);
const factEchoed =
  /Gross Monthly Earned Income/i.test(afterFact.echo) &&
  afterFact.echo.includes("2,000");
const answeredLine = /You answered 1 of \d+/.test(afterFact.note);
console.log(
  "typed fact: outputs changed:",
  outputsChanged,
  "· echoed:",
  factEchoed,
  "· answered line:",
  answeredLine,
);
console.log("echo:", afterFact.echo.slice(0, 90));

// 11) /app parity: the same compose deep link through the /app
//     rewrite mounts the same viewer with the same run affordance.
const appPage = await browser.newPage();
await appPage.setViewport({ width: 1500, height: 950 });
await appPage.goto(
  "http://localhost:3742/app?compose=us%3Aregulations%2F7-cfr%2F273%2F10",
  { waitUntil: "networkidle2", timeout: 60000 },
);
await appPage.waitForSelector(".graph-viewer-root", { timeout: 60000 });
let appRunToggle = false;
try {
  await appPage.waitForSelector(".run-toggle", { timeout: 30000 });
  appRunToggle = true;
} catch {
  appRunToggle = false;
}
console.log(
  "/app compose parity: viewer mounted · run affordance:",
  appRunToggle ? "LIVE" : "absent",
);

// 12) Honest run refusal: 42/1396a/a/10 compiles to nothing (engine
//     #133) — the viewer must show the API's message, not silence.
const blockedPage = await browser.newPage();
await blockedPage.setViewport({ width: 1500, height: 950 });
await blockedPage.goto(
  "http://localhost:3742/axiom/graph?compose=us%3Astatutes%2F42%2F1396a%2Fa%2F10",
  { waitUntil: "networkidle2", timeout: 60000 },
);
await blockedPage.waitForSelector(".run-blocked", { timeout: 60000 });
const blockedText = await blockedPage.evaluate(
  () => document.querySelector(".run-blocked")?.textContent ?? "",
);
console.log("run-blocked state:", blockedText.slice(0, 110) + "…");
const blockedHonest =
  /execute yet/.test(blockedText) && blockedText.length > 60;

const pass =
  dotCount > 100 &&
  clusterCount > 5 &&
  highlightCount >= 10 &&
  badDoors === 0 &&
  statAbsent &&
  legendAbsent &&
  hasSearch &&
  zoomAfterWheel > zoomBefore &&
  lodNear.lod === "motif" &&
  lodNear.trueEdges >= 20 &&
  headlineDoors >= 5 &&
  txAfterDrag !== txBefore &&
  Boolean(clickedHref) &&
  composeUrl.includes("compose=") &&
  zoomAtEnter > 1 &&
  backUrl.endsWith("/axiom") &&
  liveField &&
  landingNonUsClusters.length === 0 &&
  launcherFieldState.dotCount > 2892 &&
  launcherFieldState.source === "live" &&
  launcherFieldState.statAbsent &&
  launcherFieldState.canvasViewportShare >= 0.8 &&
  launcherFieldState.controlsTopRight &&
  launcherFieldState.copyGone &&
  launcherFieldState.nonUsClusters.length === 0 &&
  launcherFieldState.searchPresent &&
  launcherFieldState.programCards === 0 &&
  launcherFieldState.fieldChipActive &&
  oneNodeAbsent &&
  pickerState.programCards === 0 &&
  pickerState.doors >= 10 &&
  pickerState.fieldGone &&
  pickerComposeUrl.includes("compose=") &&
  /allotment/i.test(composeState.inspector) &&
  composeState.topMetaAbsent &&
  composeState.standaloneNote.includes("standalone definitions hidden") &&
  outputsChanged &&
  factEchoed &&
  answeredLine &&
  appRunToggle &&
  blockedHonest;
console.log(
  pass ? "PASS: true mini-graphs, root-first compose, editable facts" : "FAIL",
);
await browser.close();
process.exit(pass ? 0 : 1);
