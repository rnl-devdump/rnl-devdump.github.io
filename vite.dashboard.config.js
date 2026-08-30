import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

function devRewritePlugin() {
  return {
    name: 'dev-rewrite-dashboard',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/dashboard' || req.url === '/dashboard/' || req.url === '/') {
          req.url = '/index.dashboard.html';
        }
        next();
      });
    }
  };
}

export default defineConfig({
  base: "/dashboard/",
  plugins: [react(), tailwindcss(), devRewritePlugin()],
  build: {
    outDir: "dashboard",
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, "index.dashboard.html"),
    },
  },
});
