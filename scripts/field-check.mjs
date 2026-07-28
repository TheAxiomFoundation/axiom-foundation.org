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

// 3) The honest stat line is computed, not hardcoded.
const statLine = await page.evaluate(
  () =>
    document.querySelector('[data-testid="corpus-field-stats"]')?.textContent ??
    "",
);
console.log("stat line:", statLine);

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
await page.mouse.wheel({ deltaY: -600 });
await new Promise((r) => setTimeout(r, 300));
const zoomAfterWheel = await page.evaluate(() =>
  Number(
    document
      .querySelector('[data-testid="corpus-field"]')
      ?.getAttribute("data-zoom"),
  ),
);
console.log("wheel zoom:", zoomBefore, "→", zoomAfterWheel);

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

const pass =
  dotCount > 100 &&
  clusterCount > 5 &&
  highlightCount >= 10 &&
  /provision-rooted subtrees/.test(statLine) &&
  hasSearch &&
  zoomAfterWheel > zoomBefore &&
  txAfterDrag !== txBefore &&
  Boolean(clickedHref) &&
  composeUrl.includes("compose=") &&
  zoomAtEnter > 1 &&
  backUrl.endsWith("/axiom");
console.log(pass ? "PASS: corpus field open world verified" : "FAIL");
await browser.close();
process.exit(pass ? 0 : 1);
