import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: "/directory/",
  plugins: [react(), tailwindcss()],
  resolve: {
    preserveSymlinks: true,
  },
  build: {
    outDir: "directory",
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, "index.directory.html"),
    },
  },
});
