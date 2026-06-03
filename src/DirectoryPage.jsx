import { useEffect, useMemo, useState } from "react";
import { hasDirectoryAccess, unlockDirectoryAccess } from "./directoryAccess";

const CORE_SITES = [
  {
    title: "Dataset Annotation Tool",
    path: "/dataset/",
    category: "DATASET",
    summary: "Create Pangasinan translation entries and save them to Firestore.",
    source: "src/DatasetAnnotationPage.jsx",
  },
  {
    title: "Dataset Validation Dashboard",
    path: "/validation/",
    aliases: ["/validator"],
    category: "VALIDATION",
    summary: "Review translation entries, approve or deny them, and finalize validated data.",
    source: "src/ValidatorDashboardPage.jsx",
  },
];

const OTHER_SITES = [
  {
    title: "Community Forum",
    path: "/forum/",
    summary: "Publish team posts and keep shared notes visible.",
    source: "src/ForumPage.jsx",
  },
  {
    title: "Kiruu Letter",
    path: "/letter/",
    links: [{ label: "Entries", path: "/letter/entries/" }],
    summary: "Open pin-locked letters from Firestore or URL settings.",
    source: "src/LetterPage.jsx",
  },
  {
    title: "Letter Helper Tool",
    path: "/letterhelper/",
    aliases: ["/helper"],
    summary: "Generate and publish letter links, including picture-enabled versions.",
    source: "src/LetterHelperPage.jsx",
  },
  {
    title: "Kiruu Letter X",
    path: "/letterx/",
    summary: "Open the picture-enabled letter experience.",
    source: "src/LetterPage.jsx",
  },
  {
    title: "Misc Easter Egg",
    path: "/misc/easteregg.html",
    summary: "A small standalone static page.",
    source: "misc/easteregg.html",
  },
];

function SiteCard({ site }) {
  return (
    <article className="flex h-full flex-col rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          {site.category ? (
            <p className="text-xs font-bold uppercase text-teal-700">{site.category}</p>
          ) : null}
          <h3 className="mt-1 text-base font-semibold leading-tight text-slate-950">{site.title}</h3>
        </div>
        <a
          href={site.path}
          className="shrink-0 rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          Open
        </a>
      </div>

      <p className="mt-3 flex-1 text-sm leading-6 text-slate-600">{site.summary}</p>

      <div className="mt-4 space-y-2 text-xs text-slate-500">
        <p className="break-all">
          <span className="font-semibold text-slate-700">Path:</span> {site.path}
        </p>
        {site.aliases?.length ? (
          <p className="break-all">
            <span className="font-semibold text-slate-700">Alias:</span> {site.aliases.join(", ")}
          </p>
        ) : null}
        <p className="break-all">
          <span className="font-semibold text-slate-700">Source:</span> {site.source}
        </p>
      </div>

      {site.links?.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {site.links.map((link) => (
            <a
              key={link.path}
              href={link.path}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-teal-500 hover:text-teal-800"
            >
              {link.label}
            </a>
          ))}
        </div>
      ) : null}
    </article>
  );
}

function OthersWindow({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <section
        className="max-h-[88vh] w-full max-w-5xl overflow-auto rounded-lg bg-white p-4 shadow-2xl md:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="others-title"
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase text-amber-700">OTHERS</p>
            <h2 id="others-title" className="mt-1 text-xl font-semibold text-slate-950">
              Protected Site List
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Close
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {OTHER_SITES.map((site) => (
            <SiteCard key={site.path} site={site} />
          ))}
        </div>
      </section>
    </div>
  );
}

export default function DirectoryPage() {
  const [isUnlocked, setIsUnlocked] = useState(() => hasDirectoryAccess());
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [showOthersWindow, setShowOthersWindow] = useState(false);

  const siteCount = useMemo(() => CORE_SITES.length + OTHER_SITES.length, []);

  useEffect(() => {
    if (isUnlocked) setShowOthersWindow(true);
  }, [isUnlocked]);

  const handleUnlock = (event) => {
    event.preventDefault();
    if (unlockDirectoryAccess(passcode)) {
      setIsUnlocked(true);
      setPasscode("");
      setError("");
      setShowOthersWindow(true);
      return;
    }
    setError("Incorrect passcode.");
  };

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-900 md:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex items-center gap-4">
            <img src="/logo.png" alt="" className="h-14 w-14 object-contain" />
            <div>
              <p className="text-xs font-bold uppercase text-teal-700">Kiruu Space</p>
              <h1 className="text-2xl font-semibold text-slate-950 md:text-3xl">Site Directory</h1>
              <p className="mt-1 text-sm text-slate-600">{siteCount} destinations in this codebase.</p>
            </div>
          </div>
          <a
            href="/"
            className="w-fit rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-teal-500 hover:text-teal-800"
          >
            Open Root
          </a>
        </header>

        <section className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase text-slate-500">Available</h2>
            <span className="rounded-lg bg-teal-100 px-3 py-1 text-xs font-bold text-teal-800">
              No passcode
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {CORE_SITES.map((site) => (
              <SiteCard key={site.path} site={site} />
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="grid gap-4 md:grid-cols-[1fr_360px] md:items-center">
            <div>
              <p className="text-xs font-bold uppercase text-amber-700">OTHERS</p>
              <h2 className="mt-1 text-lg font-semibold text-slate-950">Protected apps</h2>
              <p className="mt-1 text-sm leading-6 text-slate-700">
                Forum, letter tools, Letter X, and standalone extras are grouped here.
              </p>
            </div>

            {isUnlocked ? (
              <button
                type="button"
                onClick={() => setShowOthersWindow(true)}
                className="rounded-lg bg-amber-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-amber-800"
              >
                Show OTHERS
              </button>
            ) : (
              <form onSubmit={handleUnlock} className="rounded-lg bg-white p-3 shadow-sm">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold text-slate-700">Passcode</span>
                  <input
                    value={passcode}
                    onChange={(event) => setPasscode(event.target.value)}
                    type="password"
                    autoComplete="current-password"
                    className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
                  />
                </label>
                {error ? <p className="mt-2 text-xs font-bold text-red-700">{error}</p> : null}
                <button
                  type="submit"
                  className="mt-3 w-full rounded-lg bg-amber-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-amber-800"
                >
                  Unlock OTHERS
                </button>
              </form>
            )}
          </div>
        </section>
      </div>

      {showOthersWindow ? <OthersWindow onClose={() => setShowOthersWindow(false)} /> : null}
    </main>
  );
}
