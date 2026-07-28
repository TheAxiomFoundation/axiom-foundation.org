// Headless sanity for the corpus-field landing: the field renders the
// whole census, the labeled doors work, and a click lands on the
// compose viewer. Run with the dev server on :3742
// (`PORT=3742 bun run dev`).
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

// 2) Aggregated jurisdiction clusters + the six labeled entry points.
const clusterCount = await page.evaluate(
  () => document.querySelectorAll('[data-testid="corpus-field-cluster"]').length,
);
const highlightCount = await page.evaluate(
  () =>
    document.querySelectorAll('[data-testid="corpus-field-highlight"]').length,
);
console.log("cluster labels:", clusterCount, "· highlights:", highlightCount);

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

// 5) Click a highlighted door and land on the compose viewer.
const clickedHref = await page.evaluate(() => {
  const doors = [
    ...document.querySelectorAll('[data-testid="corpus-field-highlight"]'),
  ];
  const door =
    doors.find((el) => /Net income/i.test(el.textContent ?? "")) ?? doors[0];
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
await page.waitForSelector(".graph-viewer-root", { timeout: 60000 });
const composeUrl = await page.evaluate(() => window.location.href);
console.log("landed on compose viewer:", composeUrl);

// 6) Run-by-root state (informational): the run affordance only
//    appears in compose mode when the API answers the root shape.
await new Promise((r) => setTimeout(r, 5000));
const runToggle = await page.evaluate(() =>
  Boolean(document.querySelector(".run-toggle")),
);
console.log(
  "compose run affordance:",
  runToggle ? "LIVE (root calculate supported)" : "feature-detected off",
);

const pass =
  dotCount > 100 &&
  clusterCount > 5 &&
  highlightCount >= 6 &&
  /provision-rooted subtrees/.test(statLine) &&
  hasSearch &&
  Boolean(clickedHref) &&
  composeUrl.includes("compose=");
console.log(pass ? "PASS: corpus field landing verified" : "FAIL");
await browser.close();
process.exit(pass ? 0 : 1);
