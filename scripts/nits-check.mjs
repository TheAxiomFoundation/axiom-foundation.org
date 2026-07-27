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

const checks = {};

// 1) Run button: label + filled prominence
checks.runButton = await page.evaluate(() => {
  const btn = document.querySelector(".run-toggle");
  const style = getComputedStyle(btn);
  return {
    label: btn.textContent,
    filled: style.backgroundColor !== "rgba(0, 0, 0, 0)",
    white: style.color === "rgb(255, 255, 255)",
  };
});

// Run the sample household
await page.click(".run-toggle");
await page.waitForSelector(".run-sample", { timeout: 15000 });
await page.click(".run-sample");
await page.waitForSelector(".results-sheet", { timeout: 30000 });
await page.keyboard.press("Escape");
await new Promise((r) => setTimeout(r, 800));

// 2) Adjust labels never wider than their input box
checks.adjustWrap = await page.evaluate(() => {
  const fields = [...document.querySelectorAll(".results-adjust-field")];
  return fields.every((f) => {
    const span = f.querySelector("span");
    const input = f.querySelector("input");
    return span.getBoundingClientRect().width <= input.getBoundingClientRect().width + 2;
  });
});

// 3) Pagination: answer many inputs via the run panel, expect a pager
await page.evaluate(() => {
  document.querySelector(".results-edit-inputs")?.click();
});
await new Promise((r) => setTimeout(r, 600));
// Add six more levers from the picker, then answer every number field
for (let i = 0; i < 6; i++) {
  await page.evaluate(() => {
    document.querySelector(".run-picker-row.is-lever")?.click();
  });
  await new Promise((r) => setTimeout(r, 200));
}
await page.evaluate(() => {
  const inputs = [
    ...document.querySelectorAll(".scenario-fields input[type='number']"),
  ];
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value",
  ).set;
  for (const input of inputs) {
    setter.call(input, "5");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }
  for (const box of document.querySelectorAll(
    ".scenario-fields input[type='checkbox']",
  )) {
    box.click();
  }
});
await new Promise((r) => setTimeout(r, 2500));
await page.keyboard.press("Escape");
await new Promise((r) => setTimeout(r, 3500));
checks.pager = await page.evaluate(() => {
  const pager = document.querySelector(".results-adjust-pager");
  const fields = document.querySelectorAll(".results-adjust-field").length;
  return { present: Boolean(pager), text: pager?.textContent ?? null, fields };
});

// 4) Mini graph: a rule with unanswered question deps says "not selected"
await page.evaluate(() => {
  [...document.querySelectorAll(".irg-node")]
    .find((n) => /Telephone Standard Allowance Eligible/i.test(n.textContent ?? ""))
    ?.click();
});
await new Promise((r) => setTimeout(r, 900));
checks.notSelected = await page.evaluate(() => {
  const chips = [...document.querySelectorAll(".mini-graph-chip.is-muted")];
  return chips.map((c) => c.textContent);
});

// 5) Answering from the inspector must not refly to the summit
const beforeAnswer = await page.evaluate(() => ({
  title: document.querySelector(".node-inspector-title")?.textContent,
  viewport: document
    .querySelector(".react-flow__viewport")
    ?.getAttribute("style"),
}));
// find a question card in the mini graph and answer via inspector path:
// use inspector "Your answer" if present; otherwise skip gracefully
await page.evaluate(() => {
  document
    .querySelector(".mini-graph-deps button.mini-graph-card.is-question")
    ?.click();
});
await new Promise((r) => setTimeout(r, 1200));
await page.evaluate(() => {
  const input = document.querySelector(".node-inspector-answer");
  if (!input) return;
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value",
  ).set;
  setter.call(input, "7");
  input.dispatchEvent(new Event("input", { bubbles: true }));
});
const titleDuring = await page.evaluate(
  () => document.querySelector(".node-inspector-title")?.textContent,
);
await new Promise((r) => setTimeout(r, 4000)); // debounce + auto-run lands
checks.noRefly = await page.evaluate(
  (expected) => ({
    stayed:
      document.querySelector(".node-inspector-title")?.textContent === expected,
    title: document.querySelector(".node-inspector-title")?.textContent,
  }),
  titleDuring,
);

// 6) A clicked non-executed node stays lit (irg-inspected mark)
await page.evaluate(() => {
  const off = [
    ...document.querySelectorAll(".react-flow__node.irg-exec-off .irg-node"),
  ][0];
  off?.click();
});
await new Promise((r) => setTimeout(r, 900));
checks.selectedLit = await page.evaluate(() => {
  const el = document.querySelector(
    ".react-flow__node.irg-inspected.irg-exec-off",
  );
  if (!el) return { selected: false };
  return { selected: true, opacity: getComputedStyle(el).opacity };
});

// 7) Far zoom in run mode: renderer flat, no 3D contexts
const box = await page.evaluate(() => {
  const r = document.querySelector(".irg-wrap").getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
});
await page.mouse.move(box.x, box.y);
for (let i = 0; i < 16; i++) {
  await page.mouse.wheel({ deltaY: 300 });
  await new Promise((r) => setTimeout(r, 90));
}
await new Promise((r) => setTimeout(r, 500));
checks.farFlat = await page.evaluate(() => {
  const lod = document.querySelector(".irg-wrap")?.getAttribute("data-lod");
  const renderer = document.querySelector(".react-flow__renderer");
  const node = document.querySelector(".react-flow__node");
  const off = document.querySelector(".react-flow__node.irg-exec-off");
  return {
    lod,
    rendererTransform: renderer ? getComputedStyle(renderer).transform : null,
    nodeStyle: node ? getComputedStyle(node).transformStyle : null,
    offFilter: off ? getComputedStyle(off).filter : null,
  };
});

console.log(JSON.stringify(checks, null, 1));
const pass =
  checks.runButton.label === "Run a scenario" &&
  checks.runButton.filled &&
  checks.runButton.white &&
  checks.adjustWrap &&
  checks.pager.present &&
  checks.pager.fields <= 6 &&
  checks.notSelected.length > 0 &&
  checks.notSelected.every((t) => t === "not selected") &&
  checks.noRefly.stayed &&
  checks.selectedLit.selected &&
  checks.selectedLit.opacity === "1" &&
  checks.farFlat.lod === "far" &&
  checks.farFlat.rendererTransform === "none" &&
  checks.farFlat.nodeStyle === "flat" &&
  checks.farFlat.offFilter === "none";
console.log(pass ? "PASS" : "FAIL");
await browser.close();
process.exit(pass ? 0 : 1);
