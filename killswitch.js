/**
 * Universal Client Drop-In Feature Flag & Service Status Gate (killswitch.js)
 *
 * Delegates to the unified host-aware sublink-guard.js status engine.
 * Note: Client-side feature flags provide maintenance/status UI only and are
 * not a substitute for server-side authentication or authorization.
 */
(function loadUnifiedGuard() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (document.querySelector('script[src*="sublink-guard.js"]')) return;
  const s = document.createElement("script");
  s.src = "/sublink-guard.js";
  (document.head || document.documentElement).appendChild(s);
})();
