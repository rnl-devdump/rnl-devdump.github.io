import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { serveAssetsPicsPlugin } from "./scripts/vite-serve-assets-pics.mjs";

function devRewritePlugin() {
  return {
    name: 'dev-rewrite',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/faerie' || req.url === '/faerie/' || req.url === '/') {
          req.url = '/index.faerie.html';
        }
        next();
      });
    }
  };
}

export default defineConfig({
  base: "/faerie/",
  plugins: [react(), tailwindcss(), serveAssetsPicsPlugin(), devRewritePlugin()],
  build: {
    outDir: "faerie",
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, "index.faerie.html"),
    },
  },
});
