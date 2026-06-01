import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  base: "/letterhelper/",
  publicDir: resolve(__dirname, "letterhelper-public"),
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "letterhelper",
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, "index.letterhelper.html"),
    },
  },
});
