import { copyFileSync, cpSync, existsSync, renameSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const guardSrc = resolve(root, "sublink-guard.js");

const finalizeHtmlMap = [
  ["dataset/index.dataset.html", "dataset/index.html"],
  ["directory/index.directory.html", "directory/index.html"],
  ["forum/index.forum.html", "forum/index.html"],
  ["validation/index.validation.html", "validation/index.html"],
  ["console/index.dashboard.html", "console/index.html"],
];

for (const [fromRel, toRel] of finalizeHtmlMap) {
  const fromPath = resolve(root, fromRel);
  const toPath = resolve(root, toRel);
  if (existsSync(fromPath)) {
    try {
      renameSync(fromPath, toPath);
    } catch {
      copyFileSync(fromPath, toPath);
    }
  }
}

// Mirror console/ build output into dashboard/ so both console.kiruu.xyz and kiruu.xyz/dashboard work
const consoleDir = resolve(root, "console");
const dashboardDir = resolve(root, "dashboard");
if (existsSync(resolve(consoleDir, "index.html"))) {
  cpSync(consoleDir, dashboardDir, { recursive: true, force: true });
}

const standaloneDirs = [
  "tawir",
  "tawir/beta",
  "vl-assist",
  "anvil",
  "asksight",
  "anime",
  "movie",
  "chess",
  "vibe",
  "dataset",
  "validation",
  "bill",
  "directory",
  "forum",
  "faerie",
  "letter",
  "letterx",
  "letterhelper",
];

for (const dirRel of standaloneDirs) {
  const targetDir = resolve(root, dirRel);
  if (existsSync(targetDir)) {
    copyFileSync(guardSrc, resolve(targetDir, "sublink-guard.js"));
  }
}

console.log(`Synced sublink-guard.js across ${standaloneDirs.length} standalone app directories.`);
