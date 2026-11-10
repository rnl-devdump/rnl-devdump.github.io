import { rename } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = resolve(fileURLToPath(import.meta.url), "..");

async function finalize() {
  try {
    const rootPath = resolve(__dirname, "..");
    const oldPath = resolve(rootPath, "console/index.dashboard.html");
    const newPath = resolve(rootPath, "console/index.html");

    await rename(oldPath, newPath);
    console.log("Successfully renamed index.dashboard.html to index.html in console output");
  } catch (error) {
    console.error("Error finalizing console build:", error);
    process.exit(1);
  }
}

finalize();
