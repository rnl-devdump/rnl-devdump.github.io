export const DEFAULT_REGARDS = "Sincerely,";

export const defaultLetterConfig = {
  header: "Fae,",
  content:
    "This letter is pin-locked for you. Every word here is intentional, private, and written from the heart.",
  regards: DEFAULT_REGARDS,
  signature: "Your Name",
  expectedPin: "1234",
  pic1: "",
  pic2: "",
};

/** Filename only — files live in repo `assets/pics/`. */
export function sanitizePicFilename(value) {
  if (!value) return "";
  return value.replace(/^.*[\\/]/, "").replace(/[^a-zA-Z0-9._-]/g, "");
}

/** Repo filename, https URL, or embedded data URL (Firestore publish). */
export function normalizePicRef(value) {
  if (!value) return "";
  const trimmed = value.trim();
  if (/^data:image\//i.test(trimmed)) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return sanitizePicFilename(trimmed);
}

export function resolvePicUrl(ref) {
  const normalized = normalizePicRef(ref);
  if (!normalized) return "";
  if (/^data:image\//i.test(normalized)) return normalized;
  if (/^https?:\/\//i.test(normalized)) return normalized;
  if (typeof window === "undefined") return `/assets/pics/${encodeURIComponent(normalized)}`;
  return `${window.location.origin}/assets/pics/${encodeURIComponent(normalized)}`;
}

export function getLetterAppBase(pathname = "") {
  if (/\/letterx(\/|$)/.test(pathname)) return "/letterx";
  return "/letter";
}

/** Galaxy letter runtime config (new + legacy Firestore / URL fields). */
export function mapFirestoreData(data) {
  const d = data || {};
  return {
    header: d.header || d.to || defaultLetterConfig.header,
    content: d.content || d.body || defaultLetterConfig.content,
    regards: d.regards || DEFAULT_REGARDS,
    signature: d.signature || d.from || defaultLetterConfig.signature,
    expectedPin: String(d.pin || defaultLetterConfig.expectedPin),
    pic1: normalizePicRef(d.pic1 || ""),
    pic2: normalizePicRef(d.pic2 || ""),
  };
}

export function getConfigFromUrl() {
  if (typeof window === "undefined") return defaultLetterConfig;

  const params = new URLSearchParams(window.location.search);
  return {
    header:
      params.get("header") ||
      params.get("to") ||
      defaultLetterConfig.header,
    content: params.get("content") || defaultLetterConfig.content,
    regards: params.get("regards") || DEFAULT_REGARDS,
    signature:
      params.get("signature") ||
      params.get("nameOfRegards") ||
      params.get("from") ||
      defaultLetterConfig.signature,
    expectedPin: params.get("pin") || defaultLetterConfig.expectedPin,
    pic1: normalizePicRef(params.get("pic1") || ""),
    pic2: normalizePicRef(params.get("pic2") || ""),
  };
}

/** Row for /letter/entries (labels match legacy helper: To, content, From). */
export function entryFromFirestore(id, data) {
  const config = mapFirestoreData(data);
  const d = data || {};
  return {
    id,
    letterName: d.letterName || id,
    to: config.header,
    content: config.content,
    regards: config.regards,
    from: config.signature,
    pin: config.expectedPin,
    isLegacy: Boolean(d.to || d.from) && !d.header,
    createdAt: d.createdAt ?? null,
  };
}

export function letterOpenPath(id, base = "/letter") {
  const root = base.replace(/\/$/, "") || "/letter";
  return `${root}/?id=${encodeURIComponent(id)}`;
}

export function publishedOpenPath(id, { pic1 = "", pic2 = "" } = {}) {
  const base = pic1 || pic2 ? "/letterx" : "/letter";
  return letterOpenPath(id, base);
}

export function isLetterEntriesRoute(pathname = "") {
  return /\/letter\/entries\/?$/.test(pathname);
}
