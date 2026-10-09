import { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, limit, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { ref, onValue, set, remove } from 'firebase/database';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { db, rtdb, auth, firebaseConfig } from '../lib/firebase.js';

const PWD_SALT = "kiruu_console_guard_salt_2026_x89a";
const PWD_HASH = "78c2a001ef868e6e51e2aa5015eb6e88efe412744a62f027ebe1663853acb67f";

const INITIAL_SUBLINKS = {
  "tawir": {
    name: "TAWIR (Pangasinan AI Assistant)",
    path: "/tawir",
    category: "AI Assistant",
    description: "Pangasinan conversational model interface (Flutter)",
    enabled: true,
    message: "TAWIR is temporarily offline."
  },
  "tawir-convo": {
    name: "TAWIR Conversation Monitor",
    path: "/tawir-convo",
    category: "AI Monitoring",
    description: "Real-time dialogue telemetry inspector & analytics",
    enabled: true,
    message: "TAWIR conversation monitor is currently offline."
  },
  "anime": {
    name: "Anime Hub",
    path: "/anime",
    category: "Media",
    description: "Anime portal, search catalog, and live watch parties",
    enabled: true,
    message: "Anime portal is temporarily unavailable."
  },
  "movie": {
    name: "Movie Hub",
    path: "/movie",
    category: "Media",
    description: "TMDB media portal, trailers & community rooms",
    enabled: true,
    message: "Movie streaming portal is offline."
  },
  "dataset": {
    name: "Dataset Annotator",
    path: "/dataset",
    category: "Data Tool",
    description: "Parallel sentence annotation pipeline for Salitan Pangasinan",
    enabled: true,
    message: "Dataset annotation portal is undergoing maintenance."
  },
  "validation": {
    name: "Validation Suite",
    path: "/validation",
    category: "Quality",
    description: "Dataset quality verification & crowd validation suite",
    enabled: true,
    message: "Validation tools are currently offline."
  },
  "bill": {
    name: "Utility Rates Tracker",
    path: "/bill",
    category: "Finance",
    description: "Automated electricity rates and billing analytics",
    enabled: true,
    message: "Utility rates service is temporarily unavailable."
  },
  "chess": {
    name: "Java Chess (Web)",
    path: "/chess",
    category: "Game",
    description: "A classic Java desktop chess game seamlessly ported to the web using WebAssembly and CheerpJ client-side JVM.",
    enabled: true,
    message: "Chess game is temporarily unavailable."
  },
  "vibe": {
    name: "Vibe Video & Screen Share",
    path: "/vibe",
    category: "Media",
    description: "Peer-to-peer video calling and presentation room with passcode security and Google Meet style controls.",
    enabled: true,
    message: "Vibe video calling is temporarily offline."
  }
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function DashboardApp() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('kiruu_console_session') === 'active';
  });
  const [authMode, setAuthMode] = useState('password'); // 'password' | 'firebase'
  const [passwordInput, setPasswordInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [fbPasswordInput, setFbPasswordInput] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const [activeTab, setActiveTab] = useState('sublinks');

  const [masterSwitch, setMasterSwitch] = useState(true);
  const [sublinks, setSublinks] = useState(INITIAL_SUBLINKS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Admin announcement banner state (top 5s fade message on main page)
  const [adminBanner, setAdminBanner] = useState({
    enabled: false,
    message: '',
    variant: 'info', // 'info' | 'warning' | 'alert' | 'success'
    updatedAt: ''
  });
  const [adminBannerMsgInput, setAdminBannerMsgInput] = useState('');
  const [adminBannerVariant, setAdminBannerVariant] = useState('info');
  const [adminBannerDeploying, setAdminBannerDeploying] = useState(false);
  const [previewActive, setPreviewActive] = useState(false);
  const [previewFaded, setPreviewFaded] = useState(false);

  // Dynamic service registration form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newServiceKey, setNewServiceKey] = useState('');
  const [newServiceName, setNewServiceName] = useState('');
  const [newServiceMsg, setNewServiceMsg] = useState('');
  const [newServiceCategory, setNewServiceCategory] = useState('AI Assistant');
  const [newServicePath, setNewServicePath] = useState('');

  const [rtdbStatus, setRtdbStatus] = useState('disconnected'); // 'disconnected' | 'connected' | 'fallback'

  const [deviceLogs, setDeviceLogs] = useState([]);
  const [aiLogs, setAiLogs] = useState([]);
  const [loadingTelemetry, setLoadingTelemetry] = useState(true);

  const FIRESTORE_SYNC_URL = 'https://firestore.googleapis.com/v1/projects/pangasinan-dataset/databases/(default)/documents/validations/system_status?key=AIzaSyBPtK3e9etXMIxmbZB0sAKd4Rluf-ahB4c';

  // Listen for Firebase Auth state changes
  useEffect(() => {
    if (!auth) return;
    try {
      const unsub = onAuthStateChanged(auth, (user) => {
        if (user) {
          setCurrentUser(user);
          setIsAuthenticated(true);
          sessionStorage.setItem('kiruu_console_session', 'active');
          sessionStorage.setItem('kiruu_console_bypass', 'true');
        }
      });
      return () => unsub();
    } catch (e) {
      console.warn("Auth listener warning:", e);
    }
  }, []);

  // Live real-time listener to Firestore Cloud status across all devices
  useEffect(() => {
    // 1. Initial cached load for immediate UI
    try {
      const cached = localStorage.getItem('kiruu_services_status') || localStorage.getItem('kiruu_sublinks_status');
      if (cached) {
        const parsed = JSON.parse(cached);
        const cachedServices = parsed.services || parsed.sublinks;
        if (cachedServices) {
          setSublinks(prev => ({ ...prev, ...cachedServices }));
        }
        if (typeof parsed.masterSwitch === 'boolean') {
          setMasterSwitch(parsed.masterSwitch);
        }
        if (parsed.adminAnnouncement) {
          const ann = parsed.adminAnnouncement;
          setAdminBanner({
            enabled: Boolean(ann.enabled),
            message: ann.message || '',
            variant: ann.variant || 'info',
            updatedAt: ann.updatedAt || ''
          });
          setAdminBannerMsgInput(ann.message || '');
          setAdminBannerVariant(ann.variant || 'info');
        }
      }
    } catch (e) {}

    // 2. Real-time Cloud Firestore snapshot listener (Live across all devices)
    if (db) {
      try {
        const docRef = doc(db, 'validations', 'system_status');
        const unsubFirestore = onSnapshot(docRef, (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            if (data && data.configJson) {
              try {
                const cloudData = typeof data.configJson === 'string' ? JSON.parse(data.configJson) : data.configJson;
                const remoteServices = cloudData.services || cloudData.sublinks;
                if (remoteServices && typeof remoteServices === 'object') {
                  setSublinks(prev => {
                    const merged = { ...prev };
                    Object.entries(remoteServices).forEach(([k, item]) => {
                      if (item && typeof item === 'object') {
                        merged[k] = {
                          ...(merged[k] || {}),
                          name: item.name || k,
                          enabled: Boolean(item.enabled),
                          message: item.message || item.maintenanceMessage || "Service temporarily offline.",
                          maintenanceMessage: item.maintenanceMessage || item.message,
                          category: item.category || (merged[k] && merged[k].category) || "Custom",
                          path: item.path || (merged[k] && merged[k].path) || `/${k}`,
                          description: item.description || (merged[k] && merged[k].description) || "",
                          isDynamic: item.isDynamic !== undefined ? item.isDynamic : true
                        };
                      }
                    });
                    return merged;
                  });
                }
                if (typeof cloudData.masterSwitch === 'boolean') {
                  setMasterSwitch(cloudData.masterSwitch);
                }
                if (cloudData.adminAnnouncement) {
                  const ann = cloudData.adminAnnouncement;
                  setAdminBanner({
                    enabled: Boolean(ann.enabled),
                    message: ann.message || '',
                    variant: ann.variant || 'info',
                    updatedAt: ann.updatedAt || ''
                  });
                  setAdminBannerMsgInput(ann.message || '');
                  setAdminBannerVariant(ann.variant || 'info');
                }
                setRtdbStatus('connected');
                try {
                  localStorage.setItem('kiruu_sublinks_status', JSON.stringify(cloudData));
                  localStorage.setItem('kiruu_services_status', JSON.stringify(cloudData));
                } catch (e) {}
              } catch (err) {
                console.warn("Parse configJson warning:", err);
              }
            }
          }
        }, (err) => {
          console.warn("Firestore snapshot listener error:", err);
          setRtdbStatus('fallback');
        });

        return () => unsubFirestore();
      } catch (err) {
        console.warn("Firestore snapshot setup error:", err);
      }
    }

    // 3. Fallback: REST fetch if SDK listener is unavailable
    fetch(FIRESTORE_SYNC_URL, { cache: 'no-store' })
      .then(res => res.json())
      .then(docSnap => {
        if (docSnap && docSnap.fields && docSnap.fields.configJson && docSnap.fields.configJson.stringValue) {
          const cloudData = JSON.parse(docSnap.fields.configJson.stringValue);
          const remoteServices = cloudData.services || cloudData.sublinks;
          if (remoteServices) setSublinks(prev => ({ ...prev, ...remoteServices }));
          if (typeof cloudData.masterSwitch === 'boolean') setMasterSwitch(cloudData.masterSwitch);
          if (cloudData.adminAnnouncement) {
            const ann = cloudData.adminAnnouncement;
            setAdminBanner({
              enabled: Boolean(ann.enabled),
              message: ann.message || '',
              variant: ann.variant || 'info',
              updatedAt: ann.updatedAt || ''
            });
            setAdminBannerMsgInput(ann.message || '');
            setAdminBannerVariant(ann.variant || 'info');
          }
          setRtdbStatus('connected');
        }
      })
      .catch(() => {
        setRtdbStatus('fallback');
      });
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    const qDevices = query(
      collection(db, 'device_logs'),
      orderBy('createdAt', 'desc'),
      limit(200)
    );
    const unsubDevices = onSnapshot(qDevices, (snapshot) => {
      const logs = [];
      snapshot.forEach((doc) => logs.push({ id: doc.id, ...doc.data() }));
      setDeviceLogs(logs);
      setLoadingTelemetry(false);
    }, (err) => {
      console.warn("Device logs subscription warning:", err);
      setLoadingTelemetry(false);
    });

    const qAi = query(
      collection(db, 'ai_usage_logs'),
      orderBy('createdAt', 'desc'),
      limit(200)
    );
    const unsubAi = onSnapshot(qAi, (snapshot) => {
      const logs = [];
      snapshot.forEach((doc) => logs.push({ id: doc.id, ...doc.data() }));
      setAiLogs(logs);
    }, (err) => {
      console.warn("AI logs subscription warning:", err);
    });

    return () => {
      unsubDevices();
      unsubAi();
    };
  }, [isAuthenticated]);

  async function handleLogin(e) {
    if (e) e.preventDefault();
    if (!passwordInput.trim()) {
      setAuthError('Please enter console password.');
      return;
    }

    setIsVerifying(true);
    setAuthError('');

    try {
      const enc = new TextEncoder();
      const data = enc.encode(PWD_SALT + ":" + passwordInput.trim());
      const buf = await crypto.subtle.digest("SHA-256", data);
      const hash = Array.from(new Uint8Array(buf))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");

      if (hash === PWD_HASH) {
        sessionStorage.setItem('kiruu_console_session', 'active');
        sessionStorage.setItem('kiruu_console_bypass', 'true');
        setIsAuthenticated(true);
        setPasswordInput('');
        setAuthError('');
      } else {
        setAuthError('Access Denied: Invalid Console Password.');
      }
    } catch (err) {
      setAuthError('Cryptographic verification failed: ' + err.message);
    } finally {
      setIsVerifying(false);
    }
  }

  async function handleFirebaseAuthLogin(e) {
    if (e) e.preventDefault();
    if (!emailInput.trim() || !fbPasswordInput.trim()) {
      setAuthError('Please enter both email and password.');
      return;
    }
    setIsVerifying(true);
    setAuthError('');
    try {
      if (!auth) throw new Error('Firebase Auth not available. Please verify credentials in .env.');
      const userCred = await signInWithEmailAndPassword(auth, emailInput.trim(), fbPasswordInput);
      setCurrentUser(userCred.user);
      sessionStorage.setItem('kiruu_console_session', 'active');
      sessionStorage.setItem('kiruu_console_bypass', 'true');
      setIsAuthenticated(true);
      setEmailInput('');
      setFbPasswordInput('');
      setAuthError('');
    } catch (err) {
      setAuthError(err.message || 'Firebase authentication failed.');
    } finally {
      setIsVerifying(false);
    }
  }

  async function handleLogout() {
    if (auth && currentUser) {
      try { await signOut(auth); } catch (e) {}
    }
    sessionStorage.removeItem('kiruu_console_session');
    sessionStorage.removeItem('kiruu_console_bypass');
    setIsAuthenticated(false);
    setCurrentUser(null);
    setPasswordInput('');
    setAuthError('');
  }

  function toggleSublink(key) {
    setSublinks(prev => {
      const current = prev[key];
      const updated = {
        ...prev,
        [key]: {
          ...current,
          enabled: !current.enabled
        }
      };
      saveStateLocally(masterSwitch, updated, key);
      return updated;
    });
  }

  function updateSublinkMessage(key, newMsg) {
    setSublinks(prev => {
      const updated = {
        ...prev,
        [key]: {
          ...prev[key],
          message: newMsg,
          maintenanceMessage: newMsg
        }
      };
      saveStateLocally(masterSwitch, updated, key);
      return updated;
    });
  }

  function toggleMasterSwitch() {
    const nextState = !masterSwitch;
    setMasterSwitch(nextState);
    saveStateLocally(nextState, sublinks);
  }

  function setAllSublinks(enabledState) {
    setSublinks(prev => {
      const updated = {};
      Object.keys(prev).forEach(key => {
        updated[key] = {
          ...prev[key],
          enabled: enabledState
        };
      });
      saveStateLocally(masterSwitch, updated);
      return updated;
    });
  }

  async function saveStateLocally(mSwitch, sublinkMap, updatedKey = null, isDelete = false, customAdminBanner = null) {
    const currentAdminBanner = customAdminBanner !== null ? customAdminBanner : adminBanner;
    const payload = {
      updatedAt: new Date().toISOString(),
      masterSwitch: mSwitch,
      adminAnnouncement: currentAdminBanner,
      sublinks: sublinkMap,
      services: sublinkMap
    };
    try {
      localStorage.setItem('kiruu_sublinks_status', JSON.stringify(payload));
      localStorage.setItem('kiruu_services_status', JSON.stringify(payload));
    } catch (e) {
      console.error(e);
    }

    // 1. Broadcast to Cloud Firestore (Live source of truth across all devices)
    try {
      setSaveSuccessMsg('Syncing to Cloud Firestore...');

      if (db) {
        await setDoc(doc(db, 'validations', 'system_status'), {
          configJson: JSON.stringify(payload)
        }, { merge: true });
        setSaveSuccessMsg('Status updated live across ALL devices!');
      } else {
        throw new Error('Firestore SDK unavailable, attempting REST fallback');
      }
    } catch (err) {
      console.warn("Cloud Firestore SDK write warning:", err);
      try {
        const cloudPayload = {
          fields: {
            configJson: {
              stringValue: JSON.stringify(payload)
            }
          }
        };
        const res = await fetch(FIRESTORE_SYNC_URL, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cloudPayload)
        });
        if (!res.ok) throw new Error(`REST PATCH failed with status ${res.status}`);
        setSaveSuccessMsg('Status updated live across ALL devices!');
      } catch (restErr) {
        console.warn("Firestore REST write error:", restErr);
        setSaveSuccessMsg('Saved locally (network error syncing to cloud).');
      }
    }

    // 2. Non-blocking RTDB sync attempt (times out in 500ms so it never hangs)
    if (rtdb) {
      try {
        const rtdbWrite = (async () => {
          if (updatedKey) {
            if (isDelete) {
              await remove(ref(rtdb, `services/${updatedKey}`));
            } else {
              const item = sublinkMap[updatedKey];
              if (item) {
                await set(ref(rtdb, `services/${updatedKey}`), {
                  name: item.name || updatedKey,
                  enabled: Boolean(item.enabled),
                  maintenanceMessage: item.message || item.maintenanceMessage || "This service is currently undergoing scheduled maintenance.",
                  category: item.category || "Custom",
                  path: item.path || `/${updatedKey}`,
                  description: item.description || "",
                  isDynamic: Boolean(item.isDynamic),
                  updatedAt: Date.now()
                });
              }
            }
          } else {
            const rtdbPayload = {};
            Object.entries(sublinkMap).forEach(([k, item]) => {
              rtdbPayload[k] = {
                name: item.name || k,
                enabled: Boolean(item.enabled),
                maintenanceMessage: item.message || item.maintenanceMessage || "This service is currently undergoing scheduled maintenance.",
                category: item.category || "Custom",
                path: item.path || `/${k}`,
                description: item.description || "",
                isDynamic: Boolean(item.isDynamic),
                updatedAt: Date.now()
              };
            });
            await set(ref(rtdb, 'services'), rtdbPayload);
          }
          if (typeof mSwitch === 'boolean') {
            await set(ref(rtdb, 'masterSwitch'), mSwitch);
          }
          // Also persist adminAnnouncement to RTDB
          await set(ref(rtdb, 'adminAnnouncement'), currentAdminBanner);
        })();

        await Promise.race([
          rtdbWrite,
          new Promise((_, reject) => setTimeout(() => reject(new Error("RTDB timeout")), 500))
        ]);
      } catch (rtdbErr) {}
    }

    setTimeout(() => setSaveSuccessMsg(''), 3000);
  }

  async function deployAdminBanner(override = {}) {
    setAdminBannerDeploying(true);
    const updated = {
      ...adminBanner,
      message: (override.message !== undefined ? override.message : adminBannerMsgInput).trim(),
      variant: override.variant !== undefined ? override.variant : adminBannerVariant,
      enabled: override.enabled !== undefined ? override.enabled : adminBanner.enabled,
      updatedAt: new Date().toISOString()
    };
    setAdminBanner(updated);
    if (override.message !== undefined) setAdminBannerMsgInput(override.message);
    if (override.variant !== undefined) setAdminBannerVariant(override.variant);
    try {
      await saveStateLocally(masterSwitch, sublinks, null, false, updated);
      setSaveSuccessMsg(updated.enabled ? 'Admin announcement deployed live to main page!' : 'Admin announcement deactivated.');
    } finally {
      setAdminBannerDeploying(false);
    }
  }

  function triggerAdminBannerPreview() {
    setPreviewActive(true);
    setPreviewFaded(false);
    setTimeout(() => {
      setPreviewFaded(true);
      setTimeout(() => {
        setPreviewActive(false);
        setPreviewFaded(false);
      }, 700);
    }, 5000);
  }

  function registerNewService(e) {
    if (e) e.preventDefault();
    const rawKey = newServiceKey.toLowerCase().trim();
    const key = rawKey.replace(/[^a-z0-9_-]/g, "");
    if (!key) {
      alert("Please enter a valid service key slug (letters, numbers, underscores, dashes).");
      return;
    }
    if (!newServiceName.trim()) {
      alert("Please enter a display name for the service.");
      return;
    }

    const cleanPath = (newServicePath.trim() || `/${key}`).startsWith('/')
      ? (newServicePath.trim() || `/${key}`)
      : `/${newServicePath.trim()}`;

    const newServiceObj = {
      name: newServiceName.trim(),
      path: cleanPath,
      category: newServiceCategory || "Custom",
      description: "Dynamically registered service killswitch flag",
      enabled: true,
      message: newServiceMsg.trim() || "This service is currently undergoing scheduled maintenance.",
      maintenanceMessage: newServiceMsg.trim() || "This service is currently undergoing scheduled maintenance.",
      isDynamic: true
    };

    setSublinks(prev => {
      const updated = {
        ...prev,
        [key]: newServiceObj
      };
      saveStateLocally(masterSwitch, updated, key);
      return updated;
    });

    setNewServiceKey('');
    setNewServiceName('');
    setNewServiceMsg('');
    setNewServicePath('');
    setShowAddForm(false);
    setSaveSuccessMsg(`Service "/${key}" successfully registered!`);
    setTimeout(() => setSaveSuccessMsg(''), 4000);
  }

  function deleteService(key) {
    if (!window.confirm(`Are you sure you want to remove service "${key}"?`)) return;

    setSublinks(prev => {
      const updated = { ...prev };
      delete updated[key];
      saveStateLocally(masterSwitch, updated, key, true);
      return updated;
    });
    setSaveSuccessMsg(`Service "/${key}" removed.`);
    setTimeout(() => setSaveSuccessMsg(''), 3000);
  }

  function downloadConfigJSON() {
    const payload = {
      updatedAt: new Date().toISOString(),
      masterSwitch,
      adminAnnouncement: adminBanner,
      sublinks
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sublinks.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setSaveSuccessMsg('Downloaded sublinks.json! Commit it to apply globally.');
    setTimeout(() => setSaveSuccessMsg(''), 4000);
  }

  function copyConfigJSON() {
    const payload = {
      updatedAt: new Date().toISOString(),
      masterSwitch,
      adminAnnouncement: adminBanner,
      sublinks
    };
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2))
      .then(() => {
        setSaveSuccessMsg('Copied config JSON to clipboard!');
        setTimeout(() => setSaveSuccessMsg(''), 3000);
      })
      .catch(() => {
        alert('Failed copying to clipboard.');
      });
  }

  const stats = useMemo(() => {
    const totalVisits = deviceLogs.length;
    const totalAiQueries = aiLogs.length;
    const todayStr = new Date().toISOString().split('T')[0];

    const visitsToday = deviceLogs.filter(d => {
      const dateStr = new Date(d.timestamp || 0).toISOString().split('T')[0];
      return dateStr === todayStr;
    }).length;

    const aiToday = aiLogs.filter(d => {
      const dateStr = new Date(d.timestamp || 0).toISOString().split('T')[0];
      return dateStr === todayStr;
    }).length;

    const devices = { Desktop: 0, Mobile: 0, Tablet: 0 };
    const osMap = {};
    const browserMap = {};

    deviceLogs.forEach(log => {
      if (log.deviceType) devices[log.deviceType] = (devices[log.deviceType] || 0) + 1;
      if (log.os) osMap[log.os] = (osMap[log.os] || 0) + 1;
      if (log.browser) browserMap[log.browser] = (browserMap[log.browser] || 0) + 1;
    });

    const heatmap = Array.from({ length: 7 }, () => Array(24).fill(0));
    let maxCellCount = 0;

    [...deviceLogs, ...aiLogs].forEach(item => {
      const day = item.dayOfWeek !== undefined ? item.dayOfWeek : new Date(item.timestamp || 0).getDay();
      const hour = item.hourOfDay !== undefined ? item.hourOfDay : new Date(item.timestamp || 0).getHours();
      if (day >= 0 && day < 7 && hour >= 0 && hour < 24) {
        heatmap[day][hour] += 1;
        if (heatmap[day][hour] > maxCellCount) maxCellCount = heatmap[day][hour];
      }
    });

    return {
      totalVisits,
      totalAiQueries,
      visitsToday,
      aiToday,
      devices,
      osMap,
      browserMap,
      heatmap,
      maxCellCount: maxCellCount || 1,
    };
  }, [deviceLogs, aiLogs]);

  const sublinkEntries = Object.entries(sublinks);
  const totalSublinks = sublinkEntries.length;
  const activeCount = sublinkEntries.filter(([_, s]) => s.enabled && masterSwitch).length;
  const disabledCount = totalSublinks - activeCount;

  const categories = useMemo(() => {
    const set = new Set();
    sublinkEntries.forEach(([_, s]) => {
      if (s.category) set.add(s.category);
    });
    return ['ALL', ...Array.from(set)];
  }, [sublinks]);

  const filteredSublinks = sublinkEntries.filter(([key, item]) => {
    const q = searchQuery.toLowerCase().trim();
    const matchQuery = !q || item.name.toLowerCase().includes(q) || item.path.toLowerCase().includes(q) || (item.category && item.category.toLowerCase().includes(q));
    const matchCat = selectedCategory === 'ALL' || item.category === selectedCategory;
    const isOnline = item.enabled && masterSwitch;
    const matchStatus = statusFilter === 'ALL' || (statusFilter === 'ONLINE' && isOnline) || (statusFilter === 'OFFLINE' && !isOnline);
    return matchQuery && matchCat && matchStatus;
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 font-sans relative z-10">
        <div className="max-w-md w-full bg-white/95 border-2 border-[#111111] rounded-2xl p-8 sm:p-10 shadow-[6px_6px_0px_#111111] backdrop-blur-md relative z-10">
          <div className="text-center mb-6">
            <a href="/" title="Return to Homepage">
              <img src="/logo.png" alt="The Kiruu" className="h-16 w-auto mx-auto mb-3 cursor-pointer hover:scale-105 transition-transform" />
            </a>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#dcfce7] border border-[#166534] text-[#14532d] text-xs font-bold uppercase tracking-wider mb-2">
              <span className="w-2 h-2 rounded-full bg-[#16a34a]" />
              Console Gate
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-[#111827] font-['Vandelvira',Georgia,serif]">KIRUU CONSOLE</h1>
            <p className="text-xs sm:text-sm text-[#475569] mt-1 font-medium">
              Enter credentials to manage sublinks, kill switches &amp; telemetry.
            </p>
          </div>

          <div className="flex p-1 rounded-xl bg-slate-100 border-2 border-[#111111] mb-6">
            <button
              type="button"
              onClick={() => { setAuthMode('password'); setAuthError(''); }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
                authMode === 'password'
                  ? 'bg-[#fee6e3] text-[#111827] shadow-[2px_2px_0px_#111111] border border-[#111111]'
                  : 'text-[#64748b] hover:text-[#111827]'
              }`}
            >
              Master Password
            </button>
            <button
              type="button"
              onClick={() => { setAuthMode('firebase'); setAuthError(''); }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
                authMode === 'firebase'
                  ? 'bg-[#fee6e3] text-[#111827] shadow-[2px_2px_0px_#111111] border border-[#111111]'
                  : 'text-[#64748b] hover:text-[#111827]'
              }`}
            >
              Firebase Auth
            </button>
          </div>

          {authMode === 'password' ? (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-[#111827] uppercase tracking-wider mb-2">
                  Console Master Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Enter console password..."
                    autoFocus
                    className="w-full bg-white border-2 border-[#111111] rounded-xl px-4 py-3.5 pr-11 text-sm text-[#111827] placeholder:text-slate-400 focus:outline-none focus:shadow-[3px_3px_0px_#111111] transition shadow-[2px_2px_0px_#111111]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-black transition"
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                    )}
                  </button>
                </div>
              </div>

              {authError && (
                <div className="p-3 rounded-xl bg-rose-50 border-2 border-rose-600 text-rose-950 text-xs font-semibold flex items-center gap-2 shadow-[2px_2px_0px_rgba(225,29,72,0.2)]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                  <span>{authError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isVerifying}
                className="w-full py-3.5 px-4 rounded-xl bg-[#fee6e3] hover:bg-[#ffdeda] border-2 border-[#111111] text-[#111827] font-extrabold text-sm tracking-wide shadow-[4px_4px_0px_#111111] hover:shadow-[5px_5px_0px_#111111] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_#111111] transition-all disabled:opacity-50"
              >
                {isVerifying ? "Verifying Credentials..." : "Authenticate & Open Console"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleFirebaseAuthLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#111827] uppercase tracking-wider mb-1.5">
                  Admin Email
                </label>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="admin@kiruu.xyz"
                  required
                  autoFocus
                  className="w-full bg-white border-2 border-[#111111] rounded-xl px-4 py-3 text-sm text-[#111827] placeholder:text-slate-400 focus:outline-none focus:shadow-[3px_3px_0px_#111111] transition shadow-[2px_2px_0px_#111111]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#111827] uppercase tracking-wider mb-1.5">
                  Firebase Password
                </label>
                <input
                  type="password"
                  value={fbPasswordInput}
                  onChange={(e) => setFbPasswordInput(e.target.value)}
                  placeholder="Password..."
                  required
                  className="w-full bg-white border-2 border-[#111111] rounded-xl px-4 py-3 text-sm text-[#111827] placeholder:text-slate-400 focus:outline-none focus:shadow-[3px_3px_0px_#111111] transition shadow-[2px_2px_0px_#111111]"
                />
              </div>

              {authError && (
                <div className="p-3 rounded-xl bg-rose-50 border-2 border-rose-600 text-rose-950 text-xs font-semibold flex items-center gap-2 shadow-[2px_2px_0px_rgba(225,29,72,0.2)]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                  <span>{authError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isVerifying}
                className="w-full py-3.5 px-4 rounded-xl bg-[#fee6e3] hover:bg-[#ffdeda] border-2 border-[#111111] text-[#111827] font-extrabold text-sm tracking-wide shadow-[4px_4px_0px_#111111] hover:shadow-[5px_5px_0px_#111111] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_#111111] transition-all disabled:opacity-50"
              >
                {isVerifying ? "Verifying Firebase Auth..." : "Log In with Firebase"}
              </button>
            </form>
          )}

          <div className="mt-8 pt-6 border-t-2 border-dashed border-[#111111]/20 text-center">
            <a href="/" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#111827] hover:underline bg-white border-1.5 border-[#111111] px-3 py-1.5 rounded-lg shadow-[2px_2px_0px_#111111]">
              <span>← Return to Public Homepage</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-[#111827] p-4 sm:p-8 font-sans relative z-10">
      {saveSuccessMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#dcfce7] border-2 border-[#166534] text-[#14532d] font-bold text-xs px-4 py-3 rounded-xl shadow-[4px_4px_0px_#111111] flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
          {saveSuccessMsg}
        </div>
      )}

      <header className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-white/95 backdrop-blur-md border-2 border-[#111111] rounded-2xl p-5 sm:p-6 shadow-[5px_5px_0px_#111111]">
        <div className="flex items-center gap-3.5">
          <a href="/" title="The Kiruu Homepage">
            <img src="/logo.png" alt="The Kiruu" className="h-12 w-auto cursor-pointer hover:scale-105 transition-transform" />
          </a>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-['Vandelvira',Georgia,serif] text-[#111827]">KIRUU CONSOLE</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-[#fee6e3] text-[#111827] text-[10px] font-black tracking-wider uppercase border border-[#111111]">
                v4.0
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#475569] font-medium">Sublink kill switches, master control &amp; live system telemetry</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border-2 border-[#111111] text-xs shadow-[2px_2px_0px_#111111]">
            <span className={`w-2.5 h-2.5 rounded-full ${rtdbStatus === 'connected' ? 'bg-emerald-600' : 'bg-amber-600'}`} />
            <span className="font-bold text-[#111827]">
              {rtdbStatus === 'connected' ? 'CLOUD: LIVE' : 'CLOUD: SYNCING'}
            </span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border-2 border-[#111111] text-xs shadow-[2px_2px_0px_#111111]">
            <span className={`w-2.5 h-2.5 rounded-full ${masterSwitch ? 'bg-emerald-600' : 'bg-rose-600'}`} />
            <span className="font-bold text-[#111827]">
              {masterSwitch ? 'ALL SYSTEMS ONLINE' : 'GLOBAL KILL SWITCH ACTIVE'}
            </span>
          </div>

          {currentUser && (
            <span className="text-xs text-[#111827] font-mono font-semibold bg-slate-100 px-2.5 py-1 rounded-lg border-1.5 border-[#111111] hidden sm:inline-block">
              {currentUser.email}
            </span>
          )}

          <button
            onClick={handleLogout}
            className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-rose-50 border-2 border-[#991b1b] text-[#991b1b] text-xs font-bold shadow-[2px_2px_0px_#991b1b] hover:shadow-[3px_3px_0px_#991b1b] active:translate-x-[1px] active:translate-y-[1px] transition flex items-center gap-1.5"
            title="Lock Console and End Session"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            Lock Console
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto space-y-8">
        <div className="flex gap-2.5 flex-wrap">
          <button
            onClick={() => setActiveTab('sublinks')}
            className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition flex items-center gap-2 border-2 border-[#111111] ${
              activeTab === 'sublinks'
                ? 'bg-[#fee6e3] text-[#111827] shadow-[3px_3px_0px_#111111]'
                : 'bg-white text-[#475569] shadow-[2px_2px_0px_#111111] hover:bg-slate-50'
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
            Sublink Kill Switches ({activeCount}/{totalSublinks} Active)
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition flex items-center gap-2 border-2 border-[#111111] ${
              activeTab === 'analytics'
                ? 'bg-[#fee6e3] text-[#111827] shadow-[3px_3px_0px_#111111]'
                : 'bg-white text-[#475569] shadow-[2px_2px_0px_#111111] hover:bg-slate-50'
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
            Telemetry &amp; Analytics
          </button>
        </div>

        {activeTab === 'sublinks' && (
          <div className="space-y-6">
            <div className={`p-6 sm:p-8 rounded-2xl border-2 transition-all duration-300 ${
              masterSwitch 
                ? 'bg-white/95 border-[#111111] shadow-[6px_6px_0px_#111111]' 
                : 'bg-rose-50/95 border-[#991b1b] shadow-[6px_6px_0px_#991b1b]'
            }`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase border ${
                      masterSwitch 
                        ? 'bg-emerald-100 border-emerald-700 text-emerald-900' 
                        : 'bg-rose-200 border-rose-800 text-rose-950'
                    }`}>
                      {masterSwitch ? "STATUS: NORMAL OPERATION" : "EMERGENCY: ALL SUBLINKS OFFLINE"}
                    </span>
                    <span className="text-xs text-[#475569] font-mono font-semibold">
                      rnl-devdump.github.io / kiruu.xyz
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold font-['Vandelvira',Georgia,serif] text-[#111827]">
                    Master Kill Switch
                  </h2>
                  <p className="text-xs sm:text-sm text-[#334155] font-medium max-w-2xl">
                    {masterSwitch 
                      ? "All sublinks follow their individual toggle configurations below. Engaging the master switch will immediately deactivate every sublink globally." 
                      : "The master kill switch is ENGAGED. Every visitor attempting to open any sublink will receive the service offline notice."}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={toggleMasterSwitch}
                    className={`px-6 py-3.5 rounded-xl font-extrabold text-xs sm:text-sm tracking-wide uppercase transition border-2 border-[#111111] flex items-center gap-2 ${
                      masterSwitch
                        ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-[4px_4px_0px_#111111] hover:shadow-[5px_5px_0px_#111111] active:translate-x-[2px] active:translate-y-[2px]'
                        : 'bg-emerald-400 hover:bg-emerald-300 text-[#111827] shadow-[4px_4px_0px_#111111] hover:shadow-[5px_5px_0px_#111111] active:translate-x-[2px] active:translate-y-[2px]'
                    }`}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path><line x1="12" y1="2" x2="12" y2="12"></line></svg>
                    {masterSwitch ? "Engage Kill Switch (Off All)" : "Restore Master Switch"}
                  </button>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setAllSublinks(true)}
                      className="px-3.5 py-3 rounded-xl bg-white hover:bg-slate-50 border-2 border-[#111111] text-xs font-bold text-[#111827] shadow-[2px_2px_0px_#111111] transition"
                      title="Turn ON all sublinks"
                    >
                      Turn All On
                    </button>
                    <button
                      onClick={() => setAllSublinks(false)}
                      className="px-3.5 py-3 rounded-xl bg-rose-50 hover:bg-rose-100 border-2 border-[#991b1b] text-xs font-bold text-rose-900 shadow-[2px_2px_0px_#991b1b] transition"
                      title="Turn OFF all sublinks"
                    >
                      Turn All Off
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Page Admin Announcement Banner (Top 5s Auto-Fade) */}
            <div className={`p-6 sm:p-8 rounded-3xl border transition-all duration-300 ${
              adminBanner.enabled && adminBanner.message
                ? 'bg-gradient-to-r from-amber-950/40 via-orange-950/20 to-[#0d121c] border-amber-500/30 shadow-xl'
                : 'bg-[#0d121c] border-white/10 shadow-xl'
            } space-y-6`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase border flex items-center gap-2 ${
                      adminBanner.enabled && adminBanner.message
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                        : 'bg-slate-800/80 border-slate-700 text-slate-400'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${adminBanner.enabled && adminBanner.message ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                      {adminBanner.enabled && adminBanner.message ? "BROADCAST ACTIVE (5s AUTO-FADE)" : "BROADCAST MUTED"}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      kiruu.xyz (index.html)
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="text-amber-400">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                      <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                    </svg>
                    Main Page Admin Announcement
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
                    Configure and deploy an admin banner pinned to the top of the main portal. When users land on the page, the message is displayed and automatically fades out after 5 seconds of visibility.
                  </p>
                </div>

                <div className="flex items-center gap-3 self-start md:self-auto">
                  <button
                    type="button"
                    onClick={() => deployAdminBanner({ enabled: !adminBanner.enabled })}
                    disabled={adminBannerDeploying}
                    className={`px-5 py-3 rounded-2xl font-black text-xs sm:text-sm tracking-wide uppercase transition active:scale-95 shadow-lg flex items-center gap-2 ${
                      adminBanner.enabled
                        ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
                        : 'bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-300 hover:to-orange-300 text-slate-950 shadow-amber-500/20'
                    }`}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      {adminBanner.enabled ? (
                        <circle cx="12" cy="12" r="10" />
                      ) : (
                        <polygon points="5 3 19 12 5 21 5 3" />
                      )}
                    </svg>
                    {adminBanner.enabled ? "Mute / Turn Off" : "Enable Broadcast"}
                  </button>
                </div>
              </div>

              {/* Message Input & Tone Controls */}
              <div className="space-y-4 pt-2 border-t border-white/5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      Announcement Message Text
                    </label>
                    <span className="text-[11px] font-mono text-slate-500">
                      {adminBannerMsgInput.length} chars
                    </span>
                  </div>
                  <textarea
                    rows={2}
                    value={adminBannerMsgInput}
                    onChange={(e) => setAdminBannerMsgInput(e.target.value)}
                    placeholder="Enter broadcast message here (e.g. Scheduled maintenance on AI translation engine tonight at 10:00 PM UTC. Other apps remain unaffected.)"
                    className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white text-sm focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 placeholder:text-slate-600 transition"
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Variant Selection */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Banner Tone &amp; Palette
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { key: 'info', label: 'Notice (Peach)', bg: 'bg-[#fee6e3] text-slate-900 border-amber-300' },
                        { key: 'warning', label: 'Maintenance (Amber)', bg: 'bg-[#fef3c7] text-amber-950 border-amber-400' },
                        { key: 'alert', label: 'Urgent Alert (Rose)', bg: 'bg-[#ffe4e6] text-rose-950 border-rose-400' },
                        { key: 'success', label: 'Update (Emerald)', bg: 'bg-[#d1fae5] text-emerald-950 border-emerald-400' },
                      ].map(v => (
                        <button
                          key={v.key}
                          type="button"
                          onClick={() => setAdminBannerVariant(v.key)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
                            adminBannerVariant === v.key
                              ? `${v.bg} shadow-md scale-105 border-2`
                              : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                          }`}
                        >
                          <span className="w-2 h-2 rounded-full border border-black/20" style={{
                            backgroundColor: v.key === 'info' ? '#f43f5e' : v.key === 'warning' ? '#f59e0b' : v.key === 'alert' ? '#e11d48' : '#10b981'
                          }} />
                          {v.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Quick Presets
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setAdminBannerMsgInput("Scheduled maintenance on TAWIR & Dataset Annotator tonight from 10:00 PM to 11:30 PM UTC.");
                          setAdminBannerVariant("warning");
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-slate-300 font-medium transition"
                      >
                        Maintenance
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAdminBannerMsgInput("New release: Vibe Video calling & Chess WebAssembly are now fully live!");
                          setAdminBannerVariant("success");
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-slate-300 font-medium transition"
                      >
                        New Release
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAdminBannerMsgInput("Notice: Network telemetry monitoring active. All services operating normally.");
                          setAdminBannerVariant("info");
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-slate-300 font-medium transition"
                      >
                        Notice
                      </button>
                    </div>
                  </div>
                </div>

                {/* Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/5">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => deployAdminBanner({ enabled: true })}
                      disabled={adminBannerDeploying || !adminBannerMsgInput.trim()}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-slate-950 font-black text-xs uppercase tracking-wider transition shadow-lg shadow-cyan-500/20 flex items-center gap-2"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M22 2L11 13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                      </svg>
                      {adminBannerDeploying ? "Deploying to Cloud..." : "Deploy & Broadcast Now"}
                    </button>

                    <button
                      type="button"
                      onClick={triggerAdminBannerPreview}
                      className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-200 transition flex items-center gap-1.5"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" /><polygon points="10 8 16 12 10 16 10 8" />
                      </svg>
                      {previewActive ? "Replaying 5s Fade..." : "Test 5s Fade Preview"}
                    </button>
                  </div>

                  {adminBanner.updatedAt && (
                    <span className="text-[11px] text-slate-500 font-mono">
                      Last deployed: {new Date(adminBanner.updatedAt).toLocaleTimeString()}
                    </span>
                  )}
                </div>

                {/* Live Preview Neo-Brutalist Box */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                      Live Main Page Banner Preview
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Visual preview of top banner on index.html
                    </span>
                  </div>

                  <div className="p-4 sm:p-5 rounded-2xl bg-[#090d15] border border-white/5 relative overflow-hidden flex flex-col items-center justify-center min-h-[96px]">
                    <div
                      style={{
                        backgroundColor:
                          adminBannerVariant === 'warning' ? '#fef3c7' :
                          adminBannerVariant === 'alert' ? '#ffe4e6' :
                          adminBannerVariant === 'success' ? '#d1fae5' : '#fee6e3',
                        color: '#111827',
                        border: '2px solid #111111',
                        borderRadius: '14px',
                        boxShadow: '4px 4px 0 #111111',
                        transition: 'opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
                      }}
                      className={`w-full max-w-3xl p-3 sm:px-4 flex items-center justify-between gap-3 text-slate-900 ${
                        previewFaded ? 'opacity-0 -translate-y-4 pointer-events-none' : 'opacity-100 translate-y-0'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          style={{
                            backgroundColor:
                              adminBannerVariant === 'warning' ? '#b45309' :
                              adminBannerVariant === 'alert' ? '#e11d48' :
                              adminBannerVariant === 'success' ? '#059669' : '#111111',
                            color: '#ffffff',
                            border: '1.5px solid #111111'
                          }}
                          className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider shrink-0"
                        >
                          {adminBannerVariant === 'warning' ? 'MAINTENANCE' :
                           adminBannerVariant === 'alert' ? 'URGENT ALERT' :
                           adminBannerVariant === 'success' ? 'UPDATE' : 'NOTICE'}
                        </span>
                        <p className="text-xs sm:text-sm font-semibold truncate text-[#111827]">
                          {adminBannerMsgInput.trim() || "Your admin message will appear here in high contrast..."}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="w-10 sm:w-12 h-1.5 rounded-full bg-black/15 overflow-hidden border border-black/20">
                          <div
                            style={{
                              transition: previewActive ? 'width 5s linear' : 'none',
                              width: previewActive ? '0%' : '100%'
                            }}
                            className="h-full bg-[#111111] rounded-full"
                          />
                        </div>
                        <div
                          style={{
                            boxShadow: '2px 2px 0 #111111',
                            border: '1.5px solid #111111'
                          }}
                          className="w-6 h-6 rounded-md bg-white flex items-center justify-center text-xs font-bold text-slate-900"
                        >
                          &times;
                        </div>
                      </div>
                    </div>

                    {previewFaded && (
                      <span className="text-[11px] text-amber-300 font-mono mt-2 animate-pulse">
                        [Banner faded out after 5 seconds of visibility]
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Dynamic Service Registration Panel */}
            <div className="p-6 rounded-2xl bg-white/95 border-2 border-[#111111] shadow-[5px_5px_0px_#111111] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-[#111827] flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-600" />
                    Register New App / Service Key
                  </h3>
                  <p className="text-xs text-[#475569] mt-0.5 font-medium">
                    Dynamically create arbitrary killswitch flags across RTDB &amp; Firestore. Drop into your app: <code className="text-[#1e40af] bg-slate-100 px-1 py-0.5 rounded border border-slate-300 font-mono text-[11px]">&lt;script src="/killswitch.js" data-service="key"&gt;&lt;/script&gt;</code>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="px-4 py-2 rounded-xl bg-[#fee6e3] hover:bg-[#ffdeda] border-2 border-[#111111] text-[#111827] text-xs font-bold shadow-[2px_2px_0px_#111111] transition flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                  {showAddForm ? "Close Form" : "+ Add Service"}
                </button>
              </div>

              {showAddForm && (
                <form onSubmit={registerNewService} className="pt-4 border-t-2 border-dashed border-[#111111]/20 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-[#475569] mb-1">
                        Service Key Slug *
                      </label>
                      <input
                        type="text"
                        required
                        value={newServiceKey}
                        onChange={(e) => {
                          const k = e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "");
                          setNewServiceKey(k);
                          if (!newServicePath) setNewServicePath(`/${k}`);
                        }}
                        placeholder="e.g. tawir-quiz"
                        className="w-full bg-white border-2 border-[#111111] rounded-xl px-3.5 py-2 text-xs text-[#111827] placeholder:text-slate-400 focus:outline-none focus:shadow-[2px_2px_0px_#111111] font-mono shadow-[1px_1px_0px_#111111]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-[#475569] mb-1">
                        Display Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={newServiceName}
                        onChange={(e) => setNewServiceName(e.target.value)}
                        placeholder="e.g. TAWIR Quiz Game"
                        className="w-full bg-white border-2 border-[#111111] rounded-xl px-3.5 py-2 text-xs text-[#111827] placeholder:text-slate-400 focus:outline-none focus:shadow-[2px_2px_0px_#111111] shadow-[1px_1px_0px_#111111]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-[#475569] mb-1">
                        Category
                      </label>
                      <select
                        value={newServiceCategory}
                        onChange={(e) => setNewServiceCategory(e.target.value)}
                        className="w-full bg-white border-2 border-[#111111] rounded-xl px-3.5 py-2 text-xs text-[#111827] focus:outline-none focus:shadow-[2px_2px_0px_#111111] shadow-[1px_1px_0px_#111111]"
                      >
                        <option value="AI Assistant">AI Assistant</option>
                        <option value="Media">Media</option>
                        <option value="Data Tool">Data Tool</option>
                        <option value="Quality">Quality</option>
                        <option value="Game">Game</option>
                        <option value="Finance">Finance</option>
                        <option value="Social">Social</option>
                        <option value="Utility">Utility</option>
                        <option value="Custom">Custom</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-[#475569] mb-1">
                        Path Route
                      </label>
                      <input
                        type="text"
                        value={newServicePath}
                        onChange={(e) => setNewServicePath(e.target.value)}
                        placeholder="e.g. /tawir-quiz"
                        className="w-full bg-white border-2 border-[#111111] rounded-xl px-3.5 py-2 text-xs text-[#111827] placeholder:text-slate-400 focus:outline-none focus:shadow-[2px_2px_0px_#111111] font-mono shadow-[1px_1px_0px_#111111]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-[#475569] mb-1">
                      Maintenance Notice (Offline Message)
                    </label>
                    <input
                      type="text"
                      value={newServiceMsg}
                      onChange={(e) => setNewServiceMsg(e.target.value)}
                      placeholder="e.g. This application is offline for scheduled maintenance."
                      className="w-full bg-white border-2 border-[#111111] rounded-xl px-3.5 py-2 text-xs text-[#111827] placeholder:text-slate-400 focus:outline-none focus:shadow-[2px_2px_0px_#111111] shadow-[1px_1px_0px_#111111]"
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="px-4 py-2 rounded-xl bg-white border-2 border-[#111111] text-xs font-bold text-[#475569] hover:bg-slate-50 transition shadow-[2px_2px_0px_#111111]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-[#111827] border-2 border-[#111111] text-xs font-extrabold transition shadow-[3px_3px_0px_#111111]"
                    >
                      Save &amp; Register Service
                    </button>
                  </div>
                </form>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-white/95 border-2 border-[#111111] shadow-[4px_4px_0px_#111111]">
                <span className="text-xs text-[#475569] font-bold uppercase tracking-wider">Total Sublinks</span>
                <p className="text-2xl font-black text-[#111827] font-mono mt-1">{totalSublinks}</p>
              </div>
              <div className="p-5 rounded-2xl bg-white/95 border-2 border-emerald-700 shadow-[4px_4px_0px_#047857]">
                <span className="text-xs text-emerald-800 font-bold uppercase tracking-wider">Services Active</span>
                <p className="text-2xl font-black text-emerald-800 font-mono mt-1">{activeCount}</p>
              </div>
              <div className="p-5 rounded-2xl bg-white/95 border-2 border-rose-700 shadow-[4px_4px_0px_#be123c]">
                <span className="text-xs text-rose-800 font-bold uppercase tracking-wider">Services Disabled</span>
                <p className="text-2xl font-black text-rose-800 font-mono mt-1">{disabledCount}</p>
              </div>
              <div className="p-5 rounded-2xl bg-white/95 border-2 border-[#111111] shadow-[4px_4px_0px_#111111]">
                <span className="text-xs text-[#475569] font-bold uppercase tracking-wider">Network Guard</span>
                <p className="text-base font-black text-[#111827] font-mono mt-2 truncate">
                  {masterSwitch ? (disabledCount === 0 ? "100% ONLINE" : "PARTIAL OFFLINE") : "KILL SWITCH ON"}
                </p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-white/95 border-2 border-[#111111] shadow-[4px_4px_0px_#111111]">
              <div className="flex flex-1 flex-wrap items-center gap-3">
                <div className="relative min-w-[240px] flex-1 max-w-md">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search sublink by name, slug or category..."
                    className="w-full bg-white border-2 border-[#111111] rounded-xl px-4 py-2.5 text-xs text-[#111827] placeholder:text-slate-400 focus:outline-none focus:shadow-[3px_3px_0px_#111111] shadow-[2px_2px_0px_#111111]"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-black font-bold text-xs">✕</button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border border-[#111111] ${
                        selectedCategory === cat
                          ? 'bg-[#fee6e3] text-[#111827] shadow-[2px_2px_0px_#111111]'
                          : 'bg-white text-[#475569] hover:bg-slate-50'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1 p-1 rounded-xl bg-white border-2 border-[#111111] shadow-[2px_2px_0px_#111111]">
                  {['ALL', 'ONLINE', 'OFFLINE'].map(f => (
                    <button
                      key={f}
                      onClick={() => setStatusFilter(f)}
                      className={`px-3 py-1 rounded-md text-[11px] font-bold transition ${
                        statusFilter === f
                          ? 'bg-[#fee6e3] text-[#111827] border border-[#111111] shadow-[1px_1px_0px_#111111]'
                          : 'text-[#64748b] hover:text-[#111827]'
                      }`}
                    >
                      {f === 'ALL' ? 'All' : f === 'ONLINE' ? '● Live' : '● Turned Off'}
                    </button>
                  ))}
                </div>

                <button
                  onClick={downloadConfigJSON}
                  className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border-2 border-[#111111] text-xs font-bold text-[#111827] shadow-[2px_2px_0px_#111111] transition flex items-center gap-1.5"
                  title="Download sublinks.json to commit to GitHub Pages"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Export JSON
                </button>

                <button
                  onClick={copyConfigJSON}
                  className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border-2 border-[#111111] text-xs font-bold text-[#111827] shadow-[2px_2px_0px_#111111] transition flex items-center gap-1.5"
                  title="Copy full JSON configuration to clipboard"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  Copy JSON
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredSublinks.map(([key, item]) => {
                const isOnline = item.enabled && masterSwitch;

                return (
                  <div
                    key={key}
                    className={`rounded-2xl p-5 border-2 transition-all duration-200 flex flex-col justify-between ${
                      isOnline
                        ? 'bg-white/95 border-[#111111] shadow-[4px_4px_0px_#111111] hover:shadow-[6px_6px_0px_#111111]'
                        : 'bg-rose-50/90 border-[#991b1b] shadow-[4px_4px_0px_#991b1b]'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 border border-[#111111] text-[10px] font-black tracking-wider uppercase text-[#111827]">
                            {item.category}
                          </span>
                          <a
                            href={item.path + '/'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-mono font-bold text-[#1e40af] hover:underline flex items-center gap-1"
                            title="Open sublink in new tab"
                          >
                            {item.path}
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                          </a>
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleSublink(key)}
                          className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-[#111111] transition-colors duration-200 ease-in-out focus:outline-none shadow-[2px_2px_0px_#111111] ${
                            item.enabled ? 'bg-emerald-400' : 'bg-slate-300'
                          }`}
                          title={item.enabled ? 'Click to turn off' : 'Click to turn on'}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-[#111111] shadow transition duration-200 ease-in-out mt-[2px] ml-[2px] ${
                              item.enabled ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>

                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-1.5">
                          <h3 className="text-lg font-bold font-['Vandelvira',Georgia,serif] text-[#111827]">{item.name}</h3>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-extrabold tracking-wide uppercase border ${
                            isOnline
                              ? 'bg-emerald-100 border-emerald-700 text-emerald-900'
                              : 'bg-rose-100 border-rose-700 text-rose-900'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              isOnline ? 'bg-emerald-600' : 'bg-rose-600'
                            }`} />
                            {isOnline ? 'Live' : 'Turned Off'}
                          </span>
                        </div>
                        <p className="text-xs text-[#334155] leading-relaxed line-clamp-2 font-medium">
                          {item.description}
                        </p>
                      </div>

                      <div className="mb-4 flex items-center justify-between text-xs pt-3 border-t border-slate-200">
                        <span className="text-[#475569] font-medium">Status reason:</span>
                        <span className={`font-bold px-2 py-0.5 rounded-md border ${
                          isOnline 
                            ? 'bg-emerald-50 text-emerald-900 border-emerald-300' 
                            : 'bg-rose-50 text-rose-900 border-rose-300'
                        }`}>
                          {isOnline ? 'Enabled' : (!masterSwitch ? 'Master kill switch' : 'Manually disabled')}
                        </span>
                      </div>
                    </div>

                    <div className="mt-2 pt-3 border-t border-slate-200">
                      <label className="block text-[10px] uppercase font-bold text-[#475569] mb-1.5">
                        Offline Visitor Message
                      </label>
                      <input
                        type="text"
                        value={item.message || ''}
                        onChange={(e) => updateSublinkMessage(key, e.target.value)}
                        placeholder="Notice shown when offline..."
                        className="w-full bg-[#f8fafc] border border-[#111111] rounded-lg px-3 py-1.5 text-xs text-[#111827] placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-black"
                      />
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-200 flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5 font-mono text-slate-500 truncate max-w-[200px]">
                        <span className="bg-slate-100 border border-slate-300 px-1.5 py-0.5 rounded text-[#111827]">/{key}</span>
                        <span className="text-[10px] text-slate-500">data-service="{key}"</span>
                      </div>

                      {item.isDynamic && (
                        <button
                          type="button"
                          onClick={() => deleteService(key)}
                          className="text-rose-700 hover:text-rose-900 font-bold text-xs px-2 py-0.5 rounded border border-rose-300 bg-rose-50 hover:bg-rose-100 transition"
                          title="Remove this dynamic service"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard 
                title="Total Visits Logged" 
                value={stats.totalVisits} 
                icon={<UsersIcon />} 
              />
              <StatCard 
                title="Visits Today" 
                value={stats.visitsToday} 
                icon={<ZapIcon />} 
              />
              <StatCard 
                title="Total Kiruu AI Queries" 
                value={stats.totalAiQueries} 
                icon={<SparklesIcon />} 
              />
              <StatCard 
                title="AI Queries Today" 
                value={stats.aiToday} 
                icon={<FlameIcon />} 
              />
            </div>

            <section className="bg-white/95 rounded-2xl p-6 border-2 border-[#111111] shadow-[5px_5px_0px_#111111]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-2">
                <div className="flex items-center gap-2">
                  <FlameIcon className="w-5 h-5 text-amber-600" />
                  <h2 className="text-lg font-bold font-['Vandelvira',Georgia,serif] text-[#111827]">Activity Heatmap</h2>
                  <span className="text-xs font-semibold text-[#475569]">(Peak Usage Hours &amp; Days)</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#475569] font-bold">
                  <span>Less</span>
                  <div className="flex gap-1 items-center">
                    <span className="w-3.5 h-3.5 rounded bg-slate-100 border border-slate-300" />
                    <span className="w-3.5 h-3.5 rounded bg-emerald-100 border border-emerald-300" />
                    <span className="w-3.5 h-3.5 rounded bg-emerald-300 border border-emerald-500" />
                    <span className="w-3.5 h-3.5 rounded bg-emerald-500 border border-emerald-700" />
                    <span className="w-3.5 h-3.5 rounded bg-emerald-700 border border-emerald-950" />
                  </div>
                  <span>More</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <div className="min-w-[650px]">
                  <div className="grid grid-cols-25 gap-1 mb-2 text-[10px] text-[#475569] font-bold text-center">
                    <div className="text-left font-bold text-[#111827]">Day / Hr</div>
                    {HOURS.map(h => (
                      <div key={h}>{h < 10 ? `0${h}` : h}</div>
                    ))}
                  </div>

                  {DAYS.map((dayName, dayIdx) => (
                    <div key={dayName} className="grid grid-cols-25 gap-1 mb-1 items-center">
                      <div className="text-xs font-bold text-[#111827] text-left">{dayName}</div>
                      {HOURS.map(hour => {
                        const count = stats.heatmap[dayIdx][hour];
                        const ratio = count / stats.maxCellCount;

                        let bg = 'bg-slate-100 border border-slate-200 text-transparent';
                        if (count > 0) {
                          if (ratio > 0.75) bg = 'bg-emerald-700 border border-emerald-950 text-white font-black';
                          else if (ratio > 0.4) bg = 'bg-emerald-500 border border-emerald-700 text-white font-bold';
                          else if (ratio > 0.15) bg = 'bg-emerald-300 border border-emerald-500 text-emerald-950 font-bold';
                          else bg = 'bg-emerald-100 border border-emerald-300 text-emerald-900 font-semibold';
                        }

                        return (
                          <div
                            key={hour}
                            title={`${dayName} at ${hour}:00 - ${count} events`}
                            className={`h-7 rounded flex items-center justify-center text-[10px] transition-colors cursor-default ${bg}`}
                          >
                            {count > 0 ? count : ''}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white/95 rounded-2xl p-6 border-2 border-[#111111] shadow-[4px_4px_0px_#111111]">
                <h3 className="text-sm font-bold text-[#111827] mb-4 flex items-center gap-2">
                  <DesktopIcon className="w-4 h-4 text-indigo-600" />
                  Device Breakdown
                </h3>
                <div className="space-y-3">
                  {Object.entries(stats.devices).map(([dev, count]) => {
                    const pct = stats.totalVisits ? Math.round((count / stats.totalVisits) * 100) : 0;
                    return (
                      <div key={dev} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="flex items-center gap-2 text-[#111827] font-semibold">
                            <DeviceIcon deviceType={dev} className="w-3.5 h-3.5 text-slate-500" />
                            {dev}
                          </span>
                          <span className="font-extrabold text-[#111827]">{count} ({pct}%)</span>
                        </div>
                        <div className="h-2 bg-slate-100 border border-slate-300 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white/95 rounded-2xl p-6 border-2 border-[#111111] shadow-[4px_4px_0px_#111111]">
                <h3 className="text-sm font-bold text-[#111827] mb-4 flex items-center gap-2">
                  <svg className="w-4 h-4 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="4" width="16" height="16" rx="2"/><line x1="4" y1="9" x2="20" y2="9"/><line x1="9" y1="4" x2="9" y2="20"/></svg>
                  Operating Systems
                </h3>
                <div className="space-y-3">
                  {Object.entries(stats.osMap).map(([os, count]) => {
                    const pct = stats.totalVisits ? Math.round((count / stats.totalVisits) * 100) : 0;
                    return (
                      <div key={os} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="flex items-center gap-2 text-[#111827] font-semibold">
                            <OsLogo os={os} className="w-3.5 h-3.5" />
                            {os || 'Unknown'}
                          </span>
                          <span className="font-extrabold text-[#111827]">{count} ({pct}%)</span>
                        </div>
                        <div className="h-2 bg-slate-100 border border-slate-300 rounded-full overflow-hidden">
                          <div className="h-full bg-purple-600 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white/95 rounded-2xl p-6 border-2 border-[#111111] shadow-[4px_4px_0px_#111111]">
                <h3 className="text-sm font-bold text-[#111827] mb-4 flex items-center gap-2">
                  <GlobeIcon className="w-4 h-4 text-emerald-600" />
                  Top Browsers
                </h3>
                <div className="space-y-3">
                  {Object.entries(stats.browserMap).map(([b, count]) => {
                    const pct = stats.totalVisits ? Math.round((count / stats.totalVisits) * 100) : 0;
                    return (
                      <div key={b} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="flex items-center gap-2 text-[#111827] font-semibold">
                            <BrowserLogo browser={b} className="w-3.5 h-3.5" />
                            {b || 'Unknown'}
                          </span>
                          <span className="font-extrabold text-[#111827]">{count} ({pct}%)</span>
                        </div>
                        <div className="h-2 bg-slate-100 border border-slate-300 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({ title, value, icon }) {
  return (
    <div className="rounded-2xl p-5 bg-white/95 border-2 border-[#111111] shadow-[4px_4px_0px_#111111] relative overflow-hidden">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-[#475569] uppercase tracking-wider">{title}</span>
        <div className="p-2 rounded-xl bg-[#fee6e3] border border-[#111111] text-[#111827]">{icon}</div>
      </div>
      <p className="text-3xl font-black text-[#111827] font-mono mt-3 tracking-tight">{value}</p>
    </div>
  );
}

function UsersIcon(props) {
  return (
    <svg {...props} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function ZapIcon(props) {
  return (
    <svg {...props} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function SparklesIcon(props) {
  return (
    <svg {...props} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6l2.1 2.1M5.6 18.4l2.1-2.1m8.6-8.6l2.1-2.1" />
    </svg>
  );
}

function FlameIcon(props) {
  return (
    <svg {...props} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  );
}

function DesktopIcon(props) {
  return (
    <svg {...props} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}

function MobileIcon(props) {
  return (
    <svg {...props} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  );
}

function TabletIcon(props) {
  return (
    <svg {...props} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  );
}

function GlobeIcon(props) {
  return (
    <svg {...props} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function DeviceIcon({ deviceType, className = "w-4 h-4" }) {
  if (deviceType === 'Mobile') return <MobileIcon className={className} />;
  if (deviceType === 'Tablet') return <TabletIcon className={className} />;
  return <DesktopIcon className={className} />;
}

function OsLogo({ os, className = "w-4 h-4" }) {
  const osLower = (os || '').toLowerCase();
  if (osLower.includes('win')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M0 3.449L9.75 2.1v9.451H0m10.95-9.606L24 0v11.4H10.95M0 12.6h9.75v9.451L0 20.699M10.95 12.6H24V24l-13.05-1.8" />
      </svg>
    );
  }
  if (osLower.includes('mac') || osLower.includes('ios')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.32c.66-.8 1.11-1.92.99-3.04-.96.04-2.12.64-2.8 1.44-.61.71-1.14 1.86-.99 2.97 1.07.08 2.15-.55 2.8-1.37z" />
      </svg>
    );
  }
  if (osLower.includes('android')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M6 18c0 .55.45 1 1 1h1v3c0 .55.45 1 1 1s1-.45 1-1v-3h4v3c0 .55.45 1 1 1s1-.45 1-1v-3h1c.55 0 1-.45 1-1V9H6v9zm12.75-12.87l1.7-1.7a.499.499 0 1 0-.71-.71l-1.89 1.89C16.32 3.82 14.28 3.33 12 3.33s-4.32.49-5.85 1.28L4.26 2.72a.499.499 0 1 0-.71.71l1.7 1.7C3.42 6.78 2.25 9.24 2.05 12h19.9c-.2-2.76-1.37-5.22-3.2-6.87zM8 9c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm8 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" />
      </svg>
    );
  }
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  );
}

function BrowserLogo({ browser, className = "w-4 h-4" }) {
  const bLower = (browser || '').toLowerCase();
  if (bLower.includes('chrome')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm0 4.5c2.48 0 4.67 1.13 6.1 2.91h-7.61L8.25 11.7l-3.3-5.71C6.72 4.96 9.22 4.5 12 4.5zm-7.5 7.5c0-1.46.39-2.83 1.07-4.02l3.86 6.69L6.5 19.5A7.47 7.47 0 0 1 4.5 12zm7.5 7.5c-2.48 0-4.67-1.13-6.1-2.91h7.61l2.24-4.29 3.3 5.71a7.47 7.47 0 0 1-7.05 1.49zm2.4-5.4a3.6 3.6 0 1 1 0-4.2 3.6 3.6 0 0 1 0 4.2z" />
      </svg>
    );
  }
  if (bLower.includes('safari')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
      </svg>
    );
  }
  if (bLower.includes('firefox')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm3.8 14.8a5.5 5.5 0 0 1-7.6-7.6 5.5 5.5 0 0 1 7.6 7.6z" />
      </svg>
    );
  }
  if (bLower.includes('edge')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M0 12c0 6.627 5.373 12 12 12 5.5 0 10.1-3.7 11.5-8.8-1.5 1.7-3.8 2.8-6.5 2.8-4.4 0-8-3.6-8-8 0-1.8.6-3.4 1.6-4.7C4.4 6.7 0 9.1 0 12z" />
      </svg>
    );
  }
  return <GlobeIcon className={className} />;
}
