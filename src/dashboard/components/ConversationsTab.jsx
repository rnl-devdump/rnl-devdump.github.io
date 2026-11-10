import { useState, useEffect, useMemo, useCallback } from "react";
import { TAWIR_BACKEND_PRESETS } from "../config/servicesCatalog.js";

const STORAGE_KEY_SERVER = "kiruu_console_tawir_server_url";
const STORAGE_KEY_CACHE = "kiruu_console_tawir_convo_cache_v2";

function isGuardPass(guard) {
  if (!guard) return true;
  if (guard.status === "PASS") return true;
  if (Array.isArray(guard.problems) && guard.problems.length === 0) return true;
  if (guard.repaired === false && (!guard.problems || guard.problems.length === 0)) return true;
  return false;
}

export default function ConversationsTab({ currentUser }) {
  const [serverUrl, setServerUrl] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_SERVER) || TAWIR_BACKEND_PRESETS[0].url;
    } catch {
      return TAWIR_BACKEND_PRESETS[0].url;
    }
  });
  const [customUrlInput, setCustomUrlInput] = useState(serverUrl);
  const [conversations, setConversations] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_CACHE);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [selectedId, setSelectedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [guardFilter, setGuardFilter] = useState("ALL"); // 'ALL' | 'PASS' | 'REPAIRED'
  const [connStatus, setConnStatus] = useState("idle"); // 'idle' | 'syncing' | 'connected' | 'error'
  const [statusNote, setStatusNote] = useState("Ready");
  const [toastMsg, setToastMsg] = useState("");

  const showToast = useCallback((msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 2800);
  }, []);

  const buildAuthHeaders = useCallback(async () => {
    const headers = { Accept: "application/json" };
    if (currentUser && typeof currentUser.getIdToken === "function") {
      try {
        const idToken = await currentUser.getIdToken();
        if (idToken) {
          headers.Authorization = `Bearer ${idToken}`;
        }
      } catch (_) {}
    }
    return headers;
  }, [currentUser]);

  const fetchConversations = useCallback(
    async (targetUrl = serverUrl, silent = false) => {
      const cleanBase = String(targetUrl || "").replace(/\/+$/, "");
      if (!cleanBase.startsWith("https://")) {
        setConnStatus("error");
        setStatusNote("HTTPS backend URL required");
        return;
      }
      if (!silent) setConnStatus("syncing");
      try {
        const headers = await buildAuthHeaders();
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 8000);
        const res = await fetch(`${cleanBase}/conversations`, {
          cache: "no-store",
          headers,
          signal: ctrl.signal,
        });
        clearTimeout(timer);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data?.conversations)
          ? data.conversations
          : [];
        setConversations(list);
        if (list.length > 0 && !selectedId) {
          setSelectedId(list[0].id);
        }
        try {
          localStorage.setItem(STORAGE_KEY_CACHE, JSON.stringify(list.slice(0, 150)));
        } catch (_) {}
        setConnStatus("connected");
        setStatusNote(`Synced ${list.length} records`);
      } catch (err) {
        setConnStatus("error");
        setStatusNote(`Offline / Cached (${err.message || "unreachable"})`);
      }
    },
    [serverUrl, buildAuthHeaders, selectedId]
  );

  useEffect(() => {
    fetchConversations(serverUrl, false);
    const interval = setInterval(() => fetchConversations(serverUrl, true), 20000);
    return () => clearInterval(interval);
  }, [serverUrl, fetchConversations]);

  async function autoDetectBackend() {
    setConnStatus("syncing");
    setStatusNote("Probing TAWIR backends...");
    for (const preset of TAWIR_BACKEND_PRESETS) {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 3500);
        const res = await fetch(`${preset.url}/health`, {
          cache: "no-store",
          signal: ctrl.signal,
        });
        clearTimeout(timer);
        if (res.ok) {
          setServerUrl(preset.url);
          setCustomUrlInput(preset.url);
          try {
            localStorage.setItem(STORAGE_KEY_SERVER, preset.url);
          } catch (_) {}
          showToast(`Connected to ${preset.name}`);
          await fetchConversations(preset.url, false);
          return;
        }
      } catch (_) {}
    }
    setConnStatus("error");
    setStatusNote("All Modal backends asleep (cold-start)");
    showToast("No awake backend responded; showing cached records.");
  }

  async function handleDeleteConversation(id) {
    if (!id) return;
    if (!window.confirm("Permanently delete this conversation record?")) return;
    try {
      const cleanBase = serverUrl.replace(/\/+$/, "");
      const headers = await buildAuthHeaders();
      await fetch(`${cleanBase}/conversations/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers,
      });
    } catch (_) {}
    setConversations((prev) => {
      const next = prev.filter((c) => c.id !== id);
      try {
        localStorage.setItem(STORAGE_KEY_CACHE, JSON.stringify(next.slice(0, 150)));
      } catch (_) {}
      return next;
    });
    if (selectedId === id) setSelectedId(null);
    showToast("Conversation deleted");
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(conversations, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tawir-conversations-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const filteredConversations = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return conversations.filter((c) => {
      const prompt = String(c.prompt || c.user_message || c.query || "").toLowerCase();
      const response = String(c.response || c.assistant_message || c.answer || "").toLowerCase();
      const matchesText = !q || prompt.includes(q) || response.includes(q) || String(c.id || "").toLowerCase().includes(q);
      if (!matchesText) return false;
      const pass = isGuardPass(c.guard);
      if (guardFilter === "PASS" && !pass) return false;
      if (guardFilter === "REPAIRED" && pass) return false;
      return true;
    });
  }, [conversations, searchQuery, guardFilter]);

  const activeConvo = useMemo(() => {
    return (
      filteredConversations.find((c) => c.id === selectedId) ||
      filteredConversations[0] ||
      null
    );
  }, [filteredConversations, selectedId]);

  const stats = useMemo(() => {
    const total = conversations.length;
    if (total === 0) {
      return { total: 0, avgLatencyMs: 0, passRate: 100, totalTokens: 0 };
    }
    let latencySum = 0;
    let latencyCount = 0;
    let passCount = 0;
    let tokens = 0;
    for (const c of conversations) {
      const lat = Number(c.latency_ms || c.latencyMs || (c.duration_s ? c.duration_s * 1000 : 0));
      if (lat > 0) {
        latencySum += lat;
        latencyCount++;
      }
      if (isGuardPass(c.guard)) passCount++;
      tokens += Number(c.total_tokens || (c.input_tokens || 0) + (c.output_tokens || 0) || 0);
    }
    return {
      total,
      avgLatencyMs: latencyCount > 0 ? Math.round(latencySum / latencyCount) : 0,
      passRate: Math.round((passCount / total) * 100),
      totalTokens: tokens,
    };
  }, [conversations]);

  return (
    <div className="space-y-6">
      {toastMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 border-1.5 border-emerald-700 text-emerald-900 text-xs font-bold">
          {toastMsg}
        </div>
      )}

      {/* Backend Switcher & Status Header */}
      <div className="kiruu-card p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase border ${
                  connStatus === "connected"
                    ? "bg-emerald-50 text-emerald-800 border-emerald-500"
                    : connStatus === "syncing"
                    ? "bg-amber-50 text-amber-800 border-amber-500"
                    : "bg-rose-50 text-rose-800 border-rose-400"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    connStatus === "connected"
                      ? "bg-emerald-600"
                      : connStatus === "syncing"
                      ? "bg-amber-500 animate-pulse"
                      : "bg-rose-600"
                  }`}
                />
                {statusNote}
              </span>
              <span className="text-[11px] font-mono text-[#475569]">
                Bearer ID Token Auth Active
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-[#111827]">
              TAWIR Conversation Monitor (Integrated)
            </h2>
            <p className="text-xs text-[#475569] mt-0.5">
              Replaces standalone <code className="font-mono">/tawir-convo</code>. Attaches your
              Firebase Auth ID token to backend requests.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {TAWIR_BACKEND_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  setServerUrl(preset.url);
                  setCustomUrlInput(preset.url);
                  try {
                    localStorage.setItem(STORAGE_KEY_SERVER, preset.url);
                  } catch (_) {}
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border-1.5 transition-all cursor-pointer ${
                  serverUrl === preset.url
                    ? "bg-[#111827] text-white border-[#111111]"
                    : "bg-white text-[#111827] border-[#111111] hover:bg-slate-100"
                }`}
              >
                {preset.name}
              </button>
            ))}
            <button
              type="button"
              onClick={autoDetectBackend}
              className="kiruu-btn px-3 py-1.5 text-xs font-bold"
            >
              Auto-Detect Live
            </button>
            <button
              type="button"
              onClick={() => fetchConversations(serverUrl, false)}
              className="px-3 py-1.5 rounded-lg bg-white border-1.5 border-[#111111] text-xs font-bold text-[#111827] hover:bg-slate-100 cursor-pointer"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={exportJson}
              className="px-3 py-1.5 rounded-lg bg-white border-1.5 border-[#111111] text-xs font-bold text-[#111827] hover:bg-slate-100 cursor-pointer"
            >
              Export JSON
            </button>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-200 flex flex-col sm:flex-row gap-2">
          <input
            type="url"
            value={customUrlInput}
            onChange={(e) => setCustomUrlInput(e.target.value)}
            placeholder="https://iamk1ruu--tawir-v7.modal.run"
            className="flex-1 px-3 py-2 rounded-lg bg-white border-1.5 border-[#111111] text-xs font-mono text-[#111827]"
          />
          <button
            type="button"
            onClick={() => {
              if (!customUrlInput.startsWith("https://")) {
                showToast("Only https:// backend endpoints are permitted.");
                return;
              }
              setServerUrl(customUrlInput.trim());
              try {
                localStorage.setItem(STORAGE_KEY_SERVER, customUrlInput.trim());
              } catch (_) {}
            }}
            className="px-4 py-2 rounded-lg bg-[#111827] text-white text-xs font-bold cursor-pointer"
          >
            Set Endpoint
          </button>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="kiruu-card p-4">
          <div className="text-[11px] font-bold uppercase text-[#475569]">Total Dialogues</div>
          <div className="text-2xl font-extrabold font-mono text-[#111827] mt-1">{stats.total}</div>
        </div>
        <div className="kiruu-card p-4">
          <div className="text-[11px] font-bold uppercase text-[#475569]">Avg Latency</div>
          <div className="text-2xl font-extrabold font-mono text-[#111827] mt-1">
            {stats.avgLatencyMs} ms
          </div>
        </div>
        <div className="kiruu-card p-4">
          <div className="text-[11px] font-bold uppercase text-[#475569]">Guard Pass Rate</div>
          <div className="text-2xl font-extrabold font-mono text-emerald-700 mt-1">
            {stats.passRate}%
          </div>
        </div>
        <div className="kiruu-card p-4">
          <div className="text-[11px] font-bold uppercase text-[#475569]">Token Volume</div>
          <div className="text-2xl font-extrabold font-mono text-[#111827] mt-1">
            {stats.totalTokens.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Search & Split View Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 kiruu-card p-4 flex flex-col max-h-[640px]">
          <div className="flex flex-col sm:flex-row gap-2 mb-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search prompts, responses, IDs..."
              className="flex-1 px-3 py-2 rounded-lg bg-white border-1.5 border-[#111111] text-xs font-medium"
            />
            <select
              value={guardFilter}
              onChange={(e) => setGuardFilter(e.target.value)}
              className="px-2.5 py-2 rounded-lg bg-white border-1.5 border-[#111111] text-xs font-bold"
            >
              <option value="ALL">All Guard</option>
              <option value="PASS">Guard PASS</option>
              <option value="REPAIRED">Repaired/Flagged</option>
            </select>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {filteredConversations.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#475569]">
                No matching conversation records.
              </div>
            ) : (
              filteredConversations.map((c, idx) => {
                const id = c.id || `row_${idx}`;
                const prompt = c.prompt || c.user_message || c.query || "(empty prompt)";
                const response = c.response || c.assistant_message || c.answer || "";
                const pass = isGuardPass(c.guard);
                const isSelected = activeConvo && (activeConvo.id || "") === id;
                return (
                  <div
                    key={id}
                    onClick={() => setSelectedId(id)}
                    className={`p-3 rounded-xl border-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? "bg-[#fee6e3] border-[#111111] shadow-xs"
                        : "bg-white border-slate-300 hover:border-[#111111]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-mono text-[10px] font-bold text-[#475569]">
                        {String(c.version || c.mode || "TAWIR").toUpperCase()}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          pass
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {pass ? "PASS" : "REPAIRED"}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-[#111827] line-clamp-1">{prompt}</div>
                    <div className="text-[11px] text-[#475569] line-clamp-2 mt-0.5">{response}</div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="lg:col-span-7 kiruu-card p-5 max-h-[640px] overflow-y-auto">
          {!activeConvo ? (
            <div className="p-12 text-center text-sm text-[#475569]">
              Select a conversation record on the left to inspect its full prompt, Pangasinan
              response, guard status, and citations.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200">
                <div>
                  <span className="font-mono text-xs font-bold text-[#475569]">
                    ID: {activeConvo.id || "N/A"}
                  </span>
                  <h3 className="text-base font-extrabold text-[#111827] mt-0.5">
                    Dialogue Inspection
                  </h3>
                </div>
                {activeConvo.id && (
                  <button
                    type="button"
                    onClick={() => handleDeleteConversation(activeConvo.id)}
                    className="px-3 py-1.5 rounded-lg bg-red-50 border border-red-400 text-red-700 text-xs font-bold hover:bg-red-100 cursor-pointer"
                  >
                    Delete Record
                  </button>
                )}
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-300">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                  User Prompt
                </div>
                <div className="text-sm font-semibold text-[#111827] whitespace-pre-wrap">
                  {activeConvo.prompt || activeConvo.user_message || activeConvo.query || ""}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-300">
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 mb-1">
                  TAWIR Response
                </div>
                <div className="text-sm text-[#111827] whitespace-pre-wrap leading-relaxed">
                  {activeConvo.response || activeConvo.assistant_message || activeConvo.answer || ""}
                </div>
              </div>

              {Array.isArray(activeConvo.sources) && activeConvo.sources.length > 0 && (
                <div className="p-3.5 rounded-xl bg-white border border-slate-300">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#475569] mb-2">
                    Web Grounding Citations ({activeConvo.sources.length})
                  </div>
                  <div className="space-y-1.5">
                    {activeConvo.sources.map((s, idx) => {
                      const safeHref =
                        typeof s.url === "string" && /^https?:\/\//i.test(s.url) ? s.url : "#";
                      return (
                        <a
                          key={idx}
                          href={safeHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-xs font-semibold text-blue-700 hover:underline truncate"
                        >
                          {s.title || s.url}
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
