import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const oldPath = path.resolve(__dirname, "../anime/index.anime.html");
const newPath = path.resolve(__dirname, "../anime/index.html");

try {
  if (fs.existsSync(oldPath)) {
    fs.renameSync(oldPath, newPath);
    console.log("Successfully renamed index.anime.html to index.html in anime output");
  } else {
    console.warn(`File not found: ${oldPath}`);
  }
} catch (err) {
  console.error("Error renaming index.anime.html:", err);
  process.exit(1);
}
