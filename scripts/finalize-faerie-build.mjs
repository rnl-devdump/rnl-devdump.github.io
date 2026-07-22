import { rename } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = resolve(fileURLToPath(import.meta.url), "..");

async function finalize() {
  try {
    const rootPath = resolve(__dirname, "..");
    const oldPath = resolve(rootPath, "faerie/index.faerie.html");
    const newPath = resolve(rootPath, "faerie/index.html");

    await rename(oldPath, newPath);
    console.log("Successfully renamed index.faerie.html to index.html in faerie output");
  } catch (error) {
    console.error("Error finalizing faerie build:", error);
    process.exit(1);
  }
}

finalize();
