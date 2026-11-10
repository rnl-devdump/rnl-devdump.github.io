export default function AuditLogTab({ auditEntries = [], loading = false }) {
  return (
    <div className="space-y-6">
      <div className="kiruu-card p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase bg-emerald-50 text-emerald-800 border border-emerald-400 mb-1">
              Append-Only Ledger &bull; site_config/status/audit
            </span>
            <h2 className="text-lg sm:text-xl font-extrabold text-[#111827]">
              Administrator Security &amp; Activity Audit Log
            </h2>
            <p className="text-xs text-[#475569] mt-0.5">
              Every service status change, master switch toggle, and announcement update is
              transactionally recorded and protected against modification or deletion by Firestore
              security rules.
            </p>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-slate-100 border-1.5 border-[#111111] font-mono text-xs font-bold text-[#111827]">
            {auditEntries.length} Recorded Event{auditEntries.length === 1 ? "" : "s"}
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm font-semibold text-[#475569]">
            Loading immutable audit log...
          </div>
        ) : auditEntries.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-slate-50 border border-dashed border-slate-300 text-sm text-[#475569]">
            No audit events recorded yet. Toggle a service or deploy an announcement to create the
            first versioned audit entry.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border-1.5 border-[#111111] bg-white">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 border-b-1.5 border-[#111111] font-bold uppercase tracking-wider text-[#111827]">
                  <th className="py-3 px-4">Version</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Administrator</th>
                  <th className="py-3 px-4">Target</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Master Switch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {auditEntries.map((entry) => {
                  const ts = entry.timestamp
                    ? new Date(entry.timestamp).toLocaleString()
                    : entry.createdAt?.seconds
                    ? new Date(entry.createdAt.seconds * 1000).toLocaleString()
                    : "Just now";
                  return (
                    <tr key={entry.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 font-mono font-bold text-indigo-700">
                        v{entry.version ?? "-"}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[#475569] whitespace-nowrap">
                        {ts}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-[#111827]">
                        <div>{entry.actorEmail || "Admin"}</div>
                        <div className="font-mono text-[10px] text-[#64748b]">
                          {entry.actorUid || ""}
                        </div>
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="inline-block px-2 py-0.5 rounded bg-slate-100 border border-slate-300 font-mono font-semibold text-[#111827]">
                          {entry.targetService || "all"}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-medium text-[#111827]">{entry.action}</td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            entry.masterSwitch !== false
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {entry.masterSwitch !== false ? "ONLINE" : "MAINTENANCE"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
