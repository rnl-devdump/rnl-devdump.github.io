import { collection, addDoc, doc, setDoc, increment, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { db, auth } from './firebase.js';

export const TELEMETRY_COLLECTION = 'validations';
export const TELEMETRY_DOC_ID = 'telemetry_data';

export function getDeviceInfo(customUa = null) {
  const ua = typeof customUa === 'string'
    ? customUa
    : ((typeof navigator !== 'undefined' && navigator.userAgent) ? navigator.userAgent : '');
    
  let os = 'Unknown OS';
  if (ua.indexOf('Win') !== -1) os = 'Windows';
  else if (ua.indexOf('Android') !== -1) os = 'Android';
  else if (ua.indexOf('like Mac') !== -1 || ua.indexOf('iPhone') !== -1 || ua.indexOf('iPad') !== -1) os = 'iOS';
  else if (ua.indexOf('Mac') !== -1) os = 'macOS';
  else if (ua.indexOf('Linux') !== -1) os = 'Linux';
  else if (typeof process !== 'undefined' && process.platform) {
    if (process.platform === 'win32') os = 'Windows';
    else if (process.platform === 'darwin') os = 'macOS';
    else if (process.platform === 'linux') os = 'Linux';
  }

  let browser = 'Unknown Browser';
  if (ua.indexOf('Firefox') !== -1) browser = 'Firefox';
  else if (ua.indexOf('SamsungBrowser') !== -1) browser = 'Samsung Internet';
  else if (ua.indexOf('Opera') !== -1 || ua.indexOf('OPR') !== -1) browser = 'Opera';
  else if (ua.indexOf('Trident') !== -1) browser = 'IE';
  else if (ua.indexOf('Edge') !== -1 || ua.indexOf('Edg') !== -1) browser = 'Edge';
  else if (ua.indexOf('Chrome') !== -1) browser = 'Chrome';
  else if (ua.indexOf('Safari') !== -1) browser = 'Safari';

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isTablet = /(ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch)))/i.test(ua);
  
  let deviceType = 'Desktop';
  if (isTablet) deviceType = 'Tablet';
  else if (isMobile) deviceType = 'Mobile';

  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 (Sun) - 6 (Sat)
  const hourOfDay = now.getHours(); // 0 - 23

  const screenWidth = typeof window !== 'undefined' ? (window.innerWidth || 0) : 0;
  const screenHeight = typeof window !== 'undefined' ? (window.innerHeight || 0) : 0;

  return {
    os,
    browser,
    deviceType,
    screenWidth,
    screenHeight,
    dayOfWeek,
    hourOfDay,
    timestamp: Date.now(),
  };
}

export function scrubPii(text) {
  if (typeof text !== "string") return "";
  return text
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[REDACTED_EMAIL]")
    .replace(/\b(?:\+?\d{1,3}[- ]?)?\(?\d{2,4}\)?[- ]?\d{3,4}[- ]?\d{3,4}\b/g, "[REDACTED_PHONE]")
    .trim()
    .slice(0, 160);
}

function bufferLocalEvent(storageKey, eventObj, maxItems = 50) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const raw = window.localStorage.getItem(storageKey);
    const list = raw ? JSON.parse(raw) : [];
    list.unshift(eventObj);
    if (list.length > maxItems) list.length = maxItems;
    window.localStorage.setItem(storageKey, JSON.stringify(list));
  } catch (_) {
    // Ignore storage quota or parse errors
  }
}

export async function trackVisitEvent(page = 'movie') {
  try {
    const info = getDeviceInfo();
    const eventId = 'v_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
    const visitRecord = {
      id: eventId,
      ...info,
      page: String(page || 'unknown').slice(0, 32),
    };

    // 1. Buffer in localStorage for instant local continuity and resilience
    bufferLocalEvent('kiruu_local_telemetry_visits', visitRecord);

    // 2. Write to public validations/telemetry_data in Firestore (open access rule)
    if (db) {
      try {
        const teleDocRef = doc(db, TELEMETRY_COLLECTION, TELEMETRY_DOC_ID);
        await setDoc(teleDocRef, {
          totalVisits: increment(1),
          recentVisits: arrayUnion(visitRecord),
          lastUpdated: Date.now(),
        }, { merge: true });
      } catch (docErr) {
        // Fallback silently if SDK write fails
      }

      // 3. Optional write to collection device_logs if authenticated admin session exists
      if (auth && auth.currentUser) {
        try {
          await addDoc(collection(db, 'device_logs'), {
            ...visitRecord,
            createdAt: serverTimestamp(),
          });
        } catch (_) {
          // Suppress unauthenticated collection write error
        }
      }
    }
  } catch (err) {
    // Fail-safe: telemetry tracking must never break host application execution
  }
}

export async function trackAiEvent(promptText, engine = 'Gemini') {
  try {
    const safePrompt = scrubPii(promptText);
    const info = getDeviceInfo();
    const eventId = 'ai_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
    const aiRecord = {
      id: eventId,
      ...info,
      prompt: safePrompt,
      engine: String(engine || 'Unknown').slice(0, 32),
      promptLength: typeof promptText === "string" ? promptText.length : 0,
    };

    // 1. Buffer in localStorage for instant local continuity
    bufferLocalEvent('kiruu_local_telemetry_ai', aiRecord);

    // 2. Write to public validations/telemetry_data in Firestore (open access rule)
    if (db) {
      try {
        const teleDocRef = doc(db, TELEMETRY_COLLECTION, TELEMETRY_DOC_ID);
        await setDoc(teleDocRef, {
          totalAiQueries: increment(1),
          recentAiQueries: arrayUnion(aiRecord),
          lastUpdated: Date.now(),
        }, { merge: true });
      } catch (docErr) {
        // Fallback silently if SDK write fails
      }

      // 3. Optional write to collection ai_usage_logs if authenticated admin session exists
      if (auth && auth.currentUser) {
        try {
          await addDoc(collection(db, 'ai_usage_logs'), {
            ...aiRecord,
            createdAt: serverTimestamp(),
          });
        } catch (_) {
          // Suppress unauthenticated collection write error
        }
      }
    }
  } catch (err) {
    // Fail-safe: telemetry tracking must never break host application execution
  }
}
