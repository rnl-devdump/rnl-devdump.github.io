import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { serveAssetsPicsPlugin } from "./scripts/vite-serve-assets-pics.mjs";

export default defineConfig({
  base: "/",
  publicDir: resolve(__dirname, "letterhelper-public"),
  plugins: [react(), tailwindcss(), serveAssetsPicsPlugin()],
  build: {
    outDir: "letterhelper",
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, "index.letterhelper.html"),
    },
  },
});
