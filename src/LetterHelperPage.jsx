import { useMemo, useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "./lib/firebase";
import { compressImageToDataUrl, isEmbeddedPicRef } from "./lib/letterPicEmbed";
import { normalizePicRef, publishedOpenPath } from "./lib/letterConfig";

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildQuery({ pin, header, content, regards, nameOfRegards, pic1, pic2 }) {
  const params = new URLSearchParams();
  params.set("pin", pin);
  params.set("header", header);
  params.set("content", content);
  params.set("regards", regards);
  params.set("signature", nameOfRegards);
  const safe1 = normalizePicRef(pic1);
  const safe2 = normalizePicRef(pic2);
  if (safe1 && !isEmbeddedPicRef(safe1)) params.set("pic1", safe1);
  if (safe2 && !isEmbeddedPicRef(safe2)) params.set("pic2", safe2);
  return params.toString();
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
  const [pic1, setPic1] = useState("");
  const [pic2, setPic2] = useState("");
  const [status, setStatus] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedDocId, setPublishedDocId] = useState("");
  const [uploadingPic, setUploadingPic] = useState(null);

  const cleanLetterName = useMemo(() => slugify(letterName) || "my-love-letter", [letterName]);
  const safePic1 = useMemo(() => normalizePicRef(pic1), [pic1]);
  const safePic2 = useMemo(() => normalizePicRef(pic2), [pic2]);

  const queryFields = useMemo(
    () => ({ pin, header, content, regards, nameOfRegards, pic1: safePic1, pic2: safePic2 }),
    [pin, header, content, regards, nameOfRegards, safePic1, safePic2],
  );

  const letterQuery = useMemo(() => {
    const params = new URLSearchParams(buildQuery({ ...queryFields, pic1: "", pic2: "" }));
    return params.toString();
  }, [queryFields]);

  const letterxQuery = useMemo(() => buildQuery(queryFields), [queryFields]);

  const generatedLetterPath = useMemo(
    () => `/letter/${cleanLetterName}?${letterQuery}`,
    [cleanLetterName, letterQuery],
  );
  const generatedLetterxPath = useMemo(
    () => `/letterx/${cleanLetterName}?${letterxQuery}`,
    [cleanLetterName, letterxQuery],
  );

  const publishedPath = useMemo(() => {
    if (!publishedDocId) return "";
    return publishedOpenPath(publishedDocId, { pic1: safePic1, pic2: safePic2 });
  }, [publishedDocId, safePic1, safePic2]);

  const absolute = (path) => {
    if (typeof window === "undefined") return path;
    return `${window.location.origin}${path}`;
  };

  const copyText = async (text, message) => {
    try {
      await navigator.clipboard.writeText(text);
      setStatus(message);
    } catch {
      setStatus("Copy failed. Copy the URL manually.");
    }
  };

  const uploadPic = async (slot, file) => {
    if (!file) return;
    try {
      setUploadingPic(slot);
      setStatus("");
      const dataUrl = await compressImageToDataUrl(file);
      if (slot === 1) setPic1(dataUrl);
      else setPic2(dataUrl);
      setStatus(`Picture ${slot} embedded (saved with Publish — no Storage needed).`);
    } catch (error) {
      setStatus(error?.message || `Picture ${slot} could not be embedded.`);
    } finally {
      setUploadingPic(null);
    }
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
        pic1: safePic1,
        pic2: safePic2,
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
            One form for <code>/letter/</code> (text only) and <code>/letterx/</code> (text + two
            photos). Pick images to embed in Firestore (free), or use filenames from{" "}
            <code>assets/pics/</code> in the repo.
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
          <span className="text-xs font-medium text-blue-800">Header (To:)</span>
          <input
            value={header}
            onChange={(event) => setHeader(event.target.value)}
            placeholder="To: My Dearest, or Fae,"
            className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-blue-500"
          />
          <span className="text-xs text-slate-500">
            Used for the intro dot name. Multiple words are supported; long names shrink to fit.
          </span>
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

        <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-violet-800">
            Letter X — pictures
          </p>
          <p className="mt-1 text-xs text-violet-900/80">
            <strong>Pick image</strong> — compresses and stores inside Firestore when you Publish (no
            paid Storage). Works on the live <code>/letterx/?id=…</code> link.{" "}
            <strong>Or type a filename</strong> (e.g. <code>left.jpg</code> in{" "}
            <code>assets/pics/</code>) for preview URLs too.
          </p>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-violet-900">Picture 1 (left)</span>
              <input
                value={isEmbeddedPicRef(pic1) ? "(embedded image — use Publish for live link)" : pic1}
                readOnly={isEmbeddedPicRef(pic1)}
                onChange={(event) => setPic1(event.target.value)}
                placeholder="left.jpg"
                className="w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-violet-500 read-only:text-violet-700 read-only:italic"
              />
              <input
                type="file"
                accept="image/*"
                disabled={uploadingPic === 1}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  uploadPic(1, file);
                  event.target.value = "";
                }}
                className="text-xs text-violet-900 file:mr-2 file:rounded-md file:border-0 file:bg-violet-700 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-violet-900"
              />
              {uploadingPic === 1 ? (
                <span className="text-xs text-violet-700">Compressing picture 1…</span>
              ) : null}
              {isEmbeddedPicRef(pic1) ? (
                <button
                  type="button"
                  onClick={() => setPic1("")}
                  className="w-fit text-xs font-semibold text-violet-800 underline"
                >
                  Clear embedded picture 1
                </button>
              ) : null}
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-violet-900">Picture 2 (right)</span>
              <input
                value={isEmbeddedPicRef(pic2) ? "(embedded image — use Publish for live link)" : pic2}
                readOnly={isEmbeddedPicRef(pic2)}
                onChange={(event) => setPic2(event.target.value)}
                placeholder="right.jpg"
                className="w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-violet-500 read-only:text-violet-700 read-only:italic"
              />
              <input
                type="file"
                accept="image/*"
                disabled={uploadingPic === 2}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  uploadPic(2, file);
                  event.target.value = "";
                }}
                className="text-xs text-violet-900 file:mr-2 file:rounded-md file:border-0 file:bg-violet-700 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-violet-900"
              />
              {uploadingPic === 2 ? (
                <span className="text-xs text-violet-700">Compressing picture 2…</span>
              ) : null}
              {isEmbeddedPicRef(pic2) ? (
                <button
                  type="button"
                  onClick={() => setPic2("")}
                  className="w-fit text-xs font-semibold text-violet-800 underline"
                >
                  Clear embedded picture 2
                </button>
              ) : null}
            </label>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Preview — standard letter (/letter/)
          </p>
          <p className="mt-2 break-all rounded-lg bg-white px-3 py-2 text-sm text-slate-800">
            {absolute(generatedLetterPath)}
          </p>
          <button
            type="button"
            onClick={() => copyText(absolute(generatedLetterPath), "Letter link copied.")}
            className="mt-3 rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-900"
          >
            Copy letter link
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-violet-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-violet-700">
            Preview — letter X (/letterx/)
          </p>
          <p className="mt-2 break-all rounded-lg bg-violet-50 px-3 py-2 text-sm text-slate-800">
            {absolute(generatedLetterxPath)}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => copyText(absolute(generatedLetterxPath), "Letter X link copied.")}
              className="rounded-md bg-violet-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-900"
            >
              Copy letter X link
            </button>
            <button
              type="button"
              onClick={() => window.open(generatedLetterxPath, "_blank", "noopener,noreferrer")}
              className="rounded-md border border-violet-300 bg-white px-4 py-2 text-sm font-semibold text-violet-800 transition hover:bg-violet-50"
            >
              Open letter X
            </button>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Live URL (Firestore)
          </p>
          <p className="mt-2 break-all rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-800">
            {publishedDocId
              ? absolute(publishedPath)
              : "Publish to get /letter/?id=… or /letterx/?id=… (if pictures are set)."}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={publishLetter}
              disabled={isPublishing}
              className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isPublishing ? "Publishing..." : "Publish to letterC"}
            </button>
            <button
              type="button"
              onClick={() =>
                publishedPath && copyText(absolute(publishedPath), "Live link copied.")
              }
              disabled={!publishedDocId}
              className="rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-70"
            >
              Copy live link
            </button>
            <button
              type="button"
              onClick={() => publishedPath && window.open(publishedPath, "_blank")}
              disabled={!publishedDocId}
              className="rounded-md bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-950 disabled:cursor-not-allowed disabled:opacity-70"
            >
              Open live letter
            </button>
            {status ? <p className="text-sm text-emerald-700">{status}</p> : null}
          </div>
        </div>
      </div>
    </main>
  );
}
