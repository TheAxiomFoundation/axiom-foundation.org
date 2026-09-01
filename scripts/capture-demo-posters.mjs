// Regenerates the static demo-thumb posters in public/demo-posters.
//
// Run: bun run posters:capture
// Prerequisite (one-time): bunx playwright install chromium
//
// Every surface the landing-demo-thumb pattern can embed live is
// captured at a 1440x810 layout viewport (the width the 0.2-scale
// thumb implies on a ~288px card) with deviceScaleFactor 0.5, so the
// PNGs land at 720x405 — 2x for the ~350px-wide rendered thumbs.
// Capture waits for network idle plus a settle delay so reveal
// animations and fonts finish; the app surface also dismisses its
// first-visit tour so the poster shows the graph, not the modal.
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Keep in sync with the DemoThumb call sites:
// src/app/about/page.tsx and src/components/landing/applications-section.tsx.
const SURFACES = [
  ["gallery", "https://axiom-demo-shell.vercel.app/demos/"],
  ["workflow", "https://co-snap-workflow-checker.vercel.app/"],
  ["chatbot", "https://axiom.org/chatbot"],
  ["snap", "https://axiom-co-snap.vercel.app/"],
  ["app", "https://app.axiom-foundation.org"],
];

const outDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "public",
  "demo-posters",
);

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 810 },
  deviceScaleFactor: 0.5,
});

let failures = 0;

for (const [name, url] of SURFACES) {
  const page = await context.newPage();
  // Never overwrite a good poster with an error capture: skip the
  // surface on navigation failure or an HTTP error status. Only an
  // idle timeout proceeds — the document loaded, the network just
  // stayed chatty.
  try {
    const response = await page.goto(url, {
      waitUntil: "networkidle",
      timeout: 45000,
    });
    if (response && !response.ok()) {
      console.error(
        `${name}: HTTP ${response.status()} from ${url} — keeping the existing poster`,
      );
      failures += 1;
      await page.close();
      continue;
    }
  } catch (err) {
    if (err?.name === "TimeoutError") {
      console.warn(`${name}: network never idled; capturing anyway`);
    } else {
      console.error(
        `${name}: navigation failed (${err?.message ?? err}) — keeping the existing poster`,
      );
      failures += 1;
      await page.close();
      continue;
    }
  }
  await page.waitForTimeout(6000);
  if (name === "app") {
    // The first-visit tour modal covers the graph; dismiss via its
    // skip control, falling back to Escape.
    const dismissed = await page
      .getByText(/skip/i)
      .first()
      .click({ timeout: 5000 })
      .then(() => true)
      .catch(() => false);
    if (!dismissed) await page.keyboard.press("Escape");
    await page.waitForTimeout(3000);
    if (await page.getByText("Welcome to the graph").isVisible().catch(() => false)) {
      console.warn("app: tour modal still visible — poster will include it");
    }
  }
  const file = path.join(outDir, `${name}.png`);
  await page.screenshot({ path: file });
  console.log(`${name}: ${url} -> ${file}`);
  await page.close();
}

await browser.close();

if (failures > 0) {
  console.error(`${failures} surface(s) skipped — their posters are unchanged`);
  process.exit(1);
}
