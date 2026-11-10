import React, { useState, useMemo, useEffect } from "react";
import { normalizeSubdomainUrl, formatDisplayHost } from "../config/servicesCatalog.js";

const BANNER_VARIANTS = [
  { id: "info", label: "Info (Blue)", bg: "bg-blue-700 border-blue-900 text-white" },
  { id: "warning", label: "Warning (Amber)", bg: "bg-amber-600 border-amber-900 text-white" },
  { id: "alert", label: "Critical (Red)", bg: "bg-red-700 border-red-950 text-white" },
  { id: "success", label: "Resolved (Emerald)", bg: "bg-emerald-700 border-emerald-950 text-white" },
];

export default function ServicesTab({
  masterSwitch,
  sublinks,
  adminBanner,
  syncState,
  onToggleMaster,
  onToggleService,
  onUpdateMessage,
  onSetOfflineType,
  onSetAllServices,
  onDeployBanner,
  onRegisterService,
  onDeleteService,
  onRetrySync,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [draftMessages, setDraftMessages] = useState({});
  const [savedNoticeKey, setSavedNoticeKey] = useState(null);

  const [bannerText, setBannerText] = useState(adminBanner?.message || "");
  const [bannerVariant, setBannerVariant] = useState(adminBanner?.variant || "info");
  const [previewBanner, setPreviewBanner] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newSlug, setNewSlug] = useState("");
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("Custom");
  const [newUrl, setNewUrl] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newMessage, setNewMessage] = useState("Service is temporarily offline for maintenance.");
  const [formError, setFormError] = useState("");

  const [confirmKillMaster, setConfirmKillMaster] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  useEffect(() => {
    setBannerText(adminBanner?.message || "");
    setBannerVariant(adminBanner?.variant || "info");
  }, [adminBanner?.message, adminBanner?.variant]);

  const categories = useMemo(() => {
    const set = new Set(["ALL"]);
    Object.values(sublinks || {}).forEach((item) => {
      if (item?.category) set.add(item.category);
    });
    return Array.from(set);
  }, [sublinks]);

  const entries = useMemo(() => {
    return Object.entries(sublinks || {}).filter(([key, item]) => {
      if (!item) return false;
      if (categoryFilter !== "ALL" && item.category !== categoryFilter) return false;
      const isOnline = masterSwitch && item.enabled !== false;
      if (statusFilter === "ONLINE" && !isOnline) return false;
      if (statusFilter === "OFFLINE" && isOnline) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const hay = `${key} ${item.name || ""} ${item.path || ""} ${item.url || ""} ${item.category || ""} ${item.description || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [sublinks, categoryFilter, statusFilter, searchQuery, masterSwitch]);

  const stats = useMemo(() => {
    const all = Object.values(sublinks || {});
    const total = all.length;
    const enabledCount = all.filter((s) => s.enabled !== false).length;
    const liveCount = masterSwitch ? enabledCount : 0;
    return { total, enabledCount, liveCount, offlineCount: total - liveCount };
  }, [sublinks, masterSwitch]);

  const handleSaveMessage = (key) => {
    const nextMsg = draftMessages[key] ?? sublinks[key]?.message ?? "";
    onUpdateMessage(key, nextMsg);
    setSavedNoticeKey(key);
    setTimeout(() => {
      setSavedNoticeKey((prev) => (prev === key ? null : prev));
    }, 1800);
  };

  const handlePreviewBanner = () => {
    setPreviewBanner(true);
    setTimeout(() => setPreviewBanner(false), 5000);
  };

  const handleCreateService = (e) => {
    e.preventDefault();
    setFormError("");
    const cleanKey = newSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (!cleanKey || cleanKey.length < 2) {
      setFormError("Service slug must be at least 2 alphanumeric characters (e.g. 'docs' or 'status').");
      return;
    }
    if (sublinks[cleanKey]) {
      setFormError(`Service '${cleanKey}' already exists.`);
      return;
    }
    if (!newName.trim()) {
      setFormError("Display name is required.");
      return;
    }
    const normalizedUrl = normalizeSubdomainUrl(newUrl || `https://${cleanKey}.kiruu.xyz`, cleanKey);
    const displayHost = formatDisplayHost(normalizedUrl, cleanKey);

    onRegisterService(cleanKey, {
      name: newName.trim().slice(0, 80),
      category: newCategory.trim() || "Custom",
      url: normalizedUrl,
      path: displayHost,
      description: newDescription.trim().slice(0, 240) || `Subdomain service at ${displayHost}`,
      enabled: true,
      offlineType: "offline",
      message: newMessage.trim().slice(0, 280) || "Service is temporarily offline.",
      maintenanceMessage: newMessage.trim().slice(0, 280) || "Service is temporarily offline.",
      isDynamic: true,
    });

    setNewSlug("");
    setNewName("");
    setNewUrl("");
    setNewDescription("");
    setShowAddModal(false);
  };

  const buildExportJson = () => {
    return JSON.stringify(
      {
        version: syncState?.version || 1,
        updatedAt: new Date().toISOString(),
        masterSwitch: Boolean(masterSwitch),
        adminAnnouncement: adminBanner || { enabled: false, message: "", variant: "info" },
        services: sublinks,
        sublinks,
      },
      null,
      2
    );
  };

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(buildExportJson());
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
    } catch (_) {}
  };

  const handleDownloadJson = () => {
    const blob = new Blob([buildExportJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sublinks.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Live Preview Banner */}
      {previewBanner && bannerText.trim() && (
        <div
          className={`p-3.5 rounded-xl border-2 text-sm font-bold flex items-center justify-between shadow-md ${
            BANNER_VARIANTS.find((v) => v.id === bannerVariant)?.bg || "bg-blue-700 border-blue-900 text-white"
          }`}
        >
          <span>[5s Live Preview] {bannerText}</span>
          <button
            type="button"
            onClick={() => setPreviewBanner(false)}
            className="text-xs underline opacity-90 hover:opacity-100 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Sync Error Banner */}
      {syncState?.status === "error" && (
        <div className="p-4 rounded-xl bg-red-50 border-2 border-red-700 flex flex-wrap items-center justify-between gap-3">
          <div className="text-red-900 text-xs font-semibold">
            <strong>Cloud Sync Failed:</strong>{" "}
            {syncState.error || "Unable to commit transaction to Firestore."}
          </div>
          {onRetrySync && (
            <button
              type="button"
              onClick={onRetrySync}
              className="px-3 py-1.5 rounded-lg bg-red-700 hover:bg-red-800 text-white text-xs font-bold cursor-pointer"
            >
              Retry Sync
            </button>
          )}
        </div>
      )}

      {/* Top Row: Master Switch & Ecosystem KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div
          className={`lg:col-span-2 kiruu-card p-5 transition-all ${
            masterSwitch ? "" : "bg-red-50/95 border-red-800"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-base sm:text-lg font-extrabold text-[#111827]">
                  Global Ecosystem Master Switch
                </h2>
                <span
                  className={`px-2.5 py-0.5 text-[11px] font-bold uppercase rounded-full border ${
                    masterSwitch
                      ? "bg-emerald-100 text-emerald-900 border-emerald-600"
                      : "bg-red-100 text-red-900 border-red-600"
                  }`}
                >
                  {masterSwitch ? "OPERATIONAL" : "LOCKDOWN ACTIVE"}
                </span>
              </div>
              <p className="text-xs text-[#475569] mt-1">
                Controls all <code className="font-mono font-bold text-[#111827]">*.kiruu.xyz</code>{" "}
                subdomains via <code className="font-mono">site_config/status</code>. Turning this off
                halts every subdomain except <code className="font-mono font-bold">console.kiruu.xyz</code>.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {masterSwitch ? (
                confirmKillMaster ? (
                  <div className="flex items-center gap-2 bg-red-100 border-1.5 border-red-800 px-3 py-2 rounded-xl">
                    <span className="text-xs text-red-950 font-bold">Halt all subdomains?</span>
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmKillMaster(false);
                        onToggleMaster();
                      }}
                      className="px-2.5 py-1 rounded-lg bg-red-700 hover:bg-red-800 text-white text-xs font-bold cursor-pointer"
                    >
                      Confirm Halt
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmKillMaster(false)}
                      className="px-2 py-1 rounded-lg bg-white border border-slate-400 text-[#111827] text-xs font-bold cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmKillMaster(true)}
                    className="px-4 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 border-2 border-red-700 text-red-800 text-xs font-bold cursor-pointer"
                  >
                    Engage Emergency Lockdown
                  </button>
                )
              ) : (
                <button
                  type="button"
                  onClick={onToggleMaster}
                  className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold cursor-pointer"
                >
                  Restore Ecosystem Online
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Summary Counters */}
        <div className="grid grid-cols-3 gap-3 kiruu-card p-4 items-center">
          <div className="text-center p-2 rounded-xl bg-slate-100 border border-slate-300">
            <div className="text-2xl font-extrabold font-mono text-[#111827]">{stats.total}</div>
            <div className="text-[10px] font-bold text-[#475569] uppercase tracking-wider mt-0.5">
              Subdomains
            </div>
          </div>
          <div className="text-center p-2 rounded-xl bg-emerald-50 border border-emerald-400">
            <div className="text-2xl font-extrabold font-mono text-emerald-800">{stats.liveCount}</div>
            <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider mt-0.5">
              Online
            </div>
          </div>
          <div className="text-center p-2 rounded-xl bg-rose-50 border border-rose-400">
            <div className="text-2xl font-extrabold font-mono text-rose-800">{stats.offlineCount}</div>
            <div className="text-[10px] font-bold text-rose-800 uppercase tracking-wider mt-0.5">
              Offline
            </div>
          </div>
        </div>
      </div>

      {/* Global Announcement Banner Controls */}
      <div className="kiruu-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-extrabold text-[#111827]">
              Global Ecosystem Announcement Banner
            </h3>
            {adminBanner?.enabled && (
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-indigo-100 text-indigo-900 border border-indigo-500">
                LIVE ON ALL SUBDOMAINS
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePreviewBanner}
              disabled={!bannerText.trim()}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 border border-[#111111] disabled:opacity-40 text-xs font-bold text-[#111827] cursor-pointer"
            >
              5s Preview
            </button>
            {adminBanner?.enabled && (
              <button
                type="button"
                onClick={() =>
                  onDeployBanner({ enabled: false, message: bannerText, variant: bannerVariant })
                }
                className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-600 text-xs font-bold text-rose-800 cursor-pointer"
              >
                Deactivate Banner
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-7">
            <input
              type="text"
              value={bannerText}
              onChange={(e) => setBannerText(e.target.value)}
              placeholder="Broadcast a real-time notice across kiruu.xyz and all *.kiruu.xyz subdomains..."
              maxLength={280}
              className="w-full px-3.5 py-2 bg-white border-1.5 border-[#111111] rounded-xl text-xs font-medium text-[#111827] placeholder-[#64748b]"
            />
          </div>
          <div className="md:col-span-3">
            <select
              value={bannerVariant}
              onChange={(e) => setBannerVariant(e.target.value)}
              className="w-full px-3 py-2 bg-white border-1.5 border-[#111111] rounded-xl text-xs font-bold text-[#111827]"
            >
              {BANNER_VARIANTS.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <button
              type="button"
              onClick={() =>
                onDeployBanner({
                  enabled: Boolean(bannerText.trim()),
                  message: bannerText.trim(),
                  variant: bannerVariant,
                })
              }
              disabled={!bannerText.trim()}
              className="kiruu-btn w-full py-2 px-3 disabled:opacity-40 text-xs font-bold"
            >
              {adminBanner?.enabled ? "Update Banner" : "Deploy Banner"}
            </button>
          </div>
        </div>
      </div>

      {/* Filter & Actions Toolbar */}
      <div className="kiruu-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter subdomains (e.g. tawir.kiruu.xyz)..."
            className="flex-1 min-w-[220px] max-w-sm px-3.5 py-2 bg-white border-1.5 border-[#111111] rounded-xl text-xs font-medium text-[#111827] placeholder-[#64748b]"
          />

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-white border-1.5 border-[#111111] rounded-xl text-xs font-bold text-[#111827]"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === "ALL" ? "All Categories" : cat}
              </option>
            ))}
          </select>

          <div className="inline-flex rounded-xl bg-slate-100 border-1.5 border-[#111111] p-0.5">
            {["ALL", "ONLINE", "OFFLINE"].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                  statusFilter === st
                    ? "bg-[#111827] text-white"
                    : "text-[#475569] hover:text-[#111827]"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onSetAllServices(true)}
            className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border-1.5 border-emerald-700 text-emerald-900 text-xs font-bold cursor-pointer"
          >
            Enable All
          </button>
          <button
            type="button"
            onClick={() => onSetAllServices(false)}
            className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border-1.5 border-rose-700 text-rose-900 text-xs font-bold cursor-pointer"
          >
            Disable All
          </button>
          <button
            type="button"
            onClick={handleCopyJson}
            className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border-1.5 border-[#111111] text-[#111827] text-xs font-bold cursor-pointer"
          >
            {copiedJson ? "Copied JSON" : "Copy JSON"}
          </button>
          <button
            type="button"
            onClick={handleDownloadJson}
            className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border-1.5 border-[#111111] text-[#111827] text-xs font-bold cursor-pointer"
          >
            Download sublinks.json
          </button>
          <button
            type="button"
            onClick={() => setShowAddModal((v) => !v)}
            className="kiruu-btn px-3 py-1.5 text-xs font-bold"
          >
            + Register Subdomain
          </button>
        </div>
      </div>

      {/* Add Subdomain Drawer */}
      {showAddModal && (
        <form onSubmit={handleCreateService} className="kiruu-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-extrabold text-[#111827]">
              Register New <code className="font-mono">*.kiruu.xyz</code> Subdomain Service
            </h4>
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="text-xs font-bold text-[#475569] hover:text-[#111827] cursor-pointer"
            >
              Close
            </button>
          </div>

          {formError && (
            <div className="p-2.5 rounded-lg bg-red-50 border border-red-600 text-xs font-bold text-red-800">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase text-[#475569] mb-1">
                Subdomain Slug
              </label>
              <input
                type="text"
                value={newSlug}
                onChange={(e) => {
                  const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
                  setNewSlug(val);
                  if (val) setNewUrl(`https://${val}.kiruu.xyz`);
                }}
                placeholder="e.g. docs"
                className="w-full px-3 py-2 bg-white border-1.5 border-[#111111] rounded-xl text-xs text-[#111827]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase text-[#475569] mb-1">
                Display Name
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Kiruu Docs"
                className="w-full px-3 py-2 bg-white border-1.5 border-[#111111] rounded-xl text-xs text-[#111827]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase text-[#475569] mb-1">
                Canonical URL
              </label>
              <input
                type="text"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://docs.kiruu.xyz"
                className="w-full px-3 py-2 bg-white border-1.5 border-[#111111] rounded-xl text-xs text-[#111827] font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase text-[#475569] mb-1">
                Category
              </label>
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="AI Assistant / Media / Tool"
                className="w-full px-3 py-2 bg-white border-1.5 border-[#111111] rounded-xl text-xs text-[#111827]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase text-[#475569] mb-1">
                Short Description
              </label>
              <input
                type="text"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="What this subdomain hosts..."
                className="w-full px-3 py-2 bg-white border-1.5 border-[#111111] rounded-xl text-xs text-[#111827]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase text-[#475569] mb-1">
                Default Maintenance Message
              </label>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="w-full px-3 py-2 bg-white border-1.5 border-[#111111] rounded-xl text-xs text-[#111827]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-3.5 py-2 rounded-xl bg-slate-100 border border-[#111111] text-xs font-bold text-[#111827] cursor-pointer"
            >
              Cancel
            </button>
            <button type="submit" className="kiruu-btn px-4 py-2 text-xs font-bold">
              Add Subdomain Service
            </button>
          </div>
        </form>
      )}

      {/* Subdomain Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {entries.map(([key, item]) => {
          const isServiceEnabled = item.enabled !== false;
          const isEffectiveOnline = masterSwitch && isServiceEnabled;
          const currentMsg =
            draftMessages[key] !== undefined ? draftMessages[key] : item.message || "";
          const isForbidden = item.offlineType === "forbidden";
          const canonicalUrl = item.url || normalizeSubdomainUrl(item.path, key);
          const displayHost = item.path || formatDisplayHost(canonicalUrl, key);

          return (
            <div
              key={key}
              className={`kiruu-card p-5 flex flex-col justify-between transition-all ${
                isEffectiveOnline
                  ? ""
                  : isForbidden
                  ? "bg-amber-50/95 border-amber-800"
                  : "bg-rose-50/95 border-rose-800"
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 border border-slate-300 text-[#111827]">
                        {item.category || "Service"}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                          isEffectiveOnline
                            ? "bg-emerald-100 text-emerald-900 border-emerald-500"
                            : isForbidden
                            ? "bg-amber-100 text-amber-900 border-amber-500"
                            : "bg-rose-100 text-rose-900 border-rose-500"
                        }`}
                      >
                        {isEffectiveOnline
                          ? "ONLINE"
                          : isForbidden
                          ? "403 FORBIDDEN"
                          : "OFFLINE"}
                      </span>
                    </div>

                    <h3
                      className="text-base font-extrabold text-[#111827] mt-2 truncate"
                      title={item.name}
                    >
                      {item.name}
                    </h3>

                    <a
                      href={canonicalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-mono font-bold text-indigo-700 hover:underline mt-0.5 break-all"
                    >
                      <span>{displayHost} &rarr;</span>
                    </a>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {item.isDynamic && (
                      <button
                        type="button"
                        onClick={() => onDeleteService(key)}
                        className="px-2 py-1 rounded-lg bg-rose-50 border border-rose-400 text-rose-800 text-[11px] font-bold hover:bg-rose-100 cursor-pointer"
                        title="Delete custom service"
                      >
                        Delete
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onToggleService(key)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border-1.5 transition-colors cursor-pointer ${
                        isServiceEnabled
                          ? "bg-emerald-700 hover:bg-emerald-800 text-white border-[#111111]"
                          : "bg-white hover:bg-rose-50 text-rose-800 border-rose-700"
                      }`}
                    >
                      {isServiceEnabled ? "Enabled" : "Disabled"}
                    </button>
                  </div>
                </div>

                {item.description && (
                  <p className="text-xs text-[#475569] mt-2.5 line-clamp-2">{item.description}</p>
                )}
              </div>

              {/* Controls Footer */}
              <div className="mt-4 pt-3.5 border-t border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#475569] font-bold">Block Screen Mode:</span>
                  <div className="inline-flex rounded-lg bg-slate-100 border border-[#111111] p-0.5">
                    <button
                      type="button"
                      onClick={() => onSetOfflineType(key, "offline")}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                        !isForbidden
                          ? "bg-[#111827] text-white"
                          : "text-[#475569] hover:text-[#111827]"
                      }`}
                    >
                      Maintenance
                    </button>
                    <button
                      type="button"
                      onClick={() => onSetOfflineType(key, "forbidden")}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                        isForbidden
                          ? "bg-amber-700 text-white"
                          : "text-[#475569] hover:text-[#111827]"
                      }`}
                    >
                      403 Forbidden
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={currentMsg}
                    onChange={(e) =>
                      setDraftMessages((prev) => ({
                        ...prev,
                        [key]: e.target.value,
                      }))
                    }
                    placeholder="Custom offline/maintenance message..."
                    maxLength={280}
                    className="flex-1 px-2.5 py-1.5 bg-white border border-[#111111] rounded-lg text-xs text-[#111827] placeholder-[#64748b]"
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveMessage(key)}
                    className="px-3 py-1.5 rounded-lg bg-[#111827] hover:bg-slate-800 text-white text-xs font-bold shrink-0 cursor-pointer"
                  >
                    {savedNoticeKey === key ? "Saved!" : "Save"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
