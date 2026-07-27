import puppeteer from "puppeteer-core";

const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
const page = await browser.newPage();
await page.setViewport({ width: 1500, height: 950 });
page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));
await page.goto("http://localhost:3742/axiom/graph?program=us-ny%2Fsnap", {
  waitUntil: "networkidle2",
  timeout: 60000,
});
await page.waitForSelector(".run-toggle", { timeout: 60000 });
await new Promise((r) => setTimeout(r, 3000));

const inspect = async () =>
  page.evaluate(() => {
    const mg = document.querySelector(".mini-graph");
    if (!mg) return null;
    const deps = mg.querySelectorAll(".mini-graph-deps .mini-graph-card").length;
    const uses = mg.querySelectorAll(
      ".mini-graph-consumers .mini-graph-card",
    ).length;
    const wires = mg.querySelectorAll(".mini-graph-wires path").length;
    const chips = mg.querySelectorAll(".mini-graph-chip").length;
    const center =
      mg.querySelector(".mini-graph-card.is-center")?.textContent ?? null;
    // No internal scrolling anywhere in the widget
    const scrolls = [...mg.querySelectorAll("*"), mg].some(
      (el) => el.scrollHeight > el.clientHeight + 1,
    );
    // No sideways cutoff
    const overflowsX = [...mg.querySelectorAll(".mini-graph-card")].some(
      (el) => el.scrollWidth > el.clientWidth + 1,
    );
    return { deps, uses, wires, chips, center, scrolls, overflowsX };
  });

// 1) Pre-run: click a mid-graph rule with deps and consumers
await page.evaluate(() => {
  const nodes = [...document.querySelectorAll(".irg-node")];
  nodes.find((n) => /Net Income/i.test(n.textContent ?? ""))?.click();
});
await new Promise((r) => setTimeout(r, 900));
const before = await inspect();
console.log("pre-run:", JSON.stringify(before));
await page.screenshot({ path: "/tmp/mini-graph-before.png" });

// 2) Run the sample household, then re-open the same rule
await page.click(".run-toggle");
await page.waitForSelector(".run-sample", { timeout: 15000 });
await page.click(".run-sample");
await page.waitForSelector(".results-sheet", { timeout: 30000 });
await page.keyboard.press("Escape");
await new Promise((r) => setTimeout(r, 800));
await page.evaluate(() => {
  const nodes = [...document.querySelectorAll(".irg-node")];
  nodes.find((n) => /Net Income/i.test(n.textContent ?? ""))?.click();
});
await new Promise((r) => setTimeout(r, 900));
const after = await inspect();
console.log("post-run:", JSON.stringify(after));
await page.screenshot({ path: "/tmp/mini-graph-after.png" });

// 3) Click a dep card — navigation still works
const hop = await page.evaluate(() => {
  const row = document.querySelector(".mini-graph-deps button.mini-graph-card");
  const label = row?.textContent ?? null;
  row?.click();
  return label;
});
await new Promise((r) => setTimeout(r, 1000));
const hopped = await inspect();
console.log("after dep hop to:", hop, "→", JSON.stringify(hopped));
await page.screenshot({ path: "/tmp/mini-graph-hop.png" });

const ok =
  before &&
  after &&
  hopped &&
  before.wires === before.deps + before.uses &&
  !before.scrolls &&
  !before.overflowsX &&
  after.chips > 0 &&
  !after.scrolls &&
  hopped.center !== after.center;
console.log(ok ? "PASS" : "FAIL");
await browser.close();
process.exit(ok ? 0 : 1);
