import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "dataset",
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, "index.dataset.html"),
    },
  },
});
