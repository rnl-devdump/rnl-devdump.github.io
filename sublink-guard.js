(function() {
  const currentPath = window.location.pathname.replace(/^\/|\/$/g, '');
  const rawSlug = currentPath.split('/')[0];

  // Whitelist: never block the dashboard itself under any circumstances
  if (rawSlug === 'dashboard') {
    return;
  }

  // When visiting root portal ("" or "index.html"), target "main" service
  const slug = (!rawSlug || rawSlug === 'index.html') ? 'main' : rawSlug;

  // Check admin session bypass
  if (sessionStorage.getItem('kiruu_console_bypass') === 'true' || sessionStorage.getItem('kiruu_console_session') === 'active') {
    return;
  }

  function renderOfflineUI(customNotice, mode = 'offline') {
    const isForbidden = mode === 'forbidden';

    // 1. Neutralize Flutter Web bootstrap, service worker, and engine loader
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

    // 2. Remove base tag to avoid corrupting asset paths
    try {
      const baseEl = document.querySelector('base');
      if (baseEl) baseEl.remove();
    } catch (e) {}

    function inject() {
      if (document.getElementById("kiruu-offline-root")) {
        const noticeEl = document.getElementById("kiruu-notice-text");
        if (noticeEl && customNotice) {
          noticeEl.textContent = customNotice;
        }
        return;
      }

      document.title = isForbidden ? "Access Forbidden | TheKiruu" : "TheKiruu";
      
      if (!document.querySelector('meta[name="viewport"]')) {
        const meta = document.createElement('meta');
        meta.name = 'viewport';
        meta.content = 'width=device-width, initial-scale=1.0';
        document.head.appendChild(meta);
      }

      // Neutralize conflicting styles and scripts
      try {
        document.querySelectorAll('style:not(#kiruu-guard-styles), link[rel="stylesheet"]').forEach(el => el.remove());
        document.querySelectorAll('script:not([src*="sublink-guard"])').forEach(s => {
          s.type = 'text/plain';
          s.remove();
        });
      } catch (e) {}

      const origin = window.location.origin;
      const fontUrl = origin + '/fonts/Vandelvira-Regular.ttf';
      const videoUrl = origin + '/maintenance.mp4';
      const bgFallback = origin + '/bg.jpg';

      try {
        document.documentElement.style.cssText = "margin: 0 !important; padding: 0 !important; width: 100% !important; height: 100% !important; overflow: hidden !important; background: #060d19 !important;";
        document.body.style.cssText = "margin: 0 !important; padding: 0 !important; width: 100% !important; height: 100% !important; overflow: hidden !important; background: #060d19 !important;";
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
            --bg: #060d19;
            --invert: 1;
            --glow-a: rgba(56, 189, 248, 0.85);
            --glow-b: rgba(14, 165, 233, 0.55);
            --halo: 56, 189, 248;
            --flare: rgba(125, 211, 252, 0.95);
            --shine-edge: rgba(56, 189, 248, 0.8);
            --shine-core: rgba(255, 255, 255, 0.98);
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
            background-color: #060d19 !important;
            color: #f1f5f9 !important;
            font-family: var(--font-ui) !important;
            overflow-x: hidden !important;
            overflow-y: auto !important;
            -webkit-overflow-scrolling: touch !important;
            z-index: 2147483647 !important;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
          }

          /* Hardware-accelerated background video */
          #kiruu-bg-video {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            height: 100dvh;
            object-fit: cover;
            z-index: 0;
            pointer-events: none;
            opacity: 0.85;
            transform: translateZ(0);
            will-change: opacity;
            transition: opacity 0.4s ease;
          }

          /* Dark Blueish Hue Overlay - No backdrop-filter to prevent GPU lag */
          #kiruu-bg-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: ${isForbidden
              ? 'linear-gradient(180deg, rgba(30, 8, 12, 0.82) 0%, rgba(20, 4, 8, 0.92) 50%, rgba(10, 2, 4, 0.98) 100%)'
              : 'linear-gradient(180deg, rgba(6, 18, 38, 0.78) 0%, rgba(3, 11, 24, 0.88) 50%, rgba(2, 6, 15, 0.96) 100%)'};
            z-index: 1;
            pointer-events: none;
            transform: translateZ(0);
          }

          .kiruu-viewport-container {
            position: relative;
            z-index: 10;
            width: 100%;
            max-width: 860px;
            margin: 0 auto;
            min-height: 100vh;
            min-height: 100dvh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: clamp(20px, 4vw, 40px) clamp(16px, 4vw, 32px);
            text-align: center;
            box-sizing: border-box;
            transform: translateZ(0);
          }

          /* Pure visual animated stage - zero cursor or click action */
          .stage {
            position: relative;
            width: min(84vw, 680px);
            aspect-ratio: 863 / 282;
            margin: 0 auto clamp(16px, 3.5vh, 28px) auto;
            user-select: none;
            pointer-events: none;
            transform: translateZ(0);
          }

          .logo {
            position: absolute;
            inset: 0;
            filter: drop-shadow(0 0 6px var(--glow-a)) drop-shadow(0 0 18px var(--glow-b));
            transform: translateZ(0);
          }

          .logo img {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            filter: invert(var(--invert));
            will-change: transform, opacity, clip-path;
          }

          .star {
            position: absolute;
            inset: 0;
            transform-origin: 50.41% 17.38%;
            will-change: transform, opacity;
          }

          .shine {
            position: absolute;
            inset: 0;
            -webkit-mask-size: 100% 100%;
            mask-size: 100% 100%;
            background: linear-gradient(105deg, transparent 30%, var(--shine-edge) 44%, var(--shine-core) 50%, var(--shine-edge) 56%, transparent 70%);
            background-size: 300% 100%;
            background-position: 100% 0;
            will-change: background-position;
          }

          .halo, .flare {
            position: absolute;
            left: 50.41%;
            top: 17.38%;
            translate: -50% -50%;
            opacity: 0;
            pointer-events: none;
            will-change: transform, opacity;
          }

          .halo {
            width: 24%;
            aspect-ratio: 1;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(var(--halo), .6) 0%, rgba(var(--halo), .2) 40%, rgba(var(--halo), 0) 70%);
          }

          .flare {
            width: 30%;
            aspect-ratio: 1;
          }

          .flare::before, .flare::after {
            content: "";
            position: absolute;
          }

          .flare::before {
            left: 0;
            right: 0;
            top: 50%;
            height: 2px;
            translate: 0 -50%;
            background: linear-gradient(90deg, transparent, var(--flare) 50%, transparent);
          }

          .flare::after {
            top: 0;
            bottom: 0;
            left: 50%;
            width: 2px;
            translate: -50% 0;
            background: linear-gradient(180deg, transparent, var(--flare) 50%, transparent);
          }

          /* Down Status & Message Content */
          .kiruu-status-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            max-width: 540px;
            width: 100%;
            margin: 0 auto;
            transform: translateZ(0);
          }

          .kiruu-subtitle {
            font-family: var(--font-display);
            font-size: clamp(1.4rem, 3.2vw, 2.05rem);
            font-weight: 700;
            margin-bottom: 14px;
            color: ${isForbidden ? '#fca5a5' : '#e0f2fe'};
            letter-spacing: -0.01em;
            text-shadow: 0 2px 10px rgba(0, 0, 0, 0.45);
          }

          .kiruu-notice-box {
            background: rgba(10, 22, 44, 0.88);
            border: 2px solid ${isForbidden ? '#dc2626' : '#1e3a5f'};
            border-radius: 14px;
            box-shadow: 4px 4px 0 ${isForbidden ? '#7f1d1d' : '#040b17'};
            padding: clamp(14px, 2.5vw, 18px) clamp(18px, 3vw, 26px);
            width: 100%;
            box-sizing: border-box;
          }

          .kiruu-notice {
            font-family: var(--font-ui);
            font-size: clamp(0.95rem, 1.8vw, 1.05rem);
            font-weight: 500;
            color: #cbd5e1;
            line-height: 1.55;
            word-break: break-word;
            margin: 0;
          }

          @media (max-width: 480px) {
            .stage {
              width: 90vw;
              margin-bottom: 16px;
            }
            .kiruu-subtitle {
              font-size: 1.35rem;
            }
            .kiruu-notice-box {
              padding: 12px 14px;
            }
          }
        </style>

        <div id="kiruu-offline-root">
          <!-- Background Video Layer -->
          <video id="kiruu-bg-video" autoplay loop muted playsinline poster="${bgFallback}" aria-hidden="true">
            <source src="${videoUrl}" type="video/mp4">
          </video>
          <div id="kiruu-bg-overlay" aria-hidden="true"></div>

          <div class="kiruu-viewport-container">
            <!-- Animated the KIRUU Logo Stage - purely visual, no console prompt -->
            <div class="stage" aria-hidden="true">
              <div class="halo" id="halo"></div>
              <div class="flare" id="flare"></div>
              <div class="logo" id="logo">
                <img data-layer="the" src="${"data:image/png;base64,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"}" alt="">
                <img data-layer="k" src="${"data:image/png;base64,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"}" alt="">
                <img data-layer="i" src="${"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAA18AAAEaCAYAAADuTO2fAAAEtUlEQVR42u3XUQ3AIBBEwS3BUa1VIAKQgRBM0PSSzii47H29BAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAODXLhMAUMgscMNI8ngFAKd1EwBQyF3ghuUNALyhmQAAAEB8AQAAiC8AAADEFwAAgPgCAAAQXwAAAIgvAAAA8QUAAID4AgAAEF8AAADiCwAAAPEFAAAgvgAAAMQXAAAA4gsAAEB8AQAAIL4AAADEFwAAgPgCAABAfAEAAIgvAAAAxBcAAID4AgAAEF8AAACILwAAAPEFAAAgvgAAABBfAAAA4gsAAADxBQAAIL4AAADEFwAAAOILAABAfAEAACC+AAAAxBcAAID4AgAAQHwBAACILwAAAPEFAACA+AIAABBfAAAAiC8AAADxBQAAIL4AAAAQXwAAAOILAAAA8QUAACC+AAAAxBcAAADiCwAAQHwBAACILwAAAMQXAACA+AIAAEB8AQAAiC8AAADxBQAAgPgCAAAQXwAAAIgvAAAA8QUAACC+AAAAEF8AAADiCwAAQHwBAAAgvgAAAMQXAAAA4gsAAEB8AQAAiC8AAADEFwAAgPgCAABAfAEAAIgvAAAA8QUAAID4AgAAEF8AAADiCwAAAPEFAAAgvgAAABBfAAAA4gsAAEB8AQAAIL4AAADEFwAAgPgyAQAAgPgCAAAQXwAAAIgvAAAA8QUAACC+AAAAEF8AAADiCwAAAPEFAAAgvgAAAMQXAAAA4gsAAEB8AQAAiC8AAADEFwAAgPgCAABAfAEAAIgvAAAA8QUAAID4AgAAEF8AAACILwAAAPEFAAAgvgAAABBfAAAA4gsAAEB8AQAAIL4AAADEFwAAAOILAABAfAEAAIgvAAAAxBcAAID4AgAAQHwBAACILwAAAPEFAACA+AIAABBfAAAA4gsAAADxBQAAIL4AAAAQXwAAAOILAABAfAEAACC+AAAAxBcAAADiCwAAQHwBAACILwAAAMQXAACA+AIAABBfAAAAiC8AAADxBQAAgPgCAAAQXwAAAOILAAAA8QUAACC+AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA+MIG8a0EQUEYaS8AAAAASUVORK5CYII="}" alt="">
                <img data-layer="r" src="${"data:image/png;base64,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"}" alt="">
                <img data-layer="u1" src="${"data:image/png;base64,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"}" alt="">
                <img data-layer="u2" src="${"data:image/png;base64,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"}" alt="">
                <div class="star" data-layer="star">
                  <img id="starimg" src="${"data:image/png;base64,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"}" alt="">
                  <div class="shine" id="shine"></div>
                </div>
              </div>
            </div>

            <!-- Down Status Notice Container - widget and console unlock removed -->
            <div class="kiruu-status-container">
              <h2 class="kiruu-subtitle">
                ${isForbidden ? 'Access Restricted' : "We'll be right back!"}
              </h2>

              <div class="kiruu-notice-box">
                <p class="kiruu-notice" id="kiruu-notice-text"></p>
              </div>
            </div>
          </div>
        </div>
      `;

      // Start the lightweight CSS keyframe animations
      try {
        startKiruuAnimation();
      } catch (e) {}

      // Mutation observer to prevent host frameworks from overriding
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
        noticeEl.textContent = customNotice || (isForbidden ? "Access to this service or resource is currently forbidden by administrator policy." : "This service is turned off! Please try again later.");
      }
    }

    function startKiruuAnimation() {
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      const T = 7000;
      const f = function (ms) { return ms / T; };
      const EASE = 'cubic-bezier(.2,.7,.2,1)';
      const $ = function (s) { return document.querySelector(s); };
      const layer = function (k) { return $('[data-layer="' + k + '"]'); };
      const loop = function (el, kf) { if (el) return el.animate(kf, { duration: T, iterations: Infinity }); };

      const starImg = $('#starimg');
      const shine = $('#shine');
      if (starImg && shine) {
        const m = 'url(' + starImg.src + ')';
        shine.style.webkitMaskImage = m;
        shine.style.maskImage = m;
      }

      function run(el, start, dur, hidden, shown, extra) {
        if (!el) return;
        const kf = [
          Object.assign({ offset: 0, opacity: 0 }, hidden),
          Object.assign({ offset: f(start), opacity: 0, easing: EASE }, hidden),
          Object.assign({ offset: f(start + dur), opacity: 1 }, shown)
        ].concat(extra || []);
        kf.push(Object.assign({ offset: 0.80, opacity: 1 }, shown));
        kf.push(Object.assign({ offset: 0.90, opacity: 0 }, shown));
        kf.push(Object.assign({ offset: 1, opacity: 0 }, hidden));
        return loop(el, kf);
      }

      const rise = { clipPath: 'inset(100% 0 0 0)', transform: 'translateY(14%)' };
      const up   = { clipPath: 'inset(0 0 0 0)',    transform: 'translateY(0)' };
      ['k', 'i', 'r', 'u1', 'u2'].forEach(function (k, i) { run(layer(k), 300 + i * 150, 750, rise, up); });

      run(layer('the'), 1900, 1500, { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' });

      const norm = { transform: 'scale(1) rotate(0deg)' };
      const big = { transform: 'scale(1.25) rotate(0deg)' };
      run(layer('star'), 3300, 700, { transform: 'scale(0) rotate(-90deg)' }, norm, [
        Object.assign({ offset: f(4700), opacity: 1 }, norm),
        Object.assign({ offset: f(5000), opacity: 1, easing: EASE }, big),
        Object.assign({ offset: f(5400), opacity: 1 }, norm)
      ]);

      // Soft halo behind star
      loop($('#halo'), [
        { offset: 0,        opacity: 0,   transform: 'scale(.6)' },
        { offset: f(3300),  opacity: 0,   transform: 'scale(.6)', easing: EASE },
        { offset: f(4000),  opacity: .65, transform: 'scale(1)' },
        { offset: f(4700),  opacity: .45, transform: 'scale(.95)', easing: EASE },
        { offset: f(5000),  opacity: .95, transform: 'scale(1.25)' },
        { offset: 0.80,     opacity: .5,  transform: 'scale(1)' },
        { offset: 0.90,     opacity: 0,   transform: 'scale(1)' },
        { offset: 1,        opacity: 0,   transform: 'scale(.6)' }
      ]);

      // Four-point flare twinkles twice
      loop($('#flare'), [
        { offset: 0,        opacity: 0, transform: 'scale(.2)' },
        { offset: f(4200),  opacity: 0, transform: 'scale(.2)', easing: EASE },
        { offset: f(4450),  opacity: 1, transform: 'scale(1)' },
        { offset: f(4800),  opacity: 0, transform: 'scale(1.15)' },
        { offset: f(4950),  opacity: 0, transform: 'scale(.2)', easing: EASE },
        { offset: f(5150),  opacity: 1, transform: 'scale(1)' },
        { offset: f(5550),  opacity: 0, transform: 'scale(1.2)' },
        { offset: 1,        opacity: 0, transform: 'scale(.2)' }
      ]);

      // Light sweeps across the star
      loop($('#shine'), [
        { offset: 0,        backgroundPosition: '100% 0' },
        { offset: f(4100),  backgroundPosition: '100% 0', easing: 'ease-in-out' },
        { offset: f(4700),  backgroundPosition: '0% 0',   easing: 'steps(1)' },
        { offset: f(4850),  backgroundPosition: '100% 0', easing: 'ease-in-out' },
        { offset: f(5450),  backgroundPosition: '0% 0' },
        { offset: 1,        backgroundPosition: '0% 0' }
      ]);
    }

    function mountOfflineView() {
      if (!document.body) {
        if (document.documentElement) {
          try {
            const newBody = document.createElement('body');
            document.documentElement.appendChild(newBody);
          } catch (e) {}
        }
      }

      if (document.body) {
        inject();
      } else {
        setTimeout(mountOfflineView, 10);
      }
    }

    mountOfflineView();
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", mountOfflineView, { once: true });
    }
  }

  function checkConfig(config, isCached) {
    if (!config) return;

    const isMasterOff = config.masterSwitch === false;
    const sublinkConfig = (config.services && (config.services[slug] || (slug === "tawir-dev" ? (config.services["tawir-dev"] || config.services["tawir-beta"]) : null))) || 
                          (config.sublinks && (config.sublinks[slug] || (slug === "tawir-dev" ? (config.sublinks["tawir-dev"] || config.sublinks["tawir-beta"]) : null)));

    if (slug === "tawir-beta" && isCached) {
      return;
    }

    if (isMasterOff || (sublinkConfig && sublinkConfig.enabled === false)) {
      const notice = sublinkConfig
        ? (sublinkConfig.maintenanceMessage || sublinkConfig.message)
        : (config.maintenanceMessage || "All services are currently undergoing maintenance.");
      const offlineType = (sublinkConfig && sublinkConfig.offlineType === 'forbidden') ? 'forbidden' : 'offline';
      renderOfflineUI(notice, offlineType);
    }
  }

  try {
    const cached = localStorage.getItem('kiruu_services_status') || localStorage.getItem('kiruu_sublinks_status');
    if (cached) {
      checkConfig(JSON.parse(cached), true);
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
      fetch(RTDB_STATUS_URL, { cache: 'no-store' })
        .then(res => res.ok ? res.json() : null)
        .then(rtdbItem => {
          if (rtdbItem && typeof rtdbItem.enabled === "boolean") {
            if (rtdbItem.enabled === false) {
              renderOfflineUI(rtdbItem.maintenanceMessage || rtdbItem.message, rtdbItem.offlineType || 'offline');
            }
          } else {
            fetchStaticFallback();
          }
        })
        .catch(fetchStaticFallback);
    });
})();
