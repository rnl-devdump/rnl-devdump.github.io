import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

import fs from "node:fs";

function devRewritePlugin() {
  return {
    name: 'dev-rewrite-movie',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        // Vite strips base in req.url, but req.originalUrl retains it.
        // We catch '/', '/index.html', or the base itself.
        if (req.url === '/' || req.url === '/index.html' || req.originalUrl === '/movie' || req.originalUrl === '/movie/') {
          try {
            const htmlPath = resolve(__dirname, 'index.movie.html');
            let html = fs.readFileSync(htmlPath, 'utf-8');
            html = await server.transformIndexHtml('/index.movie.html', html);
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
  base: "/movie/",
  plugins: [react(), tailwindcss(), devRewritePlugin()],
  build: {
    outDir: "movie",
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, "index.movie.html"),
    },
  },
});
