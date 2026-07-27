import puppeteer from "puppeteer-core";

const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
const page = await browser.newPage();
await page.setViewport({ width: 1500, height: 950 });
await page.goto("http://localhost:3742/axiom/graph?program=us-ny%2Fsnap", {
  waitUntil: "networkidle2",
  timeout: 60000,
});
await page.waitForSelector(".run-toggle", { timeout: 60000 });
await new Promise((r) => setTimeout(r, 3000));

// Zoom out first, as the user does
const box = await page.evaluate(() => {
  const r = document.querySelector(".irg-wrap").getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
});
await page.mouse.move(box.x, box.y);
for (let i = 0; i < 14; i++) {
  await page.mouse.wheel({ deltaY: 240 });
  await new Promise((r) => setTimeout(r, 100));
}

// Arm an in-page sampler BEFORE the run lands: every 100ms for 5s,
// record how many CSS animations are actively running and on what.
await page.evaluate(() => {
  window.__samples = [];
  window.__armed = false;
  const tick = () => {
    const anims = document
      .getAnimations()
      .filter((a) => a.playState === "running");
    const names = {};
    for (const a of anims) {
      const n = a.animationName ?? a.constructor.name;
      names[n] = (names[n] ?? 0) + 1;
    }
    window.__samples.push({
      t: Math.round(performance.now() - window.__t0),
      lod: document.querySelector(".irg-wrap")?.getAttribute("data-lod"),
      running: anims.length,
      names,
    });
  };
  window.__startSampling = () => {
    window.__t0 = performance.now();
    window.__iv = setInterval(tick, 100);
    setTimeout(() => clearInterval(window.__iv), 5000);
  };
});

await page.click(".run-toggle");
await page.waitForSelector(".run-sample", { timeout: 15000 });
// Start sampling the instant we trigger the run
await page.evaluate(() => window.__startSampling());
await page.click(".run-sample");
await page.waitForSelector(".results-sheet", { timeout: 30000 });
await new Promise((r) => setTimeout(r, 5200));

const samples = await page.evaluate(() => window.__samples);
for (const s of samples) {
  console.log(
    `t=${String(s.t).padStart(4)}ms lod=${s.lod} running=${s.running}`,
    Object.keys(s.names).length ? JSON.stringify(s.names) : "",
  );
}
// While zoomed out (mid/far), the choreography animations must not
// run. One-shot CSSTransitions are the crossfade itself; the results
// sheet's own plane-value-in (a handful, off-canvas) is fine.
const banned = samples.filter(
  (s) =>
    (s.lod === "far" || s.lod === "mid") &&
    Object.keys(s.names).some(
      (n) => n === "value-in" || n.startsWith("exec-lift") || n === "plane-flow",
    ),
);
console.log(
  banned.length
    ? `FAIL: choreography ran zoomed out at ${banned.map((s) => s.t + "ms").join(", ")}`
    : "PASS: nothing but the crossfade animates while zoomed out",
);
await browser.close();
process.exit(banned.length ? 1 : 0);
