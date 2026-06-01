import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  base: "/letter/",
  publicDir: resolve(__dirname, "letter-public"),
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "letter",
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, "index.letter.html"),
    },
  },
});
