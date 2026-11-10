import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

function devRewritePlugin() {
  return {
    name: "dev-rewrite-dashboard",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === "/dashboard" || req.url === "/dashboard/" || req.url === "/console" || req.url === "/console/" || req.url === "/") {
          req.url = "/index.dashboard.html";
        }
        next();
      });
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss(), devRewritePlugin()],
  build: {
    outDir: "console",
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, "index.dashboard.html"),
    },
  },
});
