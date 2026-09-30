(function() {
  const currentPath = window.location.pathname.replace(/^\/|\/$/g, '');
  const slug = currentPath.split('/')[0];

  // Whitelist: never block the root homepage or the dashboard itself
  if (!slug || slug === 'dashboard' || slug === 'index.html') {
    return;
  }

  const SALT = "kiruu_console_guard_salt_2026_x89a";
  const HASH = "8489a8f6711c61354beebb60cd5daf96f62d22296294e75d6d82b87260dcf63f";

  // Check admin session bypass
  if (sessionStorage.getItem('kiruu_console_bypass') === 'true' || sessionStorage.getItem('kiruu_console_session') === 'active') {
    return;
  }

  function renderOfflineUI(serviceName, customMessage) {
    window.stop && window.stop();

    const offlineHTML = `
      <div id="kiruu-offline-root" style="
        position: fixed; inset: 0; z-index: 9999999;
        background: radial-gradient(circle at 50% 20%, #151a24 0%, #06090e 100%);
        color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        display: flex; align-items: center; justify-content: center; padding: 24px; box-sizing: border-box;
      ">
        <div style="
          max-width: 540px; width: 100%;
          background: rgba(15, 23, 42, 0.75);
          border: 1px solid rgba(239, 68, 68, 0.35);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 40px rgba(239, 68, 68, 0.15);
          backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
          border-radius: 24px; padding: 40px 32px; text-align: center; box-sizing: border-box;
        ">
          <div style="
            width: 72px; height: 72px; margin: 0 auto 20px;
            background: linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(185, 28, 28, 0.1));
            border: 2px solid rgba(239, 68, 68, 0.4); border-radius: 20px;
            display: flex; align-items: center; justify-content: center;
          ">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </div>

          <div style="display: inline-flex; align-items: center; gap: 8px; background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.25); border-radius: 9999px; padding: 6px 14px; margin-bottom: 16px;">
            <span style="width: 8px; height: 8px; border-radius: 50%; background: #ef4444; box-shadow: 0 0 8px #ef4444;"></span>
            <span style="font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #f87171;">Service Offline</span>
          </div>

          <h1 style="font-size: 26px; font-weight: 800; margin: 0 0 10px; color: #ffffff; letter-spacing: -0.02em;">
            ${serviceName || ('/' + slug)}
          </h1>

          <p style="font-size: 14px; line-height: 1.6; color: #94a3b8; margin: 0 0 28px;">
            ${customMessage || "This sublink has been temporarily deactivated by the administrator via KIRUUCONSOLE."}
          </p>

          <div style="display: flex; flex-direction: column; gap: 12px;">
            <a href="/" style="
              display: block; padding: 12px 20px; border-radius: 12px;
              background: linear-gradient(135deg, #3b82f6, #1d4ed8);
              color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none;
              transition: all 0.2s; box-shadow: 0 4px 14px rgba(59, 130, 246, 0.3);
            ">Return to Home</a>

            <div style="display: flex; gap: 10px; justify-content: center; margin-top: 6px;">
              <a href="/dashboard/" style="
                flex: 1; padding: 10px 16px; border-radius: 12px;
                background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1);
                color: #cbd5e1; font-size: 13px; font-weight: 500; text-decoration: none;
              ">Console Login</a>

              <button id="admin-bypass-btn" style="
                flex: 1; padding: 10px 16px; border-radius: 12px;
                background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.25);
                color: #fca5a5; font-size: 13px; font-weight: 500; cursor: pointer;
              ">Admin Unlock</button>
            </div>
          </div>
        </div>
      </div>
    `;

    function inject() {
      // Clear head links or stop scripts if possible
      document.title = "Service Offline | " + (serviceName || slug);
      document.body.innerHTML = offlineHTML;
      document.body.style.overflow = "hidden";

      const bypassBtn = document.getElementById("admin-bypass-btn");
      if (bypassBtn) {
        bypassBtn.addEventListener("click", async function() {
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
            alert("Verification failed: " + e.message);
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
    const sublinkConfig = config.sublinks && config.sublinks[slug];

    if (isMasterOff || (sublinkConfig && sublinkConfig.enabled === false)) {
      const name = sublinkConfig ? sublinkConfig.name : slug;
      const msg = isMasterOff 
        ? "All sublinks have been deactivated globally under Emergency Maintenance."
        : (sublinkConfig ? sublinkConfig.message : null);
      renderOfflineUI(name, msg);
    }
  }

  // 1. Fast local check
  try {
    const cached = localStorage.getItem('kiruu_sublinks_status');
    if (cached) {
      checkConfig(JSON.parse(cached));
    }
  } catch (e) {}

  // 2. Fetch authoritative sublinks.json
  fetch('/sublinks.json?t=' + Date.now(), { cache: 'no-store' })
    .then(res => res.json())
    .then(data => {
      try {
        localStorage.setItem('kiruu_sublinks_status', JSON.stringify(data));
      } catch (e) {}
      checkConfig(data);
    })
    .catch(() => {});
})();
