import { rename } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = resolve(fileURLToPath(import.meta.url), "..");

async function finalize() {
  try {
    const rootPath = resolve(__dirname, "..");
    const oldPath = resolve(rootPath, "movie/index.movie.html");
    const newPath = resolve(rootPath, "movie/index.html");

    await rename(oldPath, newPath);
    console.log("Successfully renamed index.movie.html to index.html in movie output");
  } catch (error) {
    console.error("Error finalizing movie build:", error);
    process.exit(1);
  }
}

finalize();
