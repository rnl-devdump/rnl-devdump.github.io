import React, { useState, useEffect, useMemo } from "react";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "../../lib/firebase.js";
import {
  DEVICE_LOGS_COLLECTION,
  AI_LOGS_COLLECTION,
  trackVisitEvent,
  trackAiEvent,
} from "../../lib/telemetry.js";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function readLocalBuffer(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function mergeById(remoteList, localList) {
  const map = new Map();
  [...remoteList, ...localList].forEach((item) => {
    if (!item) return;
    const key = item.id || `${item.timestamp}_${item.page || item.prompt || ""}`;
    if (!map.has(key)) {
      map.set(key, item);
    }
  });
  return Array.from(map.values()).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
}

export default function TelemetryTab() {
  const [remoteVisits, setRemoteVisits] = useState([]);
  const [remoteAi, setRemoteAi] = useState([]);
  const [localVisits, setLocalVisits] = useState(() =>
    readLocalBuffer("kiruu_local_telemetry_visits")
  );
  const [localAi, setLocalAi] = useState(() => readLocalBuffer("kiruu_local_telemetry_ai"));
  const [pingSent, setPingSent] = useState(false);

  useEffect(() => {
    if (!db) return undefined;

    const visitQuery = query(
      collection(db, DEVICE_LOGS_COLLECTION),
      orderBy("timestamp", "desc"),
      limit(150)
    );
    const aiQuery = query(
      collection(db, AI_LOGS_COLLECTION),
      orderBy("timestamp", "desc"),
      limit(150)
    );

    const unsubVisits = onSnapshot(
      visitQuery,
      (snap) => {
        setRemoteVisits(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      () => {}
    );

    const unsubAi = onSnapshot(
      aiQuery,
      (snap) => {
        setRemoteAi(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      () => {}
    );

    return () => {
      unsubVisits();
      unsubAi();
    };
  }, []);

  const visits = useMemo(() => mergeById(remoteVisits, localVisits), [remoteVisits, localVisits]);
  const aiLogs = useMemo(() => mergeById(remoteAi, localAi), [remoteAi, localAi]);

  const analytics = useMemo(() => {
    const osCounts = {};
    const browserCounts = {};
    const deviceCounts = {};
    const pageCounts = {};
    const heatmap = Array.from({ length: 7 }, () => Array(24).fill(0));
    let maxHeat = 1;

    visits.forEach((v) => {
      const os = v.os || "Unknown";
      const br = v.browser || "Unknown";
      const dv = v.deviceType || "Desktop";
      const pg = v.page || "portal";
      osCounts[os] = (osCounts[os] || 0) + 1;
      browserCounts[br] = (browserCounts[br] || 0) + 1;
      deviceCounts[dv] = (deviceCounts[dv] || 0) + 1;
      pageCounts[pg] = (pageCounts[pg] || 0) + 1;

      const d =
        typeof v.dayOfWeek === "number"
          ? v.dayOfWeek
          : new Date(v.timestamp || Date.now()).getDay();
      const h =
        typeof v.hourOfDay === "number"
          ? v.hourOfDay
          : new Date(v.timestamp || Date.now()).getHours();
      if (d >= 0 && d < 7 && h >= 0 && h < 24) {
        heatmap[d][h] += 1;
        if (heatmap[d][h] > maxHeat) maxHeat = heatmap[d][h];
      }
    });

    const topOf = (obj) => {
      const sorted = Object.entries(obj).sort((a, b) => b[1] - a[1]);
      return sorted[0] ? sorted[0][0] : "N/A";
    };

    return {
      osCounts,
      browserCounts,
      deviceCounts,
      pageCounts,
      heatmap,
      maxHeat,
      topOs: topOf(osCounts),
      topBrowser: topOf(browserCounts),
    };
  }, [visits]);

  const handleDispatchTestPing = async () => {
    await trackVisitEvent("console-diagnostic");
    await trackAiEvent("Diagnostic telemetry ping from console.kiruu.xyz", "Tawir-v7");
    setLocalVisits(readLocalBuffer("kiruu_local_telemetry_visits"));
    setLocalAi(readLocalBuffer("kiruu_local_telemetry_ai"));
    setPingSent(true);
    setTimeout(() => setPingSent(false), 2500);
  };

  const renderDistribution = (title, counts) => {
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const total = entries.reduce((acc, [, c]) => acc + c, 0) || 1;
    return (
      <div className="kiruu-card p-5">
        <div className="text-sm font-extrabold text-[#111827] mb-4">{title}</div>
        {entries.length === 0 ? (
          <p className="text-xs text-[#475569]">No telemetry records yet.</p>
        ) : (
          <div className="space-y-3">
            {entries.slice(0, 6).map(([label, count]) => {
              const pct = Math.round((count / total) * 100);
              return (
                <div key={label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#111827] font-bold">{label}</span>
                    <span className="text-[#475569] font-mono">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-200 border border-[#111111] overflow-hidden">
                    <div
                      className="h-full bg-[#111827] rounded-full transition-all"
                      style={{ width: `${Math.max(pct, 4)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header & Diagnostic Ping */}
      <div className="kiruu-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-extrabold text-[#111827]">
            Bounded Telemetry &amp; AI Usage Stream
          </h2>
          <p className="text-xs text-[#475569] mt-1">
            Reads bounded documents from <code className="font-mono font-bold">device_logs</code>{" "}
            and <code className="font-mono font-bold">ai_usage_logs</code> with automatic 30-day TTL
            and PII scrubbing.
          </p>
        </div>
        <button
          type="button"
          onClick={handleDispatchTestPing}
          className="kiruu-btn px-4 py-2 text-xs font-bold shrink-0"
        >
          {pingSent ? "Diagnostic Event Recorded!" : "Dispatch Test Ping"}
        </button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="kiruu-card p-4">
          <div className="text-[11px] font-bold uppercase text-[#475569]">Recent Visit Events</div>
          <div className="text-2xl font-extrabold font-mono text-[#111827] mt-1">
            {visits.length}
          </div>
        </div>
        <div className="kiruu-card p-4">
          <div className="text-[11px] font-bold uppercase text-[#475569]">Recent AI Queries</div>
          <div className="text-2xl font-extrabold font-mono text-indigo-700 mt-1">
            {aiLogs.length}
          </div>
        </div>
        <div className="kiruu-card p-4">
          <div className="text-[11px] font-bold uppercase text-[#475569]">Top OS</div>
          <div className="text-xl font-extrabold text-emerald-800 mt-1 truncate">
            {analytics.topOs}
          </div>
        </div>
        <div className="kiruu-card p-4">
          <div className="text-[11px] font-bold uppercase text-[#475569]">Top Browser</div>
          <div className="text-xl font-extrabold text-amber-800 mt-1 truncate">
            {analytics.topBrowser}
          </div>
        </div>
      </div>

      {/* Distributions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {renderDistribution("Operating Systems", analytics.osCounts)}
        {renderDistribution("Browsers", analytics.browserCounts)}
        {renderDistribution("Subdomain Traffic", analytics.pageCounts)}
      </div>

      {/* 7x24 Activity Heatmap */}
      <div className="kiruu-card p-5 overflow-x-auto">
        <div className="text-sm font-extrabold text-[#111827] mb-4">
          Weekly Activity Heatmap (Day &times; Hour)
        </div>
        <div className="min-w-[640px] space-y-1.5">
          {DAY_LABELS.map((day, dIdx) => (
            <div key={day} className="flex items-center gap-2">
              <span className="w-10 text-[11px] font-bold text-[#475569] font-mono">{day}</span>
              <div
                className="grid gap-1 flex-1"
                style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}
              >
                {analytics.heatmap[dIdx].map((count, hIdx) => {
                  const intensity =
                    count === 0 ? 0 : Math.max(0.25, count / analytics.maxHeat);
                  return (
                    <div
                      key={hIdx}
                      title={`${day} ${hIdx}:00 — ${count} events`}
                      className="h-5 rounded-xs border border-slate-300"
                      style={{
                        backgroundColor:
                          count === 0
                            ? "#f1f5f9"
                            : `rgba(17, 24, 39, ${intensity.toFixed(2)})`,
                      }}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent AI Usage Table */}
      <div className="kiruu-card p-5">
        <div className="text-sm font-extrabold text-[#111827] mb-4">
          Recent Scrubbed AI Queries
        </div>
        {aiLogs.length === 0 ? (
          <p className="text-xs text-[#475569]">No AI query events recorded yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border-1.5 border-[#111111] bg-white">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 border-b-1.5 border-[#111111] font-bold uppercase text-[#111827]">
                  <th className="py-2.5 px-4">Timestamp</th>
                  <th className="py-2.5 px-4">Engine</th>
                  <th className="py-2.5 px-4">Prompt (PII-Scrubbed)</th>
                  <th className="py-2.5 px-4">Client</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {aiLogs.slice(0, 25).map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-mono text-[11px] text-[#475569] whitespace-nowrap">
                      {item.timestamp ? new Date(item.timestamp).toLocaleString() : "Just now"}
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-[#fee6e3] border border-[#111111] text-[#111827] font-bold">
                        {item.engine || "Tawir"}
                      </span>
                    </td>
                    <td
                      className="py-2.5 px-4 max-w-md truncate font-medium text-[#111827]"
                      title={item.prompt}
                    >
                      {item.prompt || "(empty)"}
                    </td>
                    <td className="py-2.5 px-4 text-[#475569] whitespace-nowrap">
                      {item.os || "OS"} &bull; {item.browser || "Browser"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
