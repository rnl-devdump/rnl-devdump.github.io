import { useMemo, useState } from "react";
import { addDoc, collection, getDocs, limit, orderBy, query, serverTimestamp } from "firebase/firestore";
import { db } from "./lib/firebase";

const USERS = ["Jelian", "Nathan", "Jeliane", "Shaira", "Raven"];
const WORD_CLASS_OPTIONS = ["Noun", "Verb", "Adjective", "Adverb", "Pronoun", "Preposition", "Conjunction", "Interjection", "Other"];
const DEFAULT_INSTRUCTION = "Translate the following English text to Pangasinan:";
const SAVE_TIMEOUT_MS = 15000;

function createEntry(idSeed = Date.now()) {
  return {
    id: `${idSeed}-${Math.random().toString(36).slice(2, 8)}`,
    instruction: DEFAULT_INSTRUCTION,
    input: "",
    output: "",
    classification: "Noun",
  };
}

export default function DatasetAnnotationPage() {
  const [selectedUser, setSelectedUser] = useState(USERS[0]);
  const [entries, setEntries] = useState([createEntry()]);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [showRecent, setShowRecent] = useState(false);
  const [isLoadingRecent, setIsLoadingRecent] = useState(false);
  const [recentError, setRecentError] = useState("");
  const [recentTranslations, setRecentTranslations] = useState([]);
  const [userTotals, setUserTotals] = useState([]);

  const hasContent = useMemo(
    () => entries.some((entry) => entry.input.trim() || entry.output.trim()),
    [entries],
  );
  const completedCount = useMemo(
    () => entries.filter((entry) => entry.input.trim() && entry.output.trim()).length,
    [entries],
  );
  const pendingCount = entries.length - completedCount;
  const progress = entries.length ? Math.round((completedCount / entries.length) * 100) : 0;
  const userInitials = selectedUser.slice(0, 2).toUpperCase();

  const updateEntry = (id, field, value) => {
    setEntries((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, [field]: value } : entry)),
    );
  };

  const addEntry = () => {
    setEntries((prev) => [...prev, createEntry()]);
  };

  const deleteEntry = (id) => {
    setEntries((prev) => prev.filter((entry) => entry.id !== id));
  };

  const handleSave = async () => {
    if (!selectedUser) {
      setMessageType("error");
      setMessage("Please select a user.");
      return;
    }

    if (!hasContent) {
      setMessageType("error");
      setMessage("Add at least one translation before saving.");
      return;
    }

    try {
      setIsSaving(true);
      setMessage("");
      setMessageType("info");

      const payload = {
        selectedUser,
        entries: entries.map(({ id, instruction, input, output, classification }) => ({
          id,
          instruction,
          input: input.trim(),
          output: output.trim(),
          classification: classification || "Other",
        })),
        createdAt: serverTimestamp(),
      };

      const savePromise = addDoc(collection(db, "translations"), payload);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error("Save request timed out. Check network and Firestore rules.")),
          SAVE_TIMEOUT_MS,
        );
      });

      await Promise.race([savePromise, timeoutPromise]);
      setMessageType("success");
      setMessage("Saved successfully.");
      setEntries([createEntry()]);
    } catch (error) {
      setMessageType("error");
      const rawMessage = error?.message || "Failed to save to Firestore.";
      if (rawMessage.toLowerCase().includes("permission")) {
        setMessage("Permission denied. Update Firestore rules to allow writes from this app.");
      } else {
        setMessage(rawMessage);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const fetchRecentTranslations = async () => {
    try {
      setIsLoadingRecent(true);
      setRecentError("");

      const translationsRef = collection(db, "translations");
      const recentQuery = query(translationsRef, orderBy("createdAt", "desc"), limit(20));
      const snap = await getDocs(recentQuery);

      const docs = snap.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          selectedUser: data.selectedUser || "Unknown",
          entriesCount: Array.isArray(data.entries) ? data.entries.length : 0,
          createdAt: data.createdAt || null,
        };
      });

      const counts = new Map(USERS.map((user) => [user, 0]));
      docs.forEach((item) => {
        const current = counts.get(item.selectedUser) || 0;
        counts.set(item.selectedUser, current + item.entriesCount);
      });

      setRecentTranslations(docs);
      setUserTotals(
        Array.from(counts.entries())
          .map(([user, total]) => ({ user, total }))
          .sort((a, b) => b.total - a.total),
      );
    } catch (error) {
      setRecentError(error?.message || "Failed to load recent translations.");
    } finally {
      setIsLoadingRecent(false);
    }
  };

  const handleToggleRecent = async () => {
    const next = !showRecent;
    setShowRecent(next);
    if (next) {
      await fetchRecentTranslations();
    }
  };

  const formatCreatedAt = (createdAt) => {
    if (!createdAt?.toDate) return "No timestamp";
    return createdAt.toDate().toLocaleString();
  };

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-900 md:px-8">
      <div className="mx-auto max-w-5xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-8">
        <header className="mb-6">
          <h1 className="text-xl font-semibold text-slate-900">Pangasinan Dataset Annotation Tool</h1>
          <p className="mt-1 text-sm text-slate-600">
            Do all parallel instructions, then save everyting to Firestore:
          </p>
        </header>

        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-500 text-xs font-semibold text-white">
              {userInitials}
            </div>
            <select
              value={selectedUser}
              onChange={(event) => setSelectedUser(event.target.value)}
              className="cursor-pointer border-none bg-transparent text-sm font-medium text-violet-900 outline-none"
            >
              {USERS.map((user) => (
                <option key={user} value={user}>
                  {user}
                </option>
              ))}
            </select>
          </div>
          <p className="text-xs text-slate-500">{progress}% complete</p>
        </div>

        <div className="mb-6 h-1.5 overflow-hidden rounded-full bg-violet-200">
          <div
            className="h-full rounded-full bg-violet-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="mb-6 grid gap-2.5 md:grid-cols-3">
          <div className="rounded-xl bg-blue-100 p-4">
            <p className="text-xs font-medium text-blue-800">Total entries</p>
            <p className="mt-1 text-3xl font-semibold text-blue-950">{entries.length}</p>
          </div>
          <div className="rounded-xl bg-emerald-100 p-4">
            <p className="text-xs font-medium text-emerald-800">Completed</p>
            <p className="mt-1 text-3xl font-semibold text-emerald-950">{completedCount}</p>
          </div>
          <div className="rounded-xl bg-amber-100 p-4">
            <p className="text-xs font-medium text-amber-800">Pending</p>
            <p className="mt-1 text-3xl font-semibold text-amber-950">{pendingCount}</p>
          </div>
        </div>

        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Translation entries
          </p>
          <button
            type="button"
            onClick={handleToggleRecent}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-slate-700"
          >
            {showRecent ? "Hide Recent Translations" : "Show Recent Translations"}
          </button>
        </div>

        {showRecent ? (
          <section className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h2 className="text-sm font-semibold text-slate-800">Recent translations</h2>
            {isLoadingRecent ? <p className="mt-2 text-sm text-slate-600">Loading...</p> : null}
            {recentError ? <p className="mt-2 text-sm text-red-700">{recentError}</p> : null}

            {!isLoadingRecent && !recentError ? (
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Total entries per user
                  </p>
                  <div className="mt-2 space-y-1.5">
                    {userTotals.map((item) => (
                      <div key={item.user} className="flex items-center justify-between text-sm">
                        <span className="text-slate-700">{item.user}</span>
                        <span className="font-semibold text-slate-900">{item.total}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Last saves
                  </p>
                  <div className="mt-2 max-h-48 space-y-2 overflow-auto pr-1">
                    {recentTranslations.length === 0 ? (
                      <p className="text-sm text-slate-600">No translations found yet.</p>
                    ) : (
                      recentTranslations.map((item) => (
                        <div key={item.id} className="rounded-md border border-slate-200 p-2 text-sm">
                          <p className="font-medium text-slate-800">{item.selectedUser}</p>
                          <p className="text-slate-600">{item.entriesCount} entries</p>
                          <p className="text-xs text-slate-500">{formatCreatedAt(item.createdAt)}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        <div className="space-y-3">
          {entries.map((entry, index) => {
            const isDone = entry.input.trim() && entry.output.trim();
            return (
              <article
                key={entry.id}
                className={`rounded-xl border bg-white p-4 ${
                  isDone
                    ? "border-emerald-200 border-l-4 border-l-emerald-400"
                    : "border-slate-200 border-l-4 border-l-violet-300"
                }`}
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-800">Entry #{index + 1}</p>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        isDone ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {isDone ? "Complete" : "Pending"}
                    </span>
                    <button
                      type="button"
                      onClick={() => deleteEntry(entry.id)}
                      disabled={entries.length === 1}
                      className="rounded-md bg-red-50 px-3 py-1 text-xs font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="mb-3 flex items-start gap-2">
                  <span className="mt-2 rounded-full bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-800">
                    Instruction
                  </span>
                  <textarea
                    value={entry.instruction}
                    onChange={(event) => updateEntry(entry.id, "instruction", event.target.value)}
                    rows={2}
                    className="min-h-[72px] w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-violet-500"
                  />
                </div>

                <div className="grid gap-2.5 md:grid-cols-2">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium text-violet-800">Classification</span>
                    <select
                      value={entry.classification || "Noun"}
                      onChange={(event) => updateEntry(entry.id, "classification", event.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-violet-500"
                    >
                      {WORD_CLASS_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="mt-2 grid gap-2.5 md:grid-cols-2">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium text-blue-800">Input (English)</span>
                    <textarea
                      value={entry.input}
                      onChange={(event) => updateEntry(entry.id, "input", event.target.value)}
                      rows={4}
                      placeholder="Enter English text..."
                      className="min-h-[92px] w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-blue-500"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium text-emerald-800">Output (Pangasinan)</span>
                    <textarea
                      value={entry.output}
                      onChange={(event) => updateEntry(entry.id, "output", event.target.value)}
                      rows={4}
                      placeholder="Enter Pangasinan translation..."
                      className="min-h-[92px] w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-emerald-500"
                    />
                  </label>
                </div>
              </article>
            );
          })}
        </div>

        <button
          type="button"
          onClick={addEntry}
          className="mt-3 flex w-full items-center justify-center rounded-lg bg-violet-100 px-4 py-2.5 text-sm font-medium text-violet-800 transition hover:bg-violet-200"
        >
          + Add entry
        </button>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-blue-100 p-4">
          <p className="text-sm text-blue-800">
            Saves selected user + all entries in one Firestore document.
          </p>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-lg bg-blue-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSaving ? "Saving..." : "Save to DB"}
          </button>
        </div>

        {message ? (
          <div className="pointer-events-none fixed bottom-6 right-6 z-50">
            <p
              className={`rounded-md px-4 py-2 text-sm text-white shadow-lg ${
                messageType === "success"
                  ? "bg-emerald-700"
                  : messageType === "error"
                    ? "bg-red-700"
                    : "bg-slate-700"
              }`}
            >
              {message}
            </p>
          </div>
        ) : null}
      </div>
    </main>
  );
}
