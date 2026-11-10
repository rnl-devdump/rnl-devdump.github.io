import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const letterDir = resolve(root, "letter");
const builtHtml = resolve(letterDir, "index.letter.html");
const html = readFileSync(builtHtml, "utf8");
const nestedHtml = html.replace(/\.\/assets\//g, "../assets/");

writeFileSync(resolve(letterDir, "index.html"), html, "utf8");
writeFileSync(resolve(letterDir, "404.html"), html, "utf8");

const entriesIndex = resolve(letterDir, "entries", "index.html");
mkdirSync(dirname(entriesIndex), { recursive: true });
writeFileSync(entriesIndex, nestedHtml, "utf8");

writeFileSync(resolve(letterDir, "_redirects"), "/*    /index.html   200\n", "utf8");
