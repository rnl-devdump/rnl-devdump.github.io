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

    function inject() {
      document.title = "Service Offline | TheKiruu";
      
      // Ensure viewport meta tag exists for proper mobile scaling
      if (!document.querySelector('meta[name="viewport"]')) {
        const meta = document.createElement('meta');
        meta.name = 'viewport';
        meta.content = 'width=device-width, initial-scale=1.0';
        document.head.appendChild(meta);
      }

      // Inject DotLottie module if not already loaded
      if (!document.querySelector('script[src*="dotlottie"]')) {
        const script = document.createElement('script');
        script.type = 'module';
        script.src = 'https://unpkg.com/@dotlottie/player-component@2.7.12/dist/dotlottie-player.mjs';
        document.head.appendChild(script);
      }

      document.body.innerHTML = `
        <style>
          @font-face {
            font-family: 'Vandelvira';
            src: url('/fonts/Vandelvira-Regular.ttf') format('truetype');
            font-weight: normal;
            font-style: normal;
            font-display: swap;
          }

          *, *::before, *::after {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          html, body {
            width: 100%;
            min-height: 100vh;
            min-height: 100dvh;
            font-family: 'Vandelvira', Georgia, -apple-system, sans-serif;
            color: #1A1A19;
            background-color: #dceef9;
            overflow-x: hidden;
            overflow-y: auto;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            margin: 0;
            padding: 0;
          }

          #kiruu-bg-layer {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, #e3ffe7 0%, #d9e7ff 45%, rgba(0, 0, 0, 0.45) 100%), url('/bg.jpg');
            background-size: cover;
            background-position: center;
            z-index: 0;
            pointer-events: none;
          }

          .kiruu-viewport-container {
            position: relative;
            z-index: 10;
            width: 100%;
            min-height: 100vh;
            min-height: 100dvh;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            padding: clamp(20px, 4vw, 40px);
            box-sizing: border-box;
          }

          header.kiruu-header {
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: flex-start;
            margin-bottom: 20px;
            z-index: 10;
          }

          .kiruu-logo {
            height: clamp(52px, 8vw, 84px);
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
            max-width: 650px;
            margin: auto 0;
            padding: clamp(12px, 2.5vw, 24px) 0;
            text-align: left;
            position: relative;
            z-index: 10;
          }

          .kiruu-subtitle {
            font-size: clamp(1.15rem, 2.4vw, 1.35rem);
            font-weight: 600;
            margin-bottom: 8px;
            color: #1A1A19;
            letter-spacing: 0.5px;
          }

          .kiruu-title {
            font-size: clamp(2.6rem, 7vw, 4.25rem);
            font-weight: 700;
            line-height: 1.05;
            margin: 8px 0 16px 0;
            color: #1A1A19;
            letter-spacing: -0.01em;
            display: flex;
            flex-direction: column;
          }

          .kiruu-title-line {
            display: block;
          }

          .kiruu-notice {
            font-size: clamp(1.05rem, 2.3vw, 1.35rem);
            font-weight: 600;
            margin: 0 0 clamp(24px, 4vw, 32px) 0;
            color: #2a2a28;
            line-height: 1.45;
            max-width: 580px;
            word-break: break-word;
          }

          .kiruu-actions-wrap {
            display: flex;
            align-items: center;
            gap: 16px;
            flex-wrap: wrap;
          }

          .button-rn {
            align-items: center;
            background-color: #fee6e3;
            border: 2px solid #111;
            border-radius: 10px;
            color: #111;
            cursor: pointer;
            display: inline-flex;
            font-family: 'Vandelvira', Georgia, serif;
            font-weight: 700;
            font-size: clamp(15.5px, 2.2vw, 17.5px);
            min-height: 48px;
            height: 48px;
            justify-content: center;
            padding: 0 clamp(22px, 3.5vw, 32px);
            position: relative;
            text-decoration: none;
            box-shadow: 4px 4px 0 #111;
            transition: transform 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
            white-space: nowrap;
            user-select: none;
            -webkit-tap-highlight-color: transparent;
            box-sizing: border-box;
          }

          .button-rn:hover {
            transform: translate(-2px, -2px);
            box-shadow: 6px 6px 0 #111;
            background-color: #ffdeda;
          }

          .button-rn:active {
            transform: translate(2px, 2px);
            box-shadow: 2px 2px 0 #111;
            background-color: #ffd2cc;
          }

          .button-rn:focus-visible {
            outline: 3px solid #111;
            outline-offset: 3px;
          }

          .kiruu-admin-links {
            margin-top: clamp(20px, 3.5vw, 28px);
            display: flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
          }

          .kiruu-admin-links a, 
          .kiruu-admin-links button {
            font-family: 'Vandelvira', Georgia, serif;
            font-size: 15px;
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
            transition: color 0.15s ease;
            -webkit-tap-highlight-color: transparent;
          }

          .kiruu-admin-links a:hover, 
          .kiruu-admin-links button:hover {
            color: #111;
          }

          .kiruu-admin-links a:focus-visible, 
          .kiruu-admin-links button:focus-visible {
            outline: 2px solid #111;
            outline-offset: 2px;
          }

          .kiruu-admin-divider {
            color: #9ca3af;
            font-size: 14px;
            user-select: none;
            padding: 0 4px;
          }

          .kiruu-lottie-wrap {
            position: fixed;
            bottom: clamp(20px, 3.5vw, 36px);
            right: clamp(20px, 3.5vw, 36px);
            width: clamp(200px, 22vw, 270px);
            height: clamp(200px, 22vw, 270px);
            z-index: 5;
            pointer-events: none;
          }

          .kiruu-lottie {
            width: 100%;
            height: 100%;
          }

          @media (max-width: 768px) {
            #kiruu-bg-layer {
              background: linear-gradient(180deg, rgba(227, 255, 231, 0.94) 0%, rgba(217, 231, 255, 0.94) 50%, rgba(240, 245, 255, 0.92) 100%), url('/bg.jpg');
              background-size: cover;
            }

            .kiruu-viewport-container {
              padding: clamp(16px, 4vw, 24px) clamp(14px, 4vw, 20px);
              justify-content: flex-start;
              min-height: 100vh;
              min-height: 100dvh;
            }

            header.kiruu-header {
              margin-bottom: 12px;
            }

            .kiruu-logo {
              height: 48px;
            }

            main.kiruu-main {
              max-width: 100%;
              margin: 0;
              padding: 4px 0 16px 0;
            }

            .kiruu-lottie-wrap {
              position: static;
              width: clamp(120px, 32vw, 150px);
              height: clamp(120px, 32vw, 150px);
              margin: 0 0 14px 0;
              align-self: flex-start;
            }

            .button-rn {
              width: 100%;
              max-width: 340px;
            }

            .kiruu-admin-links {
              justify-content: flex-start;
              margin-top: 20px;
            }
          }

          @media (max-width: 380px) {
            .kiruu-viewport-container {
              padding: 16px 12px 20px 12px;
            }

            .kiruu-logo {
              height: 42px;
            }

            .kiruu-lottie-wrap {
              width: 110px;
              height: 110px;
              margin-bottom: 10px;
            }

            .kiruu-title {
              font-size: 2.2rem;
            }

            .kiruu-notice {
              font-size: 1rem;
              margin-bottom: 20px;
            }

            .button-rn {
              font-size: 15px;
              min-height: 46px;
              height: 46px;
              width: 100%;
            }
          }

          @media (max-height: 500px) and (orientation: landscape) {
            .kiruu-viewport-container {
              padding: 14px 20px;
            }

            header.kiruu-header {
              margin-bottom: 8px;
            }

            .kiruu-logo {
              height: 38px;
            }

            .kiruu-lottie-wrap {
              display: none;
            }

            .kiruu-title {
              font-size: 2rem;
              margin: 4px 0 8px 0;
            }

            .kiruu-notice {
              font-size: 0.95rem;
              margin-bottom: 14px;
            }

            .button-rn {
              width: auto;
              min-height: 44px;
              height: 44px;
            }
          }
        </style>

        <div id="kiruu-bg-layer" aria-hidden="true"></div>

        <div class="kiruu-viewport-container">
          <header class="kiruu-header">
            <img src="/logo.png" alt="The Kiruu" class="kiruu-logo" id="kiruu-logo-trigger" role="button" tabindex="0" title="TheKiruu" aria-label="The Kiruu logo">
          </header>

          <main class="kiruu-main">
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

            <p class="kiruu-subtitle">We'll be right back!</p>
            <h1 class="kiruu-title">
              <span class="kiruu-title-line">Service</span>
              <span class="kiruu-title-line">Offline</span>
            </h1>
            <p class="kiruu-notice" id="kiruu-notice-text"></p>

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
          </main>
        </div>
      `;

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

