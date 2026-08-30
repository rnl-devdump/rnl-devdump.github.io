import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase.js';

export function getDeviceInfo() {
  const ua = navigator.userAgent;
  let os = 'Unknown OS';
  if (ua.indexOf('Win') !== -1) os = 'Windows';
  else if (ua.indexOf('Mac') !== -1) os = 'macOS';
  else if (ua.indexOf('Linux') !== -1) os = 'Linux';
  else if (ua.indexOf('Android') !== -1) os = 'Android';
  else if (ua.indexOf('like Mac') !== -1 || ua.indexOf('iPhone') !== -1 || ua.indexOf('iPad') !== -1) os = 'iOS';

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

  return {
    os,
    browser,
    deviceType,
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
    dayOfWeek,
    hourOfDay,
    timestamp: Date.now(),
  };
}

export async function trackVisitEvent(page = 'movie') {
  try {
    const info = getDeviceInfo();
    await addDoc(collection(db, 'device_logs'), {
      ...info,
      page,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn("Failed to log visit telemetry:", err);
  }
}

export async function trackAiEvent(promptText, engine = 'Gemini') {
  try {
    const info = getDeviceInfo();
    await addDoc(collection(db, 'ai_usage_logs'), {
      ...info,
      prompt: promptText,
      engine,
      promptLength: promptText.length,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn("Failed to log AI telemetry:", err);
  }
}
