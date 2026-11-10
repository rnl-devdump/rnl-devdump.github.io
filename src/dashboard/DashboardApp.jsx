import React, { useState, useEffect, useCallback, useRef } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, onSnapshot } from "firebase/firestore";

import { auth, db } from "../lib/firebase.js";
import {
  INITIAL_SUBLINKS,
  verifyAdminAuthorization,
  mergeRemoteSublinks,
} from "./config/servicesCatalog.js";
import {
  SITE_CONFIG_COLLECTION,
  SITE_STATUS_DOC_ID,
  LEGACY_STATUS_COLLECTION,
  LEGACY_STATUS_DOC_ID,
  commitEcosystemStatusTransaction,
  subscribeToAuditLog,
} from "./services/statusService.js";

import LoginView from "./components/LoginView.jsx";
import ServicesTab from "./components/ServicesTab.jsx";
import ConversationsTab from "./components/ConversationsTab.jsx";
import TelemetryTab from "./components/TelemetryTab.jsx";
import AuditLogTab from "./components/AuditLogTab.jsx";

const VALID_TABS = ["sublinks", "conversations", "analytics", "audit"];

function resolveTabFromHash() {
  if (typeof window === "undefined") return "sublinks";
  const raw = (window.location.hash || "").replace(/^#\/?/, "").trim().toLowerCase();
  return VALID_TABS.includes(raw) ? raw : "sublinks";
}

function parseRemoteStatusDoc(data) {
  if (!data || typeof data !== "object") return null;
  let parsed = data;
  if (typeof data.configJson === "string") {
    try {
      parsed = { ...JSON.parse(data.configJson), ...data };
    } catch (_) {}
  }
  const rawServices = parsed.services || parsed.sublinks || {};
  return {
    version: typeof parsed.version === "number" ? parsed.version : 1,
    masterSwitch: parsed.masterSwitch !== undefined ? Boolean(parsed.masterSwitch) : true,
    adminAnnouncement: parsed.adminAnnouncement || {
      enabled: false,
      message: "",
      variant: "info",
    },
    sublinks: mergeRemoteSublinks(rawServices),
  };
}

export default function DashboardApp() {
  const [authReady, setAuthReady] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [activeTab, setActiveTab] = useState(resolveTabFromHash);

  const [masterSwitch, setMasterSwitch] = useState(true);
  const [sublinks, setSublinks] = useState(() => mergeRemoteSublinks(INITIAL_SUBLINKS));
  const [adminBanner, setAdminBanner] = useState({
    enabled: false,
    message: "",
    variant: "info",
  });
  const [syncState, setSyncState] = useState({
    status: "idle", // idle | saving | saved | error
    version: 1,
    error: "",
  });

  const [auditEntries, setAuditEntries] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const lastMutationRef = useRef(null);

  useEffect(() => {
    const onHashChange = () => {
      setActiveTab(resolveTabFromHash());
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const switchTab = (tabId) => {
    setActiveTab(tabId);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `#${tabId}`);
    }
  };

  useEffect(() => {
    if (!auth) {
      setAuthReady(true);
      return undefined;
    }

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setCurrentUser(null);
        setIsAdmin(false);
        setAuthReady(true);
        return;
      }

      try {
        const tokenResult = await user.getIdTokenResult();
        const authorized = verifyAdminAuthorization(user, tokenResult);
        setCurrentUser(user);
        setIsAdmin(authorized);
      } catch (_) {
        setCurrentUser(user);
        setIsAdmin(verifyAdminAuthorization(user, null));
      } finally {
        setAuthReady(true);
      }
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    if (!db) return undefined;

    let receivedPrimary = false;
    const statusRef = doc(db, SITE_CONFIG_COLLECTION, SITE_STATUS_DOC_ID);

    const unsub = onSnapshot(
      statusRef,
      async (snap) => {
        if (snap.exists()) {
          receivedPrimary = true;
          const parsed = parseRemoteStatusDoc(snap.data());
          if (parsed) {
            setMasterSwitch(parsed.masterSwitch);
            setSublinks(parsed.sublinks);
            setAdminBanner(parsed.adminAnnouncement);
            setSyncState((prev) => ({
              ...prev,
              version: parsed.version,
              status: prev.status === "saving" ? "saving" : "saved",
            }));
          }
        } else if (!receivedPrimary) {
          try {
            const legacySnap = await getDoc(
              doc(db, LEGACY_STATUS_COLLECTION, LEGACY_STATUS_DOC_ID)
            );
            if (legacySnap.exists()) {
              const parsed = parseRemoteStatusDoc(legacySnap.data());
              if (parsed) {
                setMasterSwitch(parsed.masterSwitch);
                setSublinks(parsed.sublinks);
                setAdminBanner(parsed.adminAnnouncement);
              }
            }
          } catch (_) {}
        }
      },
      () => {}
    );

    return () => unsub();
  }, []);

  useEffect(() => {
    if (!isAdmin) {
      setAuditEntries([]);
      return undefined;
    }
    setAuditLoading(true);
    const unsub = subscribeToAuditLog(
      (rows) => {
        setAuditEntries(rows);
        setAuditLoading(false);
      },
      () => {
        setAuditLoading(false);
      }
    );
    return () => unsub();
  }, [isAdmin]);

  const runStatusMutation = useCallback(
    async ({
      nextMaster,
      nextSublinks,
      nextBanner,
      actionSummary,
      updatedKey = null,
      isDelete = false,
    }) => {
      if (!currentUser || !isAdmin) {
        setSyncState((prev) => ({
          ...prev,
          status: "error",
          error: "Administrator authentication required.",
        }));
        return;
      }

      const mutationArgs = {
        nextMaster,
        nextSublinks,
        nextBanner,
        actionSummary,
        updatedKey,
        isDelete,
      };
      lastMutationRef.current = mutationArgs;

      setMasterSwitch(nextMaster);
      setSublinks(nextSublinks);
      setAdminBanner(nextBanner);
      setSyncState((prev) => ({ ...prev, status: "saving", error: "" }));

      try {
        const res = await commitEcosystemStatusTransaction({
          masterSwitch: nextMaster,
          sublinks: nextSublinks,
          adminAnnouncement: nextBanner,
          actor: currentUser,
          actionSummary,
          updatedKey,
          isDelete,
        });
        setSyncState({
          status: "saved",
          version: res.version,
          error: "",
        });
      } catch (err) {
        setSyncState((prev) => ({
          ...prev,
          status: "error",
          error: err?.message || "Firestore transaction failed.",
        }));
      }
    },
    [currentUser, isAdmin]
  );

  const handleRetrySync = useCallback(() => {
    if (lastMutationRef.current) {
      runStatusMutation(lastMutationRef.current);
    }
  }, [runStatusMutation]);

  const handleSignOut = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      setCurrentUser(null);
      setIsAdmin(false);
    } catch (_) {}
  };

  const handleToggleMaster = () => {
    const nextMaster = !masterSwitch;
    runStatusMutation({
      nextMaster,
      nextSublinks: sublinks,
      nextBanner: adminBanner,
      actionSummary: nextMaster
        ? "Restored Global Master Switch ONLINE"
        : "Engaged Global Master Switch LOCKDOWN",
      updatedKey: "masterSwitch",
    });
  };

  const handleToggleService = (key) => {
    const current = sublinks[key];
    if (!current) return;
    const nextEnabled = current.enabled === false;
    const nextSublinks = {
      ...sublinks,
      [key]: {
        ...current,
        enabled: nextEnabled,
      },
    };
    runStatusMutation({
      nextMaster: masterSwitch,
      nextSublinks,
      nextBanner: adminBanner,
      actionSummary: `${nextEnabled ? "Enabled" : "Disabled"} ${current.path || key}`,
      updatedKey: key,
    });
  };

  const handleUpdateMessage = (key, message) => {
    const current = sublinks[key];
    if (!current) return;
    const cleanMsg = String(message || "").trim().slice(0, 280);
    const nextSublinks = {
      ...sublinks,
      [key]: {
        ...current,
        message: cleanMsg,
        maintenanceMessage: cleanMsg,
      },
    };
    runStatusMutation({
      nextMaster: masterSwitch,
      nextSublinks,
      nextBanner: adminBanner,
      actionSummary: `Updated maintenance message for ${current.path || key}`,
      updatedKey: key,
    });
  };

  const handleSetOfflineType = (key, offlineType) => {
    const current = sublinks[key];
    if (!current) return;
    const mode = offlineType === "forbidden" ? "forbidden" : "offline";
    const nextSublinks = {
      ...sublinks,
      [key]: {
        ...current,
        offlineType: mode,
      },
    };
    runStatusMutation({
      nextMaster: masterSwitch,
      nextSublinks,
      nextBanner: adminBanner,
      actionSummary: `Set block mode of ${current.path || key} to ${mode.toUpperCase()}`,
      updatedKey: key,
    });
  };

  const handleSetAllServices = (enabled) => {
    const nextSublinks = {};
    Object.entries(sublinks).forEach(([k, v]) => {
      nextSublinks[k] = { ...v, enabled: Boolean(enabled) };
    });
    runStatusMutation({
      nextMaster: masterSwitch,
      nextSublinks,
      nextBanner: adminBanner,
      actionSummary: enabled ? "Bulk enabled all subdomains" : "Bulk disabled all subdomains",
      updatedKey: "all",
    });
  };

  const handleDeployBanner = ({ enabled, message, variant }) => {
    const nextBanner = {
      enabled: Boolean(enabled),
      message: String(message || "").slice(0, 280),
      variant: variant || "info",
      updatedAt: new Date().toISOString(),
    };
    runStatusMutation({
      nextMaster: masterSwitch,
      nextSublinks: sublinks,
      nextBanner,
      actionSummary: enabled
        ? `Deployed ${nextBanner.variant.toUpperCase()} global banner`
        : "Deactivated global announcement banner",
      updatedKey: "adminAnnouncement",
    });
  };

  const handleRegisterService = (key, serviceObj) => {
    const nextSublinks = {
      ...sublinks,
      [key]: serviceObj,
    };
    runStatusMutation({
      nextMaster: masterSwitch,
      nextSublinks,
      nextBanner: adminBanner,
      actionSummary: `Registered subdomain service ${serviceObj.path || key}`,
      updatedKey: key,
    });
  };

  const handleDeleteService = (key) => {
    const nextSublinks = { ...sublinks };
    delete nextSublinks[key];
    runStatusMutation({
      nextMaster: masterSwitch,
      nextSublinks,
      nextBanner: adminBanner,
      actionSummary: `Removed custom subdomain service ${key}`,
      updatedKey: key,
      isDelete: true,
    });
  };

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="kiruu-card px-6 py-4 text-sm font-bold text-[#111827]">
          Verifying Firebase administrator session...
        </div>
      </div>
    );
  }

  if (!currentUser || !isAdmin) {
    return (
      <LoginView
        unauthorizedUser={currentUser && !isAdmin ? currentUser : null}
        onAuthSuccess={(user) => {
          setCurrentUser(user);
          setIsAdmin(true);
        }}
        onLogout={handleSignOut}
      />
    );
  }

  const navItems = [
    { id: "sublinks", label: "Subdomain Controls" },
    { id: "conversations", label: "TAWIR Conversations" },
    { id: "analytics", label: "Telemetry & AI Logs" },
    { id: "audit", label: "Security Audit Log" },
  ];

  return (
    <div className="min-h-screen text-[#111827] flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b-2 border-[#111111]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <a href="https://kiruu.xyz/" title="kiruu.xyz Portal">
              <img
                src="https://kiruu.xyz/logo.png"
                alt="Kiruu"
                className="h-10 w-auto"
              />
            </a>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="kiruu-font-display text-lg sm:text-xl text-[#111827] tracking-tight">
                  KIRUU CONSOLE
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-full bg-[#fee6e3] text-[#111827] border border-[#111111]">
                  console.kiruu.xyz
                </span>
              </div>
              <p className="text-xs text-[#475569]">
                Authenticated as{" "}
                <span className="text-[#111827] font-bold">{currentUser.email}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="px-3 py-1.5 rounded-xl bg-slate-100 border-1.5 border-[#111111] text-xs font-bold flex items-center gap-2">
              {syncState.status === "saving" ? (
                <span className="text-indigo-700">Committing Transaction...</span>
              ) : syncState.status === "error" ? (
                <span className="text-rose-700">Sync Error</span>
              ) : (
                <span className="text-emerald-800">
                  Synced <code className="font-mono">v{syncState.version}</code>
                </span>
              )}
            </div>

            <a
              href="https://kiruu.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border-1.5 border-[#111111] text-xs font-bold text-[#111827]"
            >
              kiruu.xyz &rarr;
            </a>

            <button
              type="button"
              onClick={handleSignOut}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-rose-50 border-1.5 border-[#111111] text-xs font-bold text-rose-800 cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-1.5 overflow-x-auto border-t border-slate-200 py-1.5">
          {navItems.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => switchTab(tab.id)}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  active
                    ? "bg-[#111827] text-white"
                    : "text-[#475569] hover:text-[#111827] hover:bg-slate-100"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {activeTab === "sublinks" && (
          <ServicesTab
            masterSwitch={masterSwitch}
            sublinks={sublinks}
            adminBanner={adminBanner}
            syncState={syncState}
            onToggleMaster={handleToggleMaster}
            onToggleService={handleToggleService}
            onUpdateMessage={handleUpdateMessage}
            onSetOfflineType={handleSetOfflineType}
            onSetAllServices={handleSetAllServices}
            onDeployBanner={handleDeployBanner}
            onRegisterService={handleRegisterService}
            onDeleteService={handleDeleteService}
            onRetrySync={handleRetrySync}
          />
        )}

        {activeTab === "conversations" && (
          <ConversationsTab currentUser={currentUser} />
        )}

        {activeTab === "analytics" && <TelemetryTab />}

        {activeTab === "audit" && (
          <AuditLogTab auditEntries={auditEntries} loading={auditLoading} />
        )}
      </main>
    </div>
  );
}
