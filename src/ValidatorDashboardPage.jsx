import { useEffect, useMemo, useRef, useState } from "react";
import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db as sourceDb } from "./lib/firebase";
import { validationDb } from "./lib/validationFirebase";

const PAGE_SIZE = 50;
const VALIDATOR_NAME_STORAGE_KEY = "dataset_validator_name_v1";
const VALIDATION_PARENT_DOC_ID = import.meta.env.VITE_VALIDATION_PARENT_DOC_ID ?? "val";
const WORD_CLASS_OPTIONS = ["Noun", "Verb", "Adjective", "Adverb", "Pronoun", "Preposition", "Conjunction", "Interjection", "Other"];

function coerceString(value) {
  if (typeof value === "string") return value;
  if (value == null) return "";
  return String(value);
}

function normalizeTranslationDocs(docs) {
  const out = [];

  for (const snap of docs) {
    const data = snap.data() || {};

    // Shape A: legacy batch doc that contains `entries: []`
    if (Array.isArray(data.entries)) {
      data.entries.forEach((entry, index) => {
        const instruction = coerceString(entry?.instruction ?? data.instruction);
        const input = coerceString(entry?.input);
        const output = coerceString(entry?.output);
        const processed = Boolean(entry?.processed ?? data.processed ?? data.validated ?? false);
        const classification = coerceString(entry?.classification ?? data.classification);

        out.push({
          key: `${snap.id}:${entry?.id ?? index}`,
          sourceDocId: snap.id,
          sourceEntryId: entry?.id ?? null,
          sourceEntryIndex: index,
          instruction,
          input,
          output,
          classification,
          processed,
        });
      });

      continue;
    }

    // Shape B: single-entry doc
    out.push({
      key: snap.id,
      sourceDocId: snap.id,
      sourceEntryId: null,
      sourceEntryIndex: null,
      instruction: coerceString(data.instruction),
      input: coerceString(data.input),
      output: coerceString(data.output),
      classification: coerceString(data.classification),
      processed: Boolean(data.processed ?? data.validated ?? false),
    });
  }

  return out;
}

function buildSourceKey({ sourceDocId, sourceEntryId, sourceEntryIndex }) {
  const entryId = sourceEntryId == null ? "null" : String(sourceEntryId);
  const entryIndex = sourceEntryIndex == null ? "null" : String(sourceEntryIndex);
  return `${sourceDocId}::${entryId}::${entryIndex}`;
}

function nextPendingIndex(items, startIndex) {
  for (let i = Math.max(0, startIndex); i < items.length; i += 1) {
    if (items[i].decision === "pending") return i;
  }
  return -1;
}

export default function ValidatorDashboardPage() {
  const [validatorName, setValidatorName] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage?.getItem(VALIDATOR_NAME_STORAGE_KEY) ?? "";
  });
  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [toast, setToast] = useState({ type: "info", message: "" });
  const [markOriginalsProcessed, setMarkOriginalsProcessed] = useState(true);
  const toastTimerRef = useRef(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast({ type: "info", message: "" }), 2500);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const trimmed = validatorName.trim();
    window.localStorage?.setItem(VALIDATOR_NAME_STORAGE_KEY, trimmed);
  }, [validatorName]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setIsLoading(true);
        setLoadError("");

        const translationsRef = collection(sourceDb, "translations");
        const validatedRef = collection(
          validationDb,
          "validations",
          VALIDATION_PARENT_DOC_ID,
          "validated_translations",
        );

        // Build a quick lookup of source entries already validated in DB.
        const validatedSnap = await getDocs(validatedRef);
        const alreadyValidatedSourceKeys = new Set(
          validatedSnap.docs
            .map((docSnap) => docSnap.data()?.source)
            .filter((source) => source?.collection === "translations" && source?.docId)
            .map((source) =>
              buildSourceKey({
                sourceDocId: source.docId,
                sourceEntryId: source.entryId ?? null,
                sourceEntryIndex: source.entryIndex ?? null,
              }),
            ),
        );

        // Prefer explicit "unvalidated" query when possible.
        let snap;
        try {
          const unvalidatedQuery = query(
            translationsRef,
            where("processed", "==", false),
            orderBy("createdAt", "desc"),
            limit(PAGE_SIZE),
          );
          snap = await getDocs(unvalidatedQuery);
        } catch {
          const fallbackQuery = query(translationsRef, orderBy("createdAt", "desc"), limit(PAGE_SIZE));
          snap = await getDocs(fallbackQuery);
        }

        const normalized = normalizeTranslationDocs(snap.docs)
          .filter((entry) => entry.input.trim() || entry.output.trim())
          .filter((entry) => !entry.processed)
          .filter((entry) => !alreadyValidatedSourceKeys.has(buildSourceKey(entry)))
          .slice(0, PAGE_SIZE)
          .map((entry) => ({
            ...entry,
            editedInstruction: entry.instruction,
            editedInput: entry.input,
            editedOutput: entry.output,
            editedClassification: entry.classification || "Other",
            decision: "pending", // pending | accepted | rejected
            decidedAt: null,
          }));

        if (cancelled) return;
        setItems(normalized);
        setCursor(0);
      } catch (error) {
        if (cancelled) return;
        setLoadError(error?.message || "Failed to load translations from Firestore.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const currentIndex = useMemo(() => nextPendingIndex(items, cursor), [items, cursor]);
  const current = currentIndex >= 0 ? items[currentIndex] : null;

  const metrics = useMemo(() => {
    let accepted = 0;
    let rejected = 0;
    let remaining = 0;
    for (const item of items) {
      if (item.decision === "accepted") accepted += 1;
      else if (item.decision === "rejected") rejected += 1;
      else remaining += 1;
    }
    return { accepted, rejected, remaining };
  }, [items]);

  const decisions = useMemo(() => {
    return items
      .filter((item) => item.decision !== "pending")
      .slice()
      .sort((a, b) => (b.decidedAt || 0) - (a.decidedAt || 0));
  }, [items]);

  const updateCurrent = (field, value) => {
    if (!current) return;
    setItems((prev) =>
      prev.map((item) => (item.key === current.key ? { ...item, [field]: value } : item)),
    );
  };

  const decide = (decision) => {
    if (!current) return;
    if (!validatorName.trim()) {
      showToast("error", "Validator Name is required.");
      return;
    }

    setItems((prev) =>
      prev.map((item) =>
        item.key === current.key
          ? { ...item, decision, decidedAt: Date.now() }
          : item,
      ),
    );

    setCursor(currentIndex + 1);
  };

  const handleFinalize = async () => {
    if (!validatorName.trim()) {
      showToast("error", "Validator Name is required.");
      return;
    }

    const approved = items.filter((item) => item.decision === "accepted");
    if (approved.length === 0) {
      showToast("error", "No approved items to finalize.");
      return;
    }

    try {
      setIsFinalizing(true);

      const batch = writeBatch(validationDb);
      const parentRef = doc(validationDb, "validations", VALIDATION_PARENT_DOC_ID);
      const validatedRef = collection(parentRef, "validated_translations");

      batch.set(
        parentRef,
        {
          validatorName: validatorName.trim(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      const touchedSourceDocs = new Set();

      for (const item of approved) {
        const newDocRef = doc(validatedRef);
        batch.set(newDocRef, {
          instruction: item.editedInstruction.trim(),
          input: item.editedInput.trim(),
          output: item.editedOutput.trim(),
          classification: item.editedClassification || "Other",
          validatorName: validatorName.trim(),
          source: {
            collection: "translations",
            docId: item.sourceDocId,
            entryId: item.sourceEntryId,
            entryIndex: item.sourceEntryIndex,
          },
          validatedAt: serverTimestamp(),
        });

        if (markOriginalsProcessed) touchedSourceDocs.add(item.sourceDocId);
      }

      if (markOriginalsProcessed) {
        const sourceBatch = writeBatch(sourceDb);
        for (const sourceDocId of touchedSourceDocs) {
          sourceBatch.update(doc(sourceDb, "translations", sourceDocId), {
            processed: true,
            processedAt: serverTimestamp(),
          });
        }
        await sourceBatch.commit();
      }

      await batch.commit();
      showToast("success", `Finalized ${approved.length} approved item(s).`);

      // Remove accepted items from local cache; keep rejected for session history.
      setItems((prev) =>
        prev.map((item) =>
          item.decision === "accepted"
            ? { ...item, decision: "accepted", finalizedAt: Date.now() }
            : item,
        ),
      );
    } catch (error) {
      showToast("error", error?.message || "Finalize failed.");
    } finally {
      setIsFinalizing(false);
    }
  };

  const badgeClass =
    current?.decision === "pending"
      ? "bg-amber-100 text-amber-800"
      : current?.decision === "accepted"
        ? "bg-emerald-100 text-emerald-800"
        : "bg-red-100 text-red-800";

  const validatorInitials = useMemo(() => {
    const trimmed = validatorName.trim();
    if (!trimmed) return "--";
    const parts = trimmed.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
  }, [validatorName]);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-900 md:px-8">
      <div className="mx-auto max-w-6xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-8">
        <header className="mb-6">
          <h1 className="text-xl font-semibold text-slate-900">Dataset Validation Dashboard</h1>
          <p className="mt-1 text-sm text-slate-600">
            Review cached entries, approve/deny, then batch-write approved items to{" "}
            <span className="font-medium text-slate-800">
              validations/{VALIDATION_PARENT_DOC_ID}/validated_translations
            </span>
            .
          </p>
          <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <span className="font-semibold">(!) Note:</span> Input and Output text is editable. Only
            deny when the entry is irrelevant.
          </p>
        </header>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-500 text-xs font-semibold text-white">
              {validatorInitials}
            </div>
            <label className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-violet-900">
                Validator Name
              </span>
              <input
                value={validatorName}
                onChange={(e) => setValidatorName(e.target.value)}
                placeholder="Required"
                className="w-56 rounded-md border border-violet-200 bg-white px-2.5 py-1 text-sm text-slate-900 outline-none transition focus:border-violet-500"
              />
            </label>
          </div>
          {!validatorName.trim() ? (
            <p className="text-xs font-semibold text-red-700">Validator Name is required to approve/finalize.</p>
          ) : (
            <p className="text-xs text-slate-500">Saved locally for this browser.</p>
          )}
        </div>

        <div className="mb-6 grid gap-2.5 md:grid-cols-3">
          <div className="rounded-xl bg-blue-100 p-4">
            <p className="text-xs font-medium text-blue-800">Remaining to review</p>
            <p className="mt-1 text-3xl font-semibold text-blue-950">{metrics.remaining}</p>
          </div>
          <div className="rounded-xl bg-emerald-100 p-4">
            <p className="text-xs font-medium text-emerald-800">Total accepted</p>
            <p className="mt-1 text-3xl font-semibold text-emerald-950">{metrics.accepted}</p>
          </div>
          <div className="rounded-xl bg-red-100 p-4">
            <p className="text-xs font-medium text-red-800">Total rejected</p>
            <p className="mt-1 text-3xl font-semibold text-red-950">{metrics.rejected}</p>
          </div>
        </div>

        {isLoading ? (
          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-700">Loading translations...</p>
          </section>
        ) : loadError ? (
          <section className="rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-semibold text-red-800">Failed to load</p>
            <p className="mt-1 text-sm text-red-700">{loadError}</p>
          </section>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-800">Review card</p>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${badgeClass}`}>
                  {current ? "Pending" : "Done"}
                </span>
              </div>

              {!current ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm text-slate-700">No more cached items to review.</p>
                  <p className="mt-1 text-xs text-slate-500">
                    If you need more, refresh the page to fetch the next batch.
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-3 flex items-start gap-2">
                    <span className="mt-2 rounded-full bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-800">
                      Instruction
                    </span>
                    <textarea
                      value={current.editedInstruction}
                      readOnly
                      rows={2}
                      className="min-h-[72px] w-full cursor-not-allowed rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-sm outline-none"
                    />
                  </div>

                  <div className="grid gap-2.5 md:grid-cols-2">
                    <label className="flex flex-col gap-1.5 md:col-span-2">
                      <span className="text-xs font-medium text-violet-800">Classification</span>
                      <select
                        value={current.editedClassification || "Other"}
                        onChange={(event) => updateCurrent("editedClassification", event.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-violet-500"
                      >
                        {WORD_CLASS_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="flex flex-col gap-1.5">
                      <span className="text-xs font-medium text-blue-800">Input (English)</span>
                      <textarea
                        value={current.editedInput}
                        onChange={(event) => updateCurrent("editedInput", event.target.value)}
                        rows={6}
                        className="min-h-[120px] w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-blue-500"
                      />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className="text-xs font-medium text-emerald-800">
                        Output (Pangasinan)
                      </span>
                      <textarea
                        value={current.editedOutput}
                        onChange={(event) => updateCurrent("editedOutput", event.target.value)}
                        rows={6}
                        className="min-h-[120px] w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-emerald-500"
                      />
                    </label>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => decide("accepted")}
                      disabled={!validatorName.trim()}
                      className="rounded-lg bg-emerald-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-900"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => decide("rejected")}
                      disabled={!validatorName.trim()}
                      className="rounded-lg bg-red-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-red-900"
                    >
                      Deny
                    </button>
                    <p className="text-xs text-slate-500">
                      Moves automatically to the next item (up to {PAGE_SIZE} items loaded per batch).
                    </p>
                  </div>
                </>
              )}

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-blue-100 p-4">
                <label className="flex items-center gap-2 text-sm text-blue-900">
                  <input
                    type="checkbox"
                    checked={markOriginalsProcessed}
                    onChange={(e) => setMarkOriginalsProcessed(e.target.checked)}
                    className="h-4 w-4 rounded border-blue-300 text-blue-700"
                  />
                  (To validators, keep this checked) Mark original Firestore docs as processed
                </label>
                <button
                  type="button"
                  onClick={handleFinalize}
                  disabled={isFinalizing || !validatorName.trim()}
                  className="rounded-lg bg-blue-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isFinalizing ? "Finalizing..." : "Finalize Validation"}
                </button>
              </div>
            </section>

            <aside className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Prior decisions
              </p>
              <div className="mt-3 max-h-[520px] space-y-2 overflow-auto pr-1">
                {decisions.length === 0 ? (
                  <p className="text-sm text-slate-600">No decisions yet.</p>
                ) : (
                  decisions.map((item) => (
                    <div
                      key={item.key}
                      className={`rounded-lg border bg-white p-3 ${
                        item.decision === "accepted"
                          ? "border-emerald-200 border-l-4 border-l-emerald-400"
                          : "border-red-200 border-l-4 border-l-red-400"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-slate-700">
                          {item.decision === "accepted" ? "Accepted" : "Rejected"}
                        </p>
                        <p className="text-[11px] text-slate-400">#{item.sourceDocId}</p>
                      </div>
                      <p className="mt-2 line-clamp-3 text-xs text-slate-600">
                        {item.editedInput || "(empty input)"}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        Class: {item.editedClassification || "Other"}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </aside>
          </div>
        )}

        {toast.message ? (
          <div className="pointer-events-none fixed bottom-6 right-6 z-50">
            <p
              className={`rounded-md px-4 py-2 text-sm text-white shadow-lg ${
                toast.type === "success"
                  ? "bg-emerald-700"
                  : toast.type === "error"
                    ? "bg-red-700"
                    : "bg-slate-700"
              }`}
            >
              {toast.message}
            </p>
          </div>
        ) : null}
      </div>
    </main>
  );
}

