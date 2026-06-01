import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const letterDir = resolve(root, "letterx");
const builtHtml = resolve(letterDir, "index.letterx.html");
const html = readFileSync(builtHtml, "utf8");

const targets = [
  resolve(letterDir, "index.html"),
  resolve(letterDir, "404.html"),
  resolve(letterDir, "entries", "index.html"),
];

for (const target of targets) {
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, html, "utf8");
}

writeFileSync(resolve(letterDir, "_redirects"), "/letterx/*    /letterx/index.html   200\n", "utf8");
