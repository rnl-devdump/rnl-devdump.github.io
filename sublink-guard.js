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

  function renderOfflineUI() {
    window.stop && window.stop();

    function inject() {
      document.title = "Service Offline | TheKiruu";
      
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
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          html, body {
            height: 100vh !important;
            width: 100vw !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            font-family: 'Vandelvira', sans-serif !important;
            color: #1A1A19 !important;
            overflow: hidden !important;
            position: relative !important;
            margin: 0 !important;
            padding: 0 !important;
            background: none !important;
          }
          #kiruu-bg-layer {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: linear-gradient(90deg, #e3ffe7 0%, #d9e7ff 40%, rgba(0, 0, 0, 0.5) 100%), url('/bg.jpg');
            background-size: cover;
            background-position: center;
            z-index: 0;
          }
          header.kiruu-header {
            position: absolute;
            top: 20px;
            left: 20px;
            z-index: 10;
          }
          .kiruu-logo {
            height: 20dvh;
            cursor: pointer;
            transition: transform 0.2s ease;
          }
          .kiruu-logo:hover {
            transform: scale(1.03);
          }
          main.kiruu-main {
            text-align: left;
            max-width: 650px;
            padding: 20px;
            position: relative;
            z-index: 10;
          }
          .kiruu-subtitle {
            font-size: 1.35rem;
            font-weight: 600;
            margin-bottom: 10px;
            color: #1A1A19;
            letter-spacing: 0.5px;
          }
          .kiruu-title {
            font-size: 4rem;
            font-weight: 700;
            line-height: 1;
            margin: 10px 0;
            color: #1A1A19;
          }
          .kiruu-notice {
            font-size: 1.4rem;
            font-weight: 600;
            margin: 20px 0 24px;
            color: #2a2a28;
            line-height: 1.35;
          }
          .button-rn {
            align-items: center;
            background-color: #fee6e3;
            border: 2px solid #111;
            border-radius: 8px;
            color: #111;
            cursor: pointer;
            display: inline-flex;
            font-family: 'Vandelvira', sans-serif;
            font-weight: 600;
            font-size: 17.6px;
            height: 48px;
            justify-content: center;
            padding: 0 32px;
            position: relative;
            text-decoration: none;
            box-shadow: none;
          }
          .button-rn:after {
            background-color: #111;
            border-radius: 8px;
            content: "";
            height: 48px;
            left: 0;
            width: 100%;
            position: absolute;
            top: -2px;
            transform: translate(8px, 8px);
            transition: transform .2s ease-out;
            z-index: -1;
          }
          .button-rn:hover:after {
            transform: translate(0, 0);
          }
          .button-rn:active {
            background-color: #ffdeda;
          }
          .kiruu-lottie {
            position: absolute;
            bottom: 20px;
            right: 20px;
            width: 250px;
            height: 250px;
            z-index: 10;
          }
          .kiruu-admin-links {
            margin-top: 24px;
            display: flex;
            align-items: center;
            gap: 16px;
          }
          .kiruu-admin-links a, .kiruu-admin-links button {
            font-family: 'Vandelvira', sans-serif;
            font-size: 14px;
            color: #444;
            background: none;
            border: none;
            cursor: pointer;
            text-decoration: underline;
          }
          .kiruu-admin-links button:hover, .kiruu-admin-links a:hover {
            color: #111;
          }
          @media (max-width: 768px) {
            .kiruu-logo {
              height: 14vh;
            }
            .kiruu-title {
              font-size: 2.85rem;
            }
            .kiruu-subtitle {
              font-size: 1.15rem;
            }
            .kiruu-notice {
              font-size: 1.15rem;
            }
            .kiruu-lottie {
              width: 160px;
              height: 160px;
              bottom: 10px;
              right: 10px;
            }
            .button-rn {
              width: 100%;
              padding: 0 15px;
            }
          }
        </style>

        <div id="kiruu-bg-layer"></div>

        <header class="kiruu-header">
          <img src="/logo.png" alt="logo" class="kiruu-logo" id="kiruu-logo-trigger" title="TheKiruu">
        </header>

        <main class="kiruu-main">
          <h3 class="kiruu-subtitle">We'll be right back!</h3>
          <h1 class="kiruu-title">Service</h1>
          <h1 class="kiruu-title">Offline</h1>
          <p class="kiruu-notice">This service is turned off! Please try again later.</p>
          <div>
            <a href="/" class="button-rn" role="button">
              Return to Homepage
            </a>
          </div>
          <div class="kiruu-admin-links">
            <a href="/dashboard/">Console Login</a>
            <button id="admin-bypass-trigger">Admin Unlock</button>
          </div>
        </main>

        <dotlottie-player
          src="https://lottie.host/08baa036-4ce6-4674-a6a1-3fdab92aa5c4/v73OLDfSlm.json"
          background="transparent"
          speed="1"
          class="kiruu-lottie"
          loop
          autoplay
        ></dotlottie-player>
      `;

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
      if (logoTrigger) logoTrigger.addEventListener("click", promptAdminBypass);
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
      renderOfflineUI();
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
        } catch (e) {}
        checkConfig(data);
      })
      .catch(() => {});
  }

  function fetchFirestoreFallback() {
    fetch(FIRESTORE_STATUS_URL, { cache: 'no-store' })
      .then(res => res.json())
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
      .catch(fetchStaticFallback);
  }

  // Attempt RTDB first, then Firestore, then sublinks.json
  fetch(RTDB_STATUS_URL, { cache: 'no-store' })
    .then(res => {
      if (!res.ok) throw new Error("RTDB unavailable");
      return res.json();
    })
    .then(rtdbItem => {
      if (rtdbItem && typeof rtdbItem.enabled === "boolean") {
        if (rtdbItem.enabled === false) {
          renderOfflineUI();
        }
      } else {
        fetchFirestoreFallback();
      }
    })
    .catch(fetchFirestoreFallback);
})();

