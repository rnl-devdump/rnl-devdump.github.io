import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const picsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "assets", "pics");

const MIME = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export function serveAssetsPicsPlugin() {
  return {
    name: "serve-assets-pics",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith("/assets/pics/")) return next();
        sendPic(req, res, next);
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith("/assets/pics/")) return next();
        sendPic(req, res, next);
      });
    },
  };
}

function sendPic(req, res, next) {
  const name = path.basename(decodeURIComponent(req.url.split("?")[0]));
  if (!name || name === "." || name === "..") return next();
  const file = path.join(picsDir, name);
  if (!file.startsWith(picsDir) || !fs.existsSync(file)) return next();
  const ext = path.extname(file).toLowerCase();
  res.setHeader("Content-Type", MIME[ext] || "application/octet-stream");
  fs.createReadStream(file).pipe(res);
}
