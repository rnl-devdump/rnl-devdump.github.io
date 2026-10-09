(function() {
  const currentPath = window.location.pathname.replace(/^\/|\/$/g, '');
  const slug = currentPath.split('/')[0];

  // Whitelist: never block the root homepage or the dashboard itself
  if (!slug || slug === 'dashboard' || slug === 'index.html') {
    return;
  }

  const SALT = "kiruu_console_guard_salt_2026_x89a";
  const HASH = "78c2a001ef868e6e51e2aa5015eb6e88efe412744a62f027ebe1663853acb67f";

  // Check admin session bypass
  if (sessionStorage.getItem('kiruu_console_bypass') === 'true' || sessionStorage.getItem('kiruu_console_session') === 'active') {
    return;
  }

  function renderOfflineUI(customNotice) {
    window.stop && window.stop();

    // 1. Immediately neutralize Flutter Web bootstrap, service worker, and engine loader
    try {
      window._flutter = {
        loader: {
          load: function() { return new Promise(function() {}); },
          loadEntrypoint: function() { return new Promise(function() {}); },
          didCreateEngineInitializer: function() {}
        },
        buildConfig: null
      };
      Object.defineProperty(window, '_flutter', {
        configurable: false,
        writable: false,
        value: window._flutter
      });
    } catch (e) {}

    // 2. Remove base tag to avoid corrupting asset URL paths
    try {
      const baseEl = document.querySelector('base');
      if (baseEl) baseEl.remove();
    } catch (e) {}

    function inject() {
      document.title = "Service Offline | TheKiruu";
      
      // Ensure viewport meta tag exists for proper mobile scaling
      if (!document.querySelector('meta[name="viewport"]')) {
        const meta = document.createElement('meta');
        meta.name = 'viewport';
        meta.content = 'width=device-width, initial-scale=1.0';
        document.head.appendChild(meta);
      }

      // Neutralize conflicting styles and scripts from host application
      try {
        document.querySelectorAll('style:not(#kiruu-guard-styles), link[rel="stylesheet"]').forEach(el => el.remove());
        document.querySelectorAll('script:not([src*="dotlottie"]):not([src*="sublink-guard"])').forEach(s => {
          s.type = 'text/plain';
          s.remove();
        });
      } catch (e) {}

      // Inject DotLottie module if not already loaded
      if (!document.querySelector('script[src*="dotlottie"]')) {
        const script = document.createElement('script');
        script.type = 'module';
        script.src = 'https://unpkg.com/@dotlottie/player-component@2.7.12/dist/dotlottie-player.mjs';
        document.head.appendChild(script);
      }

      const origin = window.location.origin;
      const logoUrl = origin + '/logo.png';
      const bgUrl = origin + '/bg.jpg';
      const fontUrl = origin + '/fonts/Vandelvira-Regular.ttf';

      // Enforce host background reset
      try {
        document.documentElement.style.cssText = "background-color: #dceef9 !important; background: #dceef9 !important; margin: 0 !important; padding: 0 !important; width: 100% !important; height: 100% !important; overflow: hidden !important;";
        document.body.style.cssText = "background-color: #dceef9 !important; background: #dceef9 !important; margin: 0 !important; padding: 0 !important; width: 100% !important; height: 100% !important; overflow: hidden !important;";
      } catch (e) {}

      document.body.innerHTML = `
        <style id="kiruu-guard-styles">
          @font-face {
            font-family: 'Vandelvira';
            src: url('${fontUrl}') format('truetype');
            font-weight: normal;
            font-style: normal;
            font-display: swap;
          }

          :root {
            --font-display: 'Vandelvira', Georgia, serif;
            --font-ui: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            --color-ink: #111827;
            --color-subtext: #475569;
            --color-bg-base: #dceef9;
            --color-peach: #fee6e3;
            --color-peach-hover: #ffdeda;
            --color-border: #111111;
          }

          *, *::before, *::after {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          #kiruu-offline-root {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            height: 100dvh !important;
            background-color: var(--color-bg-base) !important;
            color: var(--color-ink) !important;
            font-family: var(--font-ui) !important;
            overflow-x: hidden !important;
            overflow-y: auto !important;
            -webkit-overflow-scrolling: touch !important;
            z-index: 2147483647 !important;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }

          #kiruu-bg-layer {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, #e3ffe7 0%, #d9e7ff 45%, rgba(0, 0, 0, 0.42) 100%), url('${bgUrl}');
            background-size: cover;
            background-position: center;
            z-index: 0;
            pointer-events: none;
          }

          .kiruu-viewport-container {
            position: relative;
            z-index: 10;
            width: 100%;
            max-width: 1180px;
            margin: 0 auto;
            min-height: 100vh;
            min-height: 100dvh;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            padding: clamp(20px, 4vw, 44px) clamp(16px, 4vw, 36px);
            box-sizing: border-box;
          }

          header.kiruu-header {
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: flex-start;
            margin-bottom: clamp(16px, 3vw, 28px);
            z-index: 10;
          }

          .kiruu-logo {
            height: clamp(48px, 7vw, 76px);
            width: auto;
            max-width: 220px;
            object-fit: contain;
            cursor: pointer;
            transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
            filter: drop-shadow(2px 2px 0px rgba(0, 0, 0, 0.15));
            border-radius: 8px;
          }

          .kiruu-logo:hover {
            transform: scale(1.04) rotate(-1deg);
          }

          .kiruu-logo:focus-visible {
            outline: 3px solid #111;
            outline-offset: 4px;
          }

          main.kiruu-main {
            width: 100%;
            margin: auto 0;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: clamp(32px, 5vw, 64px);
            padding: clamp(12px, 2.5vw, 24px) 0;
            position: relative;
            z-index: 10;
          }

          .kiruu-content-col {
            flex: 1 1 540px;
            max-width: 620px;
            text-align: left;
          }

          .kiruu-status-chip {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 5px 14px;
            background-color: var(--color-peach);
            border: 2px solid var(--color-border);
            border-radius: 20px;
            font-family: var(--font-ui);
            font-size: 13px;
            font-weight: 700;
            color: #111;
            box-shadow: 2.5px 2.5px 0 var(--color-border);
            margin-bottom: 12px;
            user-select: none;
          }

          .kiruu-status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background-color: #e11d48;
            border: 1px solid #9f1239;
            display: inline-block;
          }

          .kiruu-subtitle {
            font-family: var(--font-display);
            font-size: clamp(1.15rem, 2.2vw, 1.35rem);
            font-weight: 600;
            margin-bottom: 6px;
            color: #334155;
            letter-spacing: -0.01em;
          }

          .kiruu-title {
            font-family: var(--font-display);
            font-size: clamp(2.5rem, 6.5vw, 4.25rem);
            font-weight: 700;
            line-height: 1.05;
            margin: 6px 0 16px 0;
            color: var(--color-ink);
            letter-spacing: -0.02em;
            display: flex;
            flex-direction: column;
          }

          .kiruu-title-line {
            display: block;
          }

          .kiruu-notice-box {
            background: rgba(255, 255, 255, 0.72);
            backdrop-filter: blur(8px);
            border: 2px solid var(--color-border);
            border-radius: 12px;
            box-shadow: 3.5px 3.5px 0 var(--color-border);
            padding: clamp(12px, 2vw, 16px) clamp(14px, 2.5vw, 20px);
            margin-bottom: clamp(20px, 3.5vw, 28px);
            max-width: 540px;
          }

          .kiruu-notice {
            font-family: var(--font-ui);
            font-size: clamp(0.95rem, 1.8vw, 1.15rem);
            font-weight: 500;
            color: #1f2937;
            line-height: 1.5;
            word-break: break-word;
            margin: 0;
          }

          .kiruu-actions-wrap {
            display: flex;
            align-items: center;
            gap: 16px;
            flex-wrap: wrap;
            margin-bottom: clamp(16px, 2.5vw, 22px);
          }

          .button-rn {
            align-items: center;
            background-color: var(--color-peach);
            border: 2px solid var(--color-border);
            border-radius: 10px;
            color: #111;
            cursor: pointer;
            display: inline-flex;
            font-family: var(--font-display);
            font-weight: 700;
            font-size: clamp(15px, 2vw, 17px);
            min-height: 48px;
            height: 48px;
            justify-content: center;
            padding: 0 clamp(20px, 3vw, 28px);
            position: relative;
            text-decoration: none;
            box-shadow: 4px 4px 0 var(--color-border);
            transition: transform 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
            white-space: nowrap;
            user-select: none;
            -webkit-tap-highlight-color: transparent;
            box-sizing: border-box;
          }

          .button-rn:hover {
            transform: translate(-2px, -2px);
            box-shadow: 6px 6px 0 var(--color-border);
            background-color: var(--color-peach-hover);
          }

          .button-rn:active {
            transform: translate(2px, 2px);
            box-shadow: 2px 2px 0 var(--color-border);
            background-color: #ffd2cc;
          }

          .button-rn:focus-visible {
            outline: 3px solid var(--color-border);
            outline-offset: 3px;
          }

          .kiruu-admin-links {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
          }

          .kiruu-admin-links a, 
          .kiruu-admin-links button {
            font-family: var(--font-ui);
            font-size: 14px;
            font-weight: 600;
            color: #374151;
            background: none;
            border: none;
            cursor: pointer;
            text-decoration: underline;
            text-underline-offset: 3px;
            min-height: 44px;
            min-width: 44px;
            display: inline-flex;
            align-items: center;
            padding: 6px 8px;
            border-radius: 6px;
            transition: color 0.15s ease, background-color 0.15s ease;
            -webkit-tap-highlight-color: transparent;
          }

          .kiruu-admin-links a:hover, 
          .kiruu-admin-links button:hover {
            color: #111;
            background-color: rgba(255, 255, 255, 0.45);
          }

          .kiruu-admin-links a:focus-visible, 
          .kiruu-admin-links button:focus-visible {
            outline: 2px solid var(--color-border);
            outline-offset: 2px;
          }

          .kiruu-admin-divider {
            color: #9ca3af;
            font-size: 14px;
            user-select: none;
            padding: 0 4px;
          }

          .kiruu-visual-col {
            flex: 0 1 420px;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .kiruu-lottie-wrap {
            width: clamp(240px, 28vw, 360px);
            height: clamp(240px, 28vw, 360px);
            display: flex;
            align-items: center;
            justify-content: center;
            filter: drop-shadow(4px 4px 0 rgba(17, 17, 17, 0.12));
          }

          .kiruu-lottie {
            width: 100%;
            height: 100%;
          }

          /* Reflow for Tablet & Mobile portrait */
          @media (max-width: 860px) {
            #kiruu-bg-layer {
              background: linear-gradient(180deg, rgba(227, 255, 231, 0.94) 0%, rgba(217, 231, 255, 0.94) 50%, rgba(240, 245, 255, 0.92) 100%), url('${bgUrl}');
              background-size: cover;
            }

            .kiruu-viewport-container {
              padding: clamp(16px, 4vw, 24px) clamp(14px, 4vw, 20px);
              justify-content: flex-start;
            }

            header.kiruu-header {
              justify-content: center;
              margin-bottom: 8px;
            }

            .kiruu-logo {
              height: clamp(44px, 10vw, 56px);
            }

            main.kiruu-main {
              flex-direction: column-reverse;
              align-items: center;
              text-align: center;
              gap: 16px;
              margin: auto 0;
              padding: 8px 0 16px 0;
            }

            .kiruu-content-col {
              max-width: 100%;
              width: 100%;
              display: flex;
              flex-direction: column;
              align-items: center;
              text-align: center;
            }

            .kiruu-status-chip {
              margin-bottom: 8px;
            }

            .kiruu-subtitle {
              text-align: center;
              margin-bottom: 4px;
            }

            .kiruu-title {
              align-items: center;
              text-align: center;
              margin: 4px 0 12px 0;
            }

            .kiruu-notice-box {
              width: 100%;
              max-width: 460px;
              margin-left: auto;
              margin-right: auto;
              margin-bottom: 18px;
              text-align: center;
            }

            .kiruu-visual-col {
              flex: 0 0 auto;
              width: 100%;
              justify-content: center;
            }

            .kiruu-lottie-wrap {
              width: clamp(130px, 34vw, 175px);
              height: clamp(130px, 34vw, 175px);
            }

            .kiruu-actions-wrap {
              width: 100%;
              justify-content: center;
              margin-bottom: 16px;
            }

            .button-rn {
              width: 100%;
              max-width: 340px;
            }

            .kiruu-admin-links {
              justify-content: center;
            }
          }

          /* Small mobile adjustments */
          @media (max-width: 380px) {
            .kiruu-viewport-container {
              padding: 14px 12px 18px 12px;
            }

            .kiruu-logo {
              height: 42px;
            }

            .kiruu-lottie-wrap {
              width: 120px;
              height: 120px;
            }

            .kiruu-title {
              font-size: 2.15rem;
            }

            .kiruu-notice {
              font-size: 0.95rem;
            }

            .button-rn {
              font-size: 15px;
              min-height: 46px;
              height: 46px;
              width: 100%;
            }
          }

          /* Landscape mobile adjustments */
          @media (max-height: 520px) and (orientation: landscape) {
            .kiruu-viewport-container {
              padding: 12px 20px;
            }

            header.kiruu-header {
              margin-bottom: 6px;
              justify-content: flex-start;
            }

            .kiruu-logo {
              height: 36px;
            }

            main.kiruu-main {
              flex-direction: row;
              align-items: center;
              justify-content: space-between;
              gap: 20px;
              margin: auto 0;
              padding: 2px 0;
              text-align: left;
            }

            .kiruu-content-col {
              align-items: flex-start;
              text-align: left;
              max-width: 60%;
            }

            .kiruu-status-chip {
              display: none;
            }

            .kiruu-subtitle {
              text-align: left;
              font-size: 1rem;
              margin-bottom: 2px;
            }

            .kiruu-title {
              align-items: flex-start;
              text-align: left;
              font-size: 1.85rem;
              margin: 2px 0 6px 0;
            }

            .kiruu-notice-box {
              margin-left: 0;
              margin-right: 0;
              margin-bottom: 8px;
              padding: 6px 10px;
              max-width: 100%;
              text-align: left;
            }

            .kiruu-notice {
              font-size: 0.85rem;
            }

            .kiruu-actions-wrap {
              justify-content: flex-start;
              margin-bottom: 6px;
            }

            .button-rn {
              width: auto;
              min-height: 42px;
              height: 42px;
              font-size: 14px;
              padding: 0 16px;
            }

            .kiruu-admin-links {
              justify-content: flex-start;
            }

            .kiruu-visual-col {
              max-width: 35%;
            }

            .kiruu-lottie-wrap {
              width: 120px;
              height: 120px;
            }
          }
        </style>

        <div id="kiruu-offline-root">
          <div id="kiruu-bg-layer" aria-hidden="true"></div>

          <div class="kiruu-viewport-container">
            <header class="kiruu-header">
              <img src="${logoUrl}" alt="The Kiruu" class="kiruu-logo" id="kiruu-logo-trigger" role="button" tabindex="0" title="TheKiruu" aria-label="The Kiruu logo">
            </header>

            <main class="kiruu-main">
              <div class="kiruu-content-col">
                <div class="kiruu-status-chip" role="status" aria-live="polite">
                  <span class="kiruu-status-dot" aria-hidden="true"></span>
                  <span>Service Offline</span>
                </div>

                <p class="kiruu-subtitle">We'll be right back!</p>
                <h1 class="kiruu-title">
                  <span class="kiruu-title-line">Service</span>
                  <span class="kiruu-title-line">Offline</span>
                </h1>

                <div class="kiruu-notice-box">
                  <p class="kiruu-notice" id="kiruu-notice-text"></p>
                </div>

                <div class="kiruu-actions-wrap">
                  <a href="/" class="button-rn" role="button">
                    Return to Homepage
                  </a>
                </div>

                <div class="kiruu-admin-links">
                  <a href="/dashboard/">Console Login</a>
                  <span class="kiruu-admin-divider" aria-hidden="true">•</span>
                  <button id="admin-bypass-trigger" type="button">Admin Unlock</button>
                </div>
              </div>

              <div class="kiruu-visual-col">
                <div class="kiruu-lottie-wrap">
                  <dotlottie-player
                    src="https://lottie.host/08baa036-4ce6-4674-a6a1-3fdab92aa5c4/v73OLDfSlm.json"
                    background="transparent"
                    speed="1"
                    class="kiruu-lottie"
                    loop
                    autoplay
                    aria-label="Maintenance in progress animation"
                  ></dotlottie-player>
                </div>
              </div>
            </main>
          </div>
        </div>
      `;

      // Prevent host frameworks from dynamically appending canvas, views, or foreign DOM nodes
      try {
        const observer = new MutationObserver((mutations) => {
          for (const m of mutations) {
            for (const node of m.addedNodes) {
              if (node.nodeType === 1 && node.id !== 'kiruu-offline-root' && !node.closest('#kiruu-offline-root') && node.tagName !== 'SCRIPT' && node.tagName !== 'STYLE') {
                node.remove();
              }
            }
          }
        });
        observer.observe(document.body, { childList: true });
        observer.observe(document.documentElement, { childList: true });
      } catch (e) {}

      const noticeEl = document.getElementById("kiruu-notice-text");
      if (noticeEl) {
        noticeEl.textContent = customNotice || "This service is turned off! Please try again later.";
      }

      async function promptAdminBypass() {
        const pwd = prompt("Enter KIRUUCONSOLE Password to unlock this service:");
        if (!pwd) return;

        try {
          const enc = new TextEncoder();
          const data = enc.encode(SALT + ":" + pwd.trim());
          const buf = await crypto.subtle.digest("SHA-256", data);
          const hex = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");

          if (hex === HASH) {
            sessionStorage.setItem('kiruu_console_bypass', 'true');
            alert("Admin authenticated. Service unlocked for this session.");
            window.location.reload();
          } else {
            alert("Incorrect password.");
          }
        } catch(e) {
          alert("Verification error: " + e.message);
        }
      }

      const bypassBtn = document.getElementById("admin-bypass-trigger");
      if (bypassBtn) bypassBtn.addEventListener("click", promptAdminBypass);

      const logoTrigger = document.getElementById("kiruu-logo-trigger");
      if (logoTrigger) {
        logoTrigger.addEventListener("click", promptAdminBypass);
        logoTrigger.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            promptAdminBypass();
          }
        });
      }
    }

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", inject);
    } else {
      inject();
    }
  }

  function checkConfig(config) {
    if (!config) return;

    const isMasterOff = config.masterSwitch === false;
    const sublinkConfig = (config.services && config.services[slug]) || (config.sublinks && config.sublinks[slug]);

    if (isMasterOff || (sublinkConfig && sublinkConfig.enabled === false)) {
      const notice = sublinkConfig
        ? (sublinkConfig.maintenanceMessage || sublinkConfig.message)
        : (config.maintenanceMessage || "All services are currently undergoing maintenance.");
      renderOfflineUI(notice);
    }
  }

  try {
    const cached = localStorage.getItem('kiruu_services_status') || localStorage.getItem('kiruu_sublinks_status');
    if (cached) {
      checkConfig(JSON.parse(cached));
    }
  } catch (e) {}

  const RTDB_STATUS_URL = window.__KIRUU_RTDB_URL__
    ? `${window.__KIRUU_RTDB_URL__}/services/${slug}.json`
    : `https://pangasinan-dataset-default-rtdb.firebaseio.com/services/${slug}.json`;
  const FIRESTORE_STATUS_URL = 'https://firestore.googleapis.com/v1/projects/pangasinan-dataset/databases/(default)/documents/validations/system_status?key=AIzaSyBPtK3e9etXMIxmbZB0sAKd4Rluf-ahB4c';

  function fetchStaticFallback() {
    fetch('/sublinks.json?t=' + Date.now(), { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        try {
          localStorage.setItem('kiruu_sublinks_status', JSON.stringify(data));
          localStorage.setItem('kiruu_services_status', JSON.stringify(data));
        } catch (e) {}
        checkConfig(data);
      })
      .catch(() => {});
  }

  // Direct Cloud Firestore check (live source of truth across all devices)
  fetch(FIRESTORE_STATUS_URL, { cache: 'no-store' })
    .then(res => {
      if (!res.ok) throw new Error("Firestore fetch failed: " + res.status);
      return res.json();
    })
    .then(doc => {
      if (doc && doc.fields && doc.fields.configJson && doc.fields.configJson.stringValue) {
        const cloudData = JSON.parse(doc.fields.configJson.stringValue);
        try {
          localStorage.setItem('kiruu_services_status', JSON.stringify(cloudData));
          localStorage.setItem('kiruu_sublinks_status', JSON.stringify(cloudData));
        } catch (e) {}
        checkConfig(cloudData);
      } else {
        fetchStaticFallback();
      }
    })
    .catch(() => {
      // Secondary check: RTDB if configured, or static sublinks.json fallback
      fetch(RTDB_STATUS_URL, { cache: 'no-store' })
        .then(res => res.ok ? res.json() : null)
        .then(rtdbItem => {
          if (rtdbItem && typeof rtdbItem.enabled === "boolean") {
            if (rtdbItem.enabled === false) {
              renderOfflineUI(rtdbItem.maintenanceMessage || rtdbItem.message);
            }
          } else {
            fetchStaticFallback();
          }
        })
        .catch(fetchStaticFallback);
    });
})();

