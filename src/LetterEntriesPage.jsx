import { useCallback, useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "./lib/firebase";
import { entryFromFirestore, letterOpenPath } from "./lib/letterConfig";
import "./letter-entries.css";

function formatCreatedAt(createdAt) {
  if (!createdAt) return "—";
  const date =
    typeof createdAt.toDate === "function"
      ? createdAt.toDate()
      : createdAt.seconds
        ? new Date(createdAt.seconds * 1000)
        : null;
  if (!date || Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

export default function LetterEntriesPage() {
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadEntries = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const snap = await getDocs(collection(db, "letterC"));
      const rows = snap.docs.map((docSnap) => entryFromFirestore(docSnap.id, docSnap.data()));
      rows.sort((a, b) => {
        const aSec = a.createdAt?.seconds ?? 0;
        const bSec = b.createdAt?.seconds ?? 0;
        return bSec - aSec;
      });
      setEntries(rows);
    } catch (err) {
      setError(err?.message || "Could not load entries from Firestore.");
      setEntries([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const openEntry = (id) => {
    window.location.href = letterOpenPath(id);
  };

  const helperHref =
    typeof window !== "undefined" && window.location.pathname.includes("/letter")
      ? "/helper"
      : "/helper";

  return (
    <main className="letter-entries-page">
      <div className="letter-entries-inner">
        <h1>Letter entries</h1>
        <p className="subtitle">
          All documents in <code>letterC</code>. Legacy rows show To, letter content, and From; regards
          default to &ldquo;Sincerely,&rdquo; when missing.
        </p>

        <div className="letter-entries-toolbar">
          <a className="btn-helper" href={helperHref}>
            Letter helper
          </a>
          <button type="button" className="btn-refresh" onClick={loadEntries} disabled={isLoading}>
            {isLoading ? "Loading…" : "Refresh"}
          </button>
        </div>

        {error ? <p className="letter-entries-status error">{error}</p> : null}
        {!error && isLoading ? <p className="letter-entries-status">Loading entries…</p> : null}
        {!error && !isLoading ? (
          <p className="letter-entries-status">{entries.length} entr{entries.length === 1 ? "y" : "ies"}</p>
        ) : null}

        <div className="letter-entries-table-wrap">
          {!isLoading && entries.length === 0 ? (
            <p className="letter-entries-empty">No letters published yet.</p>
          ) : (
            <table className="letter-entries-table">
              <thead>
                <tr>
                  <th>Letter name</th>
                  <th>To</th>
                  <th>Letter content</th>
                  <th>Regards</th>
                  <th>From</th>
                  <th>Pin</th>
                  <th>Created</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td>
                      {entry.letterName}
                      <div className="mono">{entry.id}</div>
                    </td>
                    <td>
                      {entry.to}
                      {entry.isLegacy ? <span className="badge-legacy">legacy</span> : null}
                    </td>
                    <td className="cell-preview" title={entry.content}>
                      {entry.content}
                    </td>
                    <td>{entry.regards}</td>
                    <td>{entry.from}</td>
                    <td>{entry.pin}</td>
                    <td>{formatCreatedAt(entry.createdAt)}</td>
                    <td>
                      <button type="button" className="btn-open" onClick={() => openEntry(entry.id)}>
                        Open letter
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </main>
  );
}
