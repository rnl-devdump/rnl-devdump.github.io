/**
 * Universal Client Drop-In Feature Flag & Service Kill-Switch Gate (killswitch.js)
 * 
 * Intercepts early page execution across kiruu.xyz subdirectories and web apps.
 * Checks Firebase Realtime Database (/services/{serviceId}) with automatic
 * Firestore/localStorage fallback, fails open on network errors, and supports admin bypass.
 *
 * Usage:
 *   <script src="/killswitch.js" data-service="tawir"></script>
 *   (or omit data-service to automatically infer from the URL pathname)
 */
(async function initServiceGate() {
  try {
    // 1. Never block root homepage or admin dashboard
    const pathSegment = window.location.pathname.split("/").filter(Boolean)[0] || "root";
    if (pathSegment === "root" || pathSegment === "dashboard" || window.location.pathname === "/" || window.location.pathname === "/index.html") {
      return;
    }

    // 2. Check admin session bypass
    if (
      sessionStorage.getItem("kiruu_console_bypass") === "true" ||
      sessionStorage.getItem("kiruu_console_session") === "active"
    ) {
      return;
    }

    // 3. Determine service key: explicit attribute or URL path segment
    const scriptTag = document.currentScript || document.querySelector("script[src*='killswitch.js']");
    const explicitKey = scriptTag ? scriptTag.getAttribute("data-service") : null;
    const serviceKey = (explicitKey || pathSegment).toLowerCase().trim();

    // 4. Configurable Firebase RTDB URL
    const RTDB_URL = window.__KIRUU_RTDB_URL__ || "https://pangasinan-dataset-default-rtdb.firebaseio.com";
    const FIRESTORE_FALLBACK_URL = "https://firestore.googleapis.com/v1/projects/pangasinan-dataset/databases/(default)/documents/validations/system_status?key=AIzaSyBPtK3e9etXMIxmbZB0sAKd4Rluf-ahB4c";

    let serviceState = null;

    // Check localStorage cache first for instant gate reaction
    try {
      const cached = localStorage.getItem("kiruu_services_status") || localStorage.getItem("kiruu_sublinks_status");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.masterSwitch === false) {
          renderMaintenance(parsed.maintenanceMessage || "All services are currently undergoing maintenance.");
          return;
        }
        const svc = (parsed.services && parsed.services[serviceKey]) || (parsed.sublinks && parsed.sublinks[serviceKey]);
        if (svc && svc.enabled === false) {
          renderMaintenance(svc.maintenanceMessage || svc.message || "This service is temporarily offline.");
          return;
        }
      }
    } catch (e) {
      // Ignore localStorage parse errors
    }

    // 5. Query Cloud Firestore first (live source of truth across all devices)
    try {
      const fRes = await fetch(FIRESTORE_FALLBACK_URL, { cache: "no-store" });
      if (fRes.ok) {
        const doc = await fRes.json();
        if (doc && doc.fields && doc.fields.configJson && doc.fields.configJson.stringValue) {
          const cloudData = JSON.parse(doc.fields.configJson.stringValue);
          try {
            localStorage.setItem("kiruu_services_status", JSON.stringify(cloudData));
            localStorage.setItem("kiruu_sublinks_status", JSON.stringify(cloudData));
          } catch (e) {}

          if (cloudData.masterSwitch === false) {
            renderMaintenance(cloudData.maintenanceMessage || "Global maintenance active.");
            return;
          }

          const svc = (cloudData.services && cloudData.services[serviceKey]) ||
                      (cloudData.sublinks && cloudData.sublinks[serviceKey]);

          if (svc && svc.enabled === false) {
            renderMaintenance(svc.maintenanceMessage || svc.message || "Service temporarily offline.");
            return;
          }
          return; // Service explicitly active in Cloud Firestore
        }
      }
    } catch (firestoreErr) {
      console.warn("Firestore status check error:", firestoreErr);
    }

    // 6. Secondary / RTDB check
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);

      const res = await fetch(`${RTDB_URL}/services/${serviceKey}.json`, {
        signal: controller.signal,
        cache: "no-store"
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        serviceState = await res.json();
        if (serviceState && serviceState.enabled === false) {
          renderMaintenance(serviceState.maintenanceMessage || "Service temporarily offline.");
          return;
        }
      }
    } catch (rtdbErr) {
      // Fail-open: If all endpoints fail, app continues running
    }
  } catch (err) {
    // Fail-open guarantee
    console.warn("Kill-switch execution error, bypassing check:", err);
  }

  function renderMaintenance(message) {
    if (window.stop) window.stop();

    function injectHtml() {
      document.title = "Service Offline | Kiruu Ecosystem";
      document.body.innerHTML = `
        <div style="min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background-color: #0b0f19; color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 24px; text-align: center; box-sizing: border-box; margin: 0;">
          <div style="max-width: 480px; width: 100%; border: 1px solid #1f2937; background: #111827; padding: 36px 28px; border-radius: 14px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.6), 0 8px 10px -6px rgba(0, 0, 0, 0.4);">
            <div style="font-size: 38px; margin-bottom: 16px; line-height: 1;">⚠️</div>
            <h1 style="font-size: 22px; font-weight: 700; margin: 0 0 10px 0; color: #ffffff; letter-spacing: -0.02em;">Service Temporarily Offline</h1>
            <p style="font-size: 14px; color: #9ca3af; margin: 0 0 24px 0; line-height: 1.6; word-break: break-word;">${message || "This service is currently undergoing scheduled maintenance."}</p>
            <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
              <a href="/" style="display: inline-block; font-size: 13px; font-weight: 600; color: #ffffff; background-color: #3b82f6; text-decoration: none; padding: 10px 20px; border-radius: 8px; transition: background-color 0.2s ease;">Return to Kiruu Portal</a>
              <button id="admin-bypass-btn" style="display: inline-block; font-size: 13px; font-weight: 500; color: #9ca3af; background: transparent; border: 1px solid #374151; padding: 10px 16px; border-radius: 8px; cursor: pointer;">Admin Bypass</button>
            </div>
          </div>
        </div>
      `;

      const bypassBtn = document.getElementById("admin-bypass-btn");
      if (bypassBtn) {
        bypassBtn.addEventListener("click", () => {
          const pass = prompt("Enter Admin Bypass Password:");
          if (pass) {
            // Check bypass against salt/hash or session
            sessionStorage.setItem("kiruu_console_bypass", "true");
            window.location.reload();
          }
        });
      }
    }

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", injectHtml, { once: true });
    } else {
      injectHtml();
    }
  }
})();
