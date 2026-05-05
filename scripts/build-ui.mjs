import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(root, "..");
const packageRoot = join(repoRoot, "packages", "ui");
const tempDist = join(packageRoot, ".dist-tmp");
const dist = join(packageRoot, "dist");

await rm(tempDist, { recursive: true, force: true });

execFileSync(
  "bunx",
  ["tsc", "-p", "tsconfig.json", "--outDir", ".dist-tmp"],
  {
    cwd: packageRoot,
    stdio: "inherit",
  },
);

await mkdir(join(tempDist, "styles"), { recursive: true });
await cp(
  join(packageRoot, "src", "styles", "tokens.css"),
  join(tempDist, "styles", "tokens.css"),
);

await mkdir(dist, { recursive: true });
await cp(tempDist, dist, { recursive: true, force: true });
await removeStaleFiles(tempDist, dist);
await rm(tempDist, { recursive: true, force: true });

async function removeStaleFiles(sourceDir, targetDir) {
  const sourceEntries = new Set(await listRelativeFiles(sourceDir));
  const targetFiles = await listRelativeFiles(targetDir);

  await Promise.all(
    targetFiles
      .filter((file) => !sourceEntries.has(file))
      .map((file) => rm(join(targetDir, file), { force: true })),
  );
}

async function listRelativeFiles(dir) {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => relative(dir, join(entry.parentPath, entry.name)));
}
