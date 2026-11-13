export const ADMIN_EMAIL_ALLOWLIST = [
  "admin@kiruu.xyz",
  "iamk1ruu@gmail.com",
];

export const TAWIR_BACKEND_PRESETS = [
  { id: "v7", name: "Tawir-v7 (Prod)", url: "https://iamk1ruu--tawir-v7.modal.run" },
  { id: "v6", name: "Tawir-DEV (v6 Staging)", url: "https://iamk1ruu--tawir-agent-v6-staging.modal.run" },
  { id: "exa", name: "Tawir-v5 (Exa)", url: "https://iamk1ruu--tawir-agent-exa.modal.run" },
  { id: "tavily", name: "Tawir-Legacy (Tavily)", url: "https://iamk1ruu--tawir-agent.modal.run" },
  { id: "v3-agent", name: "Tawir-v3 Agent", url: "https://ocamporavenneil--tawir-agent.modal.run" },
];

export const INITIAL_SUBLINKS = {
  dermatriage: {
    name: "Dermatriage (Clinical Triage)",
    path: "kiruu.xyz/dermatriage",
    url: "https://kiruu.xyz/dermatriage/",
    category: "Healthcare AI",
    description: "Dual-Branch CNN-ViT Cross-Attention skin lesion and exanthem clinical decision support system",
    enabled: true,
    offlineType: "offline",
    message: "Dermatriage is temporarily offline.",
  },
  main: {
    name: "Main Homepage (Portal)",
    path: "kiruu.xyz",
    url: "https://kiruu.xyz",
    category: "System Portal",
    description: "Root ecosystem portal and directory (index.html)",
    enabled: true,
    offlineType: "offline",
    message: "The main portal is temporarily closed for maintenance.",
  },
  tawir: {
    name: "TAWIR (v3 Assistant)",
    path: "tawir.kiruu.xyz",
    url: "https://tawir.kiruu.xyz",
    category: "AI Assistant",
    description: "Pangasinan conversational model interface (Flutter v3)",
    enabled: true,
    offlineType: "offline",
    message: "TAWIR v3 is temporarily offline.",
  },
  "tawir-beta": {
    name: "TAWIR Beta",
    path: "tawir.kiruu.xyz/beta",
    url: "https://tawir.kiruu.xyz/beta/",
    category: "AI Assistant",
    description: "Next-gen Salitan Pangasinan conversational AI client with neural web agent and MMS-TTS",
    enabled: true,
    offlineType: "offline",
    message: "TAWIR Beta is currently undergoing maintenance.",
  },
  "vl-assist": {
    name: "VL Assist",
    path: "vl-assist.kiruu.xyz",
    url: "https://vl-assist.kiruu.xyz",
    category: "AI Assistant",
    description: "Real-time vision-language visual assistant powered by Qwen VL",
    enabled: true,
    offlineType: "offline",
    message: "VL Assist visual assistant is currently offline.",
  },
  anvil: {
    name: "Anvil (AI Study Companion)",
    path: "anvil.kiruu.xyz",
    url: "https://anvil.kiruu.xyz",
    category: "AI Assistant",
    description: "Citation-grounded study companion with AI tutor, SRS flashcards, and quizzes",
    enabled: true,
    offlineType: "offline",
    message: "Anvil is temporarily offline.",
  },
  asksight: {
    name: "AskSight",
    path: "asksight.kiruu.xyz",
    url: "https://asksight.kiruu.xyz",
    category: "AI Assistant",
    description: "Mobile camera and voice visual assistant",
    enabled: true,
    offlineType: "offline",
    message: "AskSight is temporarily offline.",
  },
  anime: {
    name: "Anime Hub",
    path: "anime.kiruu.xyz",
    url: "https://anime.kiruu.xyz",
    category: "Media",
    description: "Anime portal, search catalog, and live watch parties",
    enabled: true,
    offlineType: "offline",
    message: "Anime portal is temporarily unavailable.",
  },
  movie: {
    name: "Movie Hub",
    path: "movie.kiruu.xyz",
    url: "https://movie.kiruu.xyz",
    category: "Media",
    description: "TMDB media portal, trailers & community watch rooms",
    enabled: true,
    offlineType: "offline",
    message: "Movie streaming portal is offline.",
  },
  chess: {
    name: "Java Chess (Web)",
    path: "chess.kiruu.xyz",
    url: "https://chess.kiruu.xyz",
    category: "Game",
    description: "Classic Java desktop chess game ported to the web via WebAssembly and CheerpJ",
    enabled: true,
    offlineType: "offline",
    message: "Chess game is temporarily unavailable.",
  },
  vibe: {
    name: "Vibe Video & Screen Share",
    path: "vibe.kiruu.xyz",
    url: "https://vibe.kiruu.xyz",
    category: "Media",
    description: "Peer-to-peer video calling and presentation room with passcode security",
    enabled: true,
    offlineType: "offline",
    message: "Vibe video calling is temporarily offline.",
  },
  dataset: {
    name: "Dataset Annotator",
    path: "dataset.kiruu.xyz",
    url: "https://dataset.kiruu.xyz",
    category: "Data Tool",
    description: "Parallel sentence annotation pipeline for Salitan Pangasinan",
    enabled: true,
    offlineType: "offline",
    message: "Dataset annotation portal is undergoing maintenance.",
  },
  validation: {
    name: "Validation Suite",
    path: "validation.kiruu.xyz",
    url: "https://validation.kiruu.xyz",
    category: "Quality",
    description: "Dataset quality verification & crowd validation suite",
    enabled: true,
    offlineType: "offline",
    message: "Validation tools are currently offline.",
  },
  bill: {
    name: "Utility Rates Tracker",
    path: "bill.kiruu.xyz",
    url: "https://bill.kiruu.xyz",
    category: "Finance",
    description: "Automated electricity rates and billing analytics",
    enabled: true,
    offlineType: "offline",
    message: "Utility rates service is temporarily unavailable.",
  },
  directory: {
    name: "Site Directory",
    path: "directory.kiruu.xyz",
    url: "https://directory.kiruu.xyz",
    category: "System Portal",
    description: "Central index of dataset, validation, forum, and letter applications",
    enabled: true,
    offlineType: "offline",
    message: "Site directory is temporarily offline.",
  },
  forum: {
    name: "Community Forum",
    path: "forum.kiruu.xyz",
    url: "https://forum.kiruu.xyz",
    category: "Social",
    description: "Team discussion board and shared announcements",
    enabled: true,
    offlineType: "offline",
    message: "Community forum is temporarily offline.",
  },
  faerie: {
    name: "Faerie Photobooth",
    path: "faerie.kiruu.xyz",
    url: "https://faerie.kiruu.xyz",
    category: "Media",
    description: "Interactive WebRTC photobooth and letter hub",
    enabled: true,
    offlineType: "offline",
    message: "Faerie photobooth is temporarily offline.",
  },
  letter: {
    name: "Kiruu Letter",
    path: "letter.kiruu.xyz",
    url: "https://letter.kiruu.xyz",
    category: "Social",
    description: "Pin-locked galaxy letter experience",
    enabled: true,
    offlineType: "offline",
    message: "Letter service is temporarily offline.",
  },
  letterx: {
    name: "Kiruu Letter X",
    path: "letterx.kiruu.xyz",
    url: "https://letterx.kiruu.xyz",
    category: "Social",
    description: "Picture-enabled galaxy letter experience",
    enabled: true,
    offlineType: "offline",
    message: "Letter X service is temporarily offline.",
  },
  letterhelper: {
    name: "Letter Helper",
    path: "letterhelper.kiruu.xyz",
    url: "https://letterhelper.kiruu.xyz",
    category: "Social",
    description: "Generator and publisher for pin-locked letters",
    enabled: true,
    offlineType: "offline",
    message: "Letter Helper is temporarily offline.",
  },
};

export function verifyAdminAuthorization(user, tokenResult = null) {
  if (!user) return false;
  const claims = (tokenResult && tokenResult.claims) || {};
  if (claims.admin === true) return true;
  const email = (user.email || "").toLowerCase().trim();
  if (user.emailVerified && ADMIN_EMAIL_ALLOWLIST.includes(email)) {
    return true;
  }
  return false;
}

export function normalizeSubdomainUrl(rawInput, key) {
  const cleanKey = String(key || "").toLowerCase().replace(/[^a-z0-9-]/g, "");
  const defaultUrl = cleanKey === "main" ? "https://kiruu.xyz" : `https://${cleanKey}.kiruu.xyz`;
  if (!rawInput || typeof rawInput !== "string") return defaultUrl;
  const trimmed = rawInput.trim();
  if (trimmed.startsWith("/")) {
    const seg = trimmed.replace(/^\/+|\/+$/g, "");
    if (!seg) return "https://kiruu.xyz";
    if (seg === "tawir-beta" || seg === "tawir-dev") return "https://tawir.kiruu.xyz/beta/";
    if (seg === "tawir-convo" || seg === "dashboard") return "https://console.kiruu.xyz";
    return `https://${seg}.kiruu.xyz`;
  }
  try {
    const parsed = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    if (parsed.protocol !== "https:") return defaultUrl;
    const host = parsed.hostname.toLowerCase();
    if (host === "kiruu.xyz" || host.endsWith(".kiruu.xyz")) {
      return parsed.toString().replace(/\/$/, parsed.pathname.length > 1 ? "/" : "");
    }
  } catch (_) {}
  return defaultUrl;
}

export function formatDisplayHost(urlStr, fallbackKey = "") {
  try {
    const parsed = new URL(urlStr);
    const cleanPath = parsed.pathname.replace(/\/+$/, "");
    return parsed.hostname + cleanPath;
  } catch {
    return fallbackKey ? `${fallbackKey}.kiruu.xyz` : "kiruu.xyz";
  }
}

export function mergeRemoteSublinks(remoteServices = {}) {
  const merged = { ...INITIAL_SUBLINKS };
  if (!remoteServices || typeof remoteServices !== "object") return merged;

  Object.entries(remoteServices).forEach(([rawKey, item]) => {
    if (!item || typeof item !== "object") return;
    // Consolidate legacy tawir-dev into tawir-beta and skip retired tawir-convo service card
    const key = rawKey === "tawir-dev" ? "tawir-beta" : rawKey;
    if (key === "tawir-convo" || key === "dashboard" || key === "console") return;

    const base = merged[key] || {};
    const url = base.url || normalizeSubdomainUrl(item.url || item.path, key);
    merged[key] = {
      ...base,
      name: String(item.name || base.name || key).slice(0, 80),
      enabled: item.enabled !== undefined ? Boolean(item.enabled) : (base.enabled ?? true),
      offlineType: item.offlineType === "forbidden" ? "forbidden" : "offline",
      message: String(item.message || item.maintenanceMessage || base.message || "Service temporarily offline.").slice(0, 280),
      maintenanceMessage: String(item.maintenanceMessage || item.message || base.message || "Service temporarily offline.").slice(0, 280),
      category: String(item.category || base.category || "Custom").slice(0, 40),
      url,
      path: base.path || formatDisplayHost(url, key),
      description: String(item.description || base.description || "").slice(0, 240),
      isDynamic: base.name ? false : Boolean(item.isDynamic ?? true),
    };
  });

  return merged;
}
