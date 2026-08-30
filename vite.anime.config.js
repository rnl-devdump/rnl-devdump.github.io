import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

import fs from "node:fs";

function devRewritePlugin() {
  return {
    name: 'dev-rewrite-anime',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        // Vite strips base in req.url, but req.originalUrl retains it.
        // We catch '/', '/index.html', or the base itself.
        if (req.url === '/' || req.url === '/index.html' || req.originalUrl === '/anime' || req.originalUrl === '/anime/') {
          try {
            const htmlPath = resolve(__dirname, 'index.anime.html');
            let html = fs.readFileSync(htmlPath, 'utf-8');
            html = await server.transformIndexHtml('/index.anime.html', html);
            res.setHeader('Content-Type', 'text/html');
            res.end(html);
            return;
          } catch (e) {
            return next(e);
          }
        }
        next();
      });
    }
  };
}

export default defineConfig({
  base: "/anime/",
  plugins: [react(), tailwindcss(), devRewritePlugin()],
  build: {
    outDir: "anime",
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, "index.anime.html"),
    },
  },
});
