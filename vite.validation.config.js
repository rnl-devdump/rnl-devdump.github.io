import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  base: "/validation/",
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "validation",
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, "index.validation.html"),
    },
  },
});

