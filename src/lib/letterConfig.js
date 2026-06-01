export const DEFAULT_REGARDS = "Sincerely,";

export const defaultLetterConfig = {
  header: "Fae,",
  content:
    "This letter is pin-locked for you. Every word here is intentional, private, and written from the heart.",
  regards: DEFAULT_REGARDS,
  signature: "Your Name",
  expectedPin: "1234",
};

/** Galaxy letter runtime config (new + legacy Firestore / URL fields). */
export function mapFirestoreData(data) {
  const d = data || {};
  return {
    header: d.header || d.to || defaultLetterConfig.header,
    content: d.content || d.body || defaultLetterConfig.content,
    regards: d.regards || DEFAULT_REGARDS,
    signature: d.signature || d.from || defaultLetterConfig.signature,
    expectedPin: String(d.pin || defaultLetterConfig.expectedPin),
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

export function letterOpenPath(id) {
  if (typeof window === "undefined") {
    return `/letter/?id=${encodeURIComponent(id)}`;
  }
  const letterBase =
    window.location.pathname.replace(/\/entries\/?$/, "").replace(/\/?$/, "") || "/letter";
  return `${letterBase}/?id=${encodeURIComponent(id)}`;
}

export function isLetterEntriesRoute(pathname = "") {
  return /\/letter\/entries\/?$/.test(pathname);
}
