import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = resolve(root, "letterhelper");
const builtHtml = resolve(outDir, "index.letterhelper.html");
const html = readFileSync(builtHtml, "utf8");

mkdirSync(outDir, { recursive: true });
writeFileSync(resolve(outDir, "index.html"), html, "utf8");
writeFileSync(resolve(outDir, "404.html"), html, "utf8");
writeFileSync(resolve(outDir, "_redirects"), "/*    /index.html   200\n", "utf8");
