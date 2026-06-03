const DEFAULTS = {
  maxWidth: 900,
  maxHeight: 900,
  quality: 0.82,
  /** ~280 KB base64 per image keeps two pics under Firestore's 1 MiB doc limit. */
  maxDataUrlLength: 380_000,
};

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not read that image file."));
    };
    img.src = objectUrl;
  });
}

function drawScaled(img, maxWidth, maxHeight) {
  let { width, height } = img;
  const scale = Math.min(1, maxWidth / width, maxHeight / height);
  width = Math.max(1, Math.round(width * scale));
  height = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not prepare image canvas.");
  ctx.drawImage(img, 0, 0, width, height);
  return canvas;
}

/** Compress a picked image to a JPEG data URL for Firestore (no paid Storage). */
export async function compressImageToDataUrl(file, options = {}) {
  if (!file) throw new Error("No file selected.");
  if (!file.type.startsWith("image/")) throw new Error("Only image files are supported.");

  const { maxWidth, maxHeight, quality, maxDataUrlLength } = { ...DEFAULTS, ...options };
  const img = await loadImage(file);
  const canvas = drawScaled(img, maxWidth, maxHeight);

  let q = quality;
  let dataUrl = canvas.toDataURL("image/jpeg", q);
  while (dataUrl.length > maxDataUrlLength && q > 0.35) {
    q -= 0.07;
    dataUrl = canvas.toDataURL("image/jpeg", q);
  }

  if (dataUrl.length > maxDataUrlLength) {
    throw new Error(
      "Image is still too large after compression. Try a smaller photo, or add it to assets/pics/ in the repo instead.",
    );
  }

  return dataUrl;
}

export function isEmbeddedPicRef(value) {
  return /^data:image\//i.test((value || "").trim());
}
