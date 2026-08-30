import { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase.js';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function DashboardApp() {
  const [deviceLogs, setDeviceLogs] = useState([]);
  const [aiLogs, setAiLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen to device logs
    const qDevices = query(
      collection(db, 'device_logs'),
      orderBy('createdAt', 'desc'),
      limit(200)
    );
    const unsubDevices = onSnapshot(qDevices, (snapshot) => {
      const logs = [];
      snapshot.forEach((doc) => logs.push({ id: doc.id, ...doc.data() }));
      setDeviceLogs(logs);
      setLoading(false);
    }, console.error);

    // Listen to AI usage logs
    const qAi = query(
      collection(db, 'ai_usage_logs'),
      orderBy('createdAt', 'desc'),
      limit(200)
    );
    const unsubAi = onSnapshot(qAi, (snapshot) => {
      const logs = [];
      snapshot.forEach((doc) => logs.push({ id: doc.id, ...doc.data() }));
      setAiLogs(logs);
    }, console.error);

    return () => {
      unsubDevices();
      unsubAi();
    };
  }, []);

  // Compute Statistics
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

    // Device breakdown
    const devices = { Desktop: 0, Mobile: 0, Tablet: 0 };
    const osMap = {};
    const browserMap = {};

    deviceLogs.forEach(log => {
      if (log.deviceType) devices[log.deviceType] = (devices[log.deviceType] || 0) + 1;
      if (log.os) osMap[log.os] = (osMap[log.os] || 0) + 1;
      if (log.browser) browserMap[log.browser] = (browserMap[log.browser] || 0) + 1;
    });

    // Heatmap Matrix (7 days x 24 hours)
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

  return (
    <div className="min-h-screen bg-[#0b0c10] text-white p-4 sm:p-8 font-sans">
      {/* Header */}
      <header className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 border-b border-white/10 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18" />
              <path d="M9 21V9" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Kiruu Analytics Dashboard</h1>
            <p className="text-xs sm:text-sm text-text-lo">Real-time device tracking, AI query telemetry & heatmaps</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Live Telemetry Active</span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto space-y-8">
        
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard 
            title="Total Visits Logged" 
            value={stats.totalVisits} 
            icon={<UsersIcon />} 
            color="from-indigo-500/20 to-indigo-600/10" 
            border="border-indigo-500/30" 
          />
          <StatCard 
            title="Visits Today" 
            value={stats.visitsToday} 
            icon={<ZapIcon />} 
            color="from-emerald-500/20 to-emerald-600/10" 
            border="border-emerald-500/30" 
          />
          <StatCard 
            title="Total Kiruu AI Queries" 
            value={stats.totalAiQueries} 
            icon={<SparklesIcon />} 
            color="from-purple-500/20 to-purple-600/10" 
            border="border-purple-500/30" 
          />
          <StatCard 
            title="AI Queries Today" 
            value={stats.aiToday} 
            icon={<FlameIcon />} 
            color="from-amber-500/20 to-amber-600/10" 
            border="border-amber-500/30" 
          />
        </div>

        {/* Activity Heatmap */}
        <section className="glass-card-dark rounded-2xl p-6 border border-white/10 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-2">
            <div className="flex items-center gap-2">
              <FlameIcon className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-bold">Activity Heatmap</h2>
              <span className="text-xs font-normal text-text-lo">(Peak Usage Hours & Days)</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-text-lo">
              <span>Less</span>
              <div className="flex gap-1">
                <span className="w-3 h-3 rounded bg-white/5" />
                <span className="w-3 h-3 rounded bg-indigo-900/60" />
                <span className="w-3 h-3 rounded bg-indigo-600/80" />
                <span className="w-3 h-3 rounded bg-purple-500" />
                <span className="w-3 h-3 rounded bg-emerald-400" />
              </div>
              <span>More</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[650px]">
              {/* Hour labels */}
              <div className="grid grid-cols-25 gap-1 mb-2 text-[10px] text-text-lo text-center">
                <div className="text-left font-medium">Day / Hr</div>
                {HOURS.map(h => (
                  <div key={h}>{h < 10 ? `0${h}` : h}</div>
                ))}
              </div>

              {/* Day rows */}
              {DAYS.map((dayName, dayIdx) => (
                <div key={dayName} className="grid grid-cols-25 gap-1 mb-1 items-center">
                  <div className="text-xs font-semibold text-text-mid text-left">{dayName}</div>
                  {HOURS.map(hour => {
                    const count = stats.heatmap[dayIdx][hour];
                    const ratio = count / stats.maxCellCount;

                    let bg = 'bg-white/5';
                    if (count > 0) {
                      if (ratio > 0.75) bg = 'bg-emerald-400 text-black font-bold';
                      else if (ratio > 0.4) bg = 'bg-purple-500';
                      else if (ratio > 0.15) bg = 'bg-indigo-600';
                      else bg = 'bg-indigo-900/60';
                    }

                    return (
                      <div
                        key={hour}
                        title={`${dayName} at ${hour}:00 - ${count} events`}
                        className={`h-7 rounded flex items-center justify-center text-[10px] transition-all hover:scale-110 cursor-pointer ${bg}`}
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

        {/* Device & Browser Distribution Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Device Type Distribution */}
          <div className="glass-card-dark rounded-2xl p-6 border border-white/10 shadow-xl flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-4">
              <DeviceIcon className="w-5 h-5 text-indigo-400" />
              <h2 className="text-base font-bold">Device Types</h2>
            </div>
            <div className="space-y-4 flex-1 flex flex-col justify-center">
              <ProgressBar label="Desktop" icon={<DesktopIcon />} count={stats.devices.Desktop || 0} total={stats.totalVisits || 1} color="bg-indigo-500" />
              <ProgressBar label="Mobile" icon={<MobileIcon />} count={stats.devices.Mobile || 0} total={stats.totalVisits || 1} color="bg-purple-500" />
              <ProgressBar label="Tablet" icon={<TabletIcon />} count={stats.devices.Tablet || 0} total={stats.totalVisits || 1} color="bg-emerald-400" />
            </div>
          </div>

          {/* OS Distribution */}
          <div className="glass-card-dark rounded-2xl p-6 border border-white/10 shadow-xl flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-4">
              <CpuIcon className="w-5 h-5 text-purple-400" />
              <h2 className="text-base font-bold">Operating Systems</h2>
            </div>
            <div className="space-y-3 flex-1 flex flex-col justify-center">
              {Object.entries(stats.osMap).map(([os, count]) => (
                <ProgressBar key={os} label={os} icon={<OsLogo os={os} />} count={count} total={stats.totalVisits || 1} color="bg-gradient-to-r from-indigo-500 to-purple-500" />
              ))}
            </div>
          </div>

          {/* Browser Distribution */}
          <div className="glass-card-dark rounded-2xl p-6 border border-white/10 shadow-xl flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-4">
              <GlobeIcon className="w-5 h-5 text-emerald-400" />
              <h2 className="text-base font-bold">Browsers</h2>
            </div>
            <div className="space-y-3 flex-1 flex flex-col justify-center">
              {Object.entries(stats.browserMap).map(([browser, count]) => (
                <ProgressBar key={browser} label={browser} icon={<BrowserLogo browser={browser} />} count={count} total={stats.totalVisits || 1} color="bg-gradient-to-r from-purple-500 to-emerald-400" />
              ))}
            </div>
          </div>

        </div>

        {/* Live Logs Stream */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Recent AI Queries */}
          <div className="glass-card-dark rounded-2xl p-6 border border-white/10 shadow-xl flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <SparklesIcon className="w-5 h-5 text-purple-400" />
              <h2 className="text-base font-bold">Recent Kiruu AI Queries</h2>
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {aiLogs.length === 0 ? (
                <p className="text-xs text-text-lo italic">No AI queries logged yet.</p>
              ) : (
                aiLogs.map((log) => (
                  <div key={log.id} className="p-3 rounded-xl bg-white/5 border border-white/5 flex flex-col gap-1 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-primary">{log.prompt}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-text-lo font-mono">{log.engine || 'Gemini'}</span>
                    </div>
                    <div className="text-[10px] text-text-lo flex justify-between items-center mt-1">
                      <span className="flex items-center gap-1.5">
                        <OsLogo os={log.os} className="w-3.5 h-3.5" />
                        <BrowserLogo browser={log.browser} className="w-3.5 h-3.5" />
                        <span>{log.deviceType} • {log.os} • {log.browser}</span>
                      </span>
                      <span>{log.createdAt?.toDate ? log.createdAt.toDate().toLocaleTimeString() : 'Just now'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Visitor Logs */}
          <div className="glass-card-dark rounded-2xl p-6 border border-white/10 shadow-xl flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <EyeIcon className="w-5 h-5 text-emerald-400" />
              <h2 className="text-base font-bold">Live Visitor Logs</h2>
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {deviceLogs.length === 0 ? (
                <p className="text-xs text-text-lo italic">No visits logged yet.</p>
              ) : (
                deviceLogs.map((log) => (
                  <div key={log.id} className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-white/10 text-white flex items-center justify-center">
                        <DeviceTypeIcon deviceType={log.deviceType} className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-white flex items-center gap-1.5">
                          <OsLogo os={log.os} className="w-3.5 h-3.5" />
                          <span>{log.os}</span>
                          <span className="text-text-lo">({log.browser})</span>
                        </div>
                        <div className="text-[10px] text-text-lo">{log.screenWidth}x{log.screenHeight} • Page: /{log.page || 'movie'}</div>
                      </div>
                    </div>
                    <span className="text-[10px] text-text-lo">
                      {log.createdAt?.toDate ? log.createdAt.toDate().toLocaleTimeString() : 'Just now'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </main>

      <style>{`
        .grid-cols-25 {
          grid-template-columns: 80px repeat(24, minmax(0, 1fr));
        }
      `}</style>
    </div>
  );
}

function StatCard({ title, value, icon, color, border }) {
  return (
    <div className={`glass-card-dark bg-gradient-to-br ${color} rounded-2xl p-5 border ${border} shadow-lg flex items-center justify-between`}>
      <div>
        <p className="text-xs font-semibold text-text-lo uppercase tracking-wider">{title}</p>
        <p className="text-2xl font-black text-white mt-1">{value}</p>
      </div>
      <div className="p-3 rounded-xl bg-white/10 border border-white/10 text-white">
        {icon}
      </div>
    </div>
  );
}

function ProgressBar({ label, icon, count, total, color }) {
  const percent = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center text-xs font-medium">
        <span className="text-white flex items-center gap-2">
          {icon}
          <span>{label}</span>
        </span>
        <span className="text-text-lo">{count} ({percent}%)</span>
      </div>
      <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

// SVG Logo & Icon Components

function UsersIcon({ className = "w-6 h-6" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function ZapIcon({ className = "w-6 h-6" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function SparklesIcon({ className = "w-6 h-6" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

function FlameIcon({ className = "w-6 h-6" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3.5z" />
    </svg>
  );
}

function DeviceIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="12" rx="2" />
      <line x1="12" y1="16" x2="12" y2="20" />
      <line x1="8" y1="20" x2="16" y2="20" />
    </svg>
  );
}

function CpuIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="9" y="9" width="6" height="6" />
      <line x1="9" y1="1" x2="9" y2="4" />
      <line x1="15" y1="1" x2="15" y2="4" />
      <line x1="9" y1="20" x2="9" y2="23" />
      <line x1="15" y1="20" x2="15" y2="23" />
      <line x1="20" y1="9" x2="23" y2="9" />
      <line x1="20" y1="15" x2="23" y2="15" />
      <line x1="1" y1="9" x2="4" y2="9" />
      <line x1="1" y1="15" x2="4" y2="15" />
    </svg>
  );
}

function GlobeIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function EyeIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function DesktopIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}

function MobileIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="5" y="2" width="14" height="20" rx="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="3" />
    </svg>
  );
}

function TabletIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="3" />
    </svg>
  );
}

function DeviceTypeIcon({ deviceType, className = "w-4 h-4" }) {
  if (deviceType === 'Mobile') return <MobileIcon className={className} />;
  if (deviceType === 'Tablet') return <TabletIcon className={className} />;
  return <DesktopIcon className={className} />;
}

// OS SVG Brand Logos
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

  // Linux default
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  );
}

// Browser SVG Brand Logos
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
