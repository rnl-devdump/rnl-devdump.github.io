import { useMemo, useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "./lib/firebase";

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function LetterHelperPage() {
  const [letterName, setLetterName] = useState("my-love-letter");
  const [pin, setPin] = useState("1234");
  const [header, setHeader] = useState("Fae,");
  const [content, setContent] = useState(
    "This letter is pin-locked for you. Every word here is intentional, private, and written from the heart.",
  );
  const [regards, setRegards] = useState("Sincerely,");
  const [nameOfRegards, setNameOfRegards] = useState("Your Name");
  const [status, setStatus] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedDocId, setPublishedDocId] = useState("");

  const cleanLetterName = useMemo(() => slugify(letterName) || "my-love-letter", [letterName]);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    params.set("pin", pin);
    params.set("header", header);
    params.set("content", content);
    params.set("regards", regards);
    params.set("signature", nameOfRegards);
    return params.toString();
  }, [pin, header, content, regards, nameOfRegards]);

  const generatedPath = useMemo(() => `/letter/${cleanLetterName}?${query}`, [cleanLetterName, query]);
  const publishedPath = useMemo(
    () => (publishedDocId ? `/letter/?id=${encodeURIComponent(publishedDocId)}` : ""),
    [publishedDocId],
  );
  const generatedAbsoluteUrl = useMemo(() => {
    if (typeof window === "undefined") return generatedPath;
    return `${window.location.origin}${generatedPath}`;
  }, [generatedPath]);
  const publishedAbsoluteUrl = useMemo(() => {
    if (!publishedPath) return "";
    if (typeof window === "undefined") return publishedPath;
    return `${window.location.origin}${publishedPath}`;
  }, [publishedPath]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(generatedAbsoluteUrl);
      setStatus("Link copied.");
    } catch {
      setStatus("Copy failed. Copy the URL manually.");
    }
  };

  const copyPublishedLink = async () => {
    if (!publishedAbsoluteUrl) return;
    try {
      await navigator.clipboard.writeText(publishedAbsoluteUrl);
      setStatus("Published link copied.");
    } catch {
      setStatus("Copy failed. Copy the published URL manually.");
    }
  };

  const openPublishedLink = () => {
    if (!publishedPath) return;
    window.open(publishedPath, "_blank", "noopener,noreferrer");
  };

  const publishLetter = async () => {
    try {
      setIsPublishing(true);
      setStatus("");
      const docRef = await addDoc(collection(db, "letterC"), {
        letterName: cleanLetterName,
        pin,
        header,
        content,
        regards,
        signature: nameOfRegards,
        createdAt: serverTimestamp(),
      });
      setPublishedDocId(docRef.id);
      setStatus("Letter published to Firestore.");
    } catch (error) {
      setStatus(error?.message || "Publish failed. Check Firestore rules.");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-900 md:px-8">
      <div className="mx-auto max-w-5xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-8">
        <header className="mb-6">
          <h1 className="text-xl font-semibold text-slate-900">Letter Helper Tool</h1>
          <p className="mt-1 text-sm text-slate-600">
            Generate shareable links for letters at <code>/letter/</code> on this site.
          </p>
          <p className="mt-2 text-sm">
            <a href="/letter/entries/" className="font-medium text-violet-700 underline hover:text-violet-900">
              View all published entries
            </a>
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-violet-800">Letter name (slug)</span>
            <input
              value={letterName}
              onChange={(event) => setLetterName(event.target.value)}
              placeholder="my-love-letter"
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-violet-500"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-blue-800">Pin code</span>
            <input
              value={pin}
              onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="1234"
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-blue-500"
            />
          </label>
        </div>

        <label className="mt-3 flex flex-col gap-1.5">
          <span className="text-xs font-medium text-blue-800">Header</span>
          <input
            value={header}
            onChange={(event) => setHeader(event.target.value)}
            placeholder="Fae,"
            className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-blue-500"
          />
        </label>

        <label className="mt-3 flex flex-col gap-1.5">
          <span className="text-xs font-medium text-amber-800">Content</span>
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            rows={8}
            className="min-h-[180px] w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-amber-500"
          />
          <span className="text-xs text-slate-500">Separate paragraphs with a blank line.</span>
        </label>

        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-emerald-800">Regards</span>
            <input
              value={regards}
              onChange={(event) => setRegards(event.target.value)}
              placeholder="Sincerely,"
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-emerald-500"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-emerald-800">Name of Regards</span>
            <input
              value={nameOfRegards}
              onChange={(event) => setNameOfRegards(event.target.value)}
              placeholder="Your Name"
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-emerald-500"
            />
          </label>
        </div>

        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Preview URL (query mode)</p>
          <p className="mt-2 break-all rounded-lg bg-white px-3 py-2 text-sm text-slate-800">
            {generatedAbsoluteUrl}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={copyLink}
              className="rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-900"
            >
              Copy Link
            </button>
            <button
              type="button"
              onClick={publishLetter}
              disabled={isPublishing}
              className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isPublishing ? "Publishing..." : "Publish to letterC"}
            </button>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Live URL (Firestore document ID)
          </p>
          <p className="mt-2 break-all rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-800">
            {publishedAbsoluteUrl || "Publish first to generate /letter/?id=<documentId>."}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={copyPublishedLink}
              disabled={!publishedAbsoluteUrl}
              className="rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-70"
            >
              Copy Live Link
            </button>
            <button
              type="button"
              onClick={openPublishedLink}
              disabled={!publishedAbsoluteUrl}
              className="rounded-md bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-950 disabled:cursor-not-allowed disabled:opacity-70"
            >
              Open Live Letter
            </button>
            {status ? <p className="text-sm text-emerald-700">{status}</p> : null}
          </div>
        </div>
      </div>
    </main>
  );
}
