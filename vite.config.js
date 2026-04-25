import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ command }) => ({
  // Use root base during dev so /validation works on the same localhost port.
  base: command === "serve" ? "/" : "/dataset/",
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "dataset",
    emptyOutDir: true,
  },
}));
