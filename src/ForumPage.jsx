import { useEffect, useMemo, useState } from "react";
import { addDoc, collection, getDocs, limit, orderBy, query, serverTimestamp } from "firebase/firestore";
import { db } from "./lib/firebase";

const AUTHORS = ["Jelian", "Nathan", "Jeliane", "Shaira", "Raven", "Guest"];

function createDraft() {
  return {
    author: AUTHORS[0],
    title: "",
    content: "",
  };
}

export default function ForumPage() {
  const [draft, setDraft] = useState(createDraft);
  const [posts, setPosts] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState({ type: "info", message: "" });

  const authorInitials = useMemo(() => draft.author.slice(0, 2).toUpperCase(), [draft.author]);
  const hasDraftContent = useMemo(
    () => draft.title.trim().length > 0 && draft.content.trim().length > 0,
    [draft.title, draft.content],
  );

  const showToast = (type, message) => {
    setToast({ type, message });
    window.setTimeout(() => {
      setToast((current) => (current.message === message ? { type: "info", message: "" } : current));
    }, 2500);
  };

  const loadPosts = async () => {
    try {
      setIsLoading(true);
      const postsRef = collection(db, "forum_posts");
      const postsQuery = query(postsRef, orderBy("createdAt", "desc"), limit(100));
      const snap = await getDocs(postsQuery);
      const nextPosts = snap.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          author: data.author || "Unknown",
          title: data.title || "(untitled)",
          content: data.content || "",
          createdAt: data.createdAt || null,
        };
      });
      setPosts(nextPosts);
    } catch (error) {
      showToast("error", error?.message || "Failed to load forum posts.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const handleSavePost = async () => {
    if (!hasDraftContent) {
      showToast("error", "Please add both a title and content.");
      return;
    }

    try {
      setIsSaving(true);
      await addDoc(collection(db, "forum_posts"), {
        author: draft.author,
        title: draft.title.trim(),
        content: draft.content.trim(),
        createdAt: serverTimestamp(),
      });
      setDraft(createDraft());
      await loadPosts();
      showToast("success", "Post published.");
    } catch (error) {
      showToast("error", error?.message || "Failed to save post.");
    } finally {
      setIsSaving(false);
    }
  };

  const formatCreatedAt = (createdAt) => {
    if (!createdAt?.toDate) return "No timestamp";
    return createdAt.toDate().toLocaleString();
  };

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-900 md:px-8">
      <div className="mx-auto max-w-6xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-8">
        <header className="mb-6">
          <h1 className="text-xl font-semibold text-slate-900">Community Forum</h1>
          <p className="mt-1 text-sm text-slate-600">
            Publish useful information and keep it visible for everyone on the team.
          </p>
        </header>

        <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_1.2fr]">
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1.5 w-fit">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-500 text-xs font-semibold text-white">
                {authorInitials}
              </div>
              <select
                value={draft.author}
                onChange={(event) => setDraft((prev) => ({ ...prev, author: event.target.value }))}
                className="cursor-pointer border-none bg-transparent text-sm font-medium text-violet-900 outline-none"
              >
                {AUTHORS.map((author) => (
                  <option key={author} value={author}>
                    {author}
                  </option>
                ))}
              </select>
            </div>

            <label className="mb-3 flex flex-col gap-1.5">
              <span className="text-xs font-medium text-blue-800">Post title</span>
              <input
                value={draft.title}
                onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="Write a short title..."
                className="min-h-[44px] w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-emerald-800">Post content</span>
              <textarea
                value={draft.content}
                onChange={(event) => setDraft((prev) => ({ ...prev, content: event.target.value }))}
                rows={10}
                placeholder="Share updates, guides, reminders, or references..."
                className="min-h-[220px] w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:outline-none"
              />
            </label>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-blue-100 p-4">
              <p className="text-sm text-blue-800">This post is saved to Firestore and visible in the forum feed.</p>
              <button
                type="button"
                onClick={handleSavePost}
                disabled={isSaving}
                className="flex min-h-[44px] items-center justify-center rounded-lg bg-blue-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-900 focus-visible:ring-2 focus-visible:ring-blue-900 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSaving ? "Publishing..." : "Publish Post"}
              </button>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Saved posts</p>
              <button
                type="button"
                onClick={loadPosts}
                className="inline-flex min-h-[44px] items-center justify-center rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-slate-700 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:outline-none"
              >
                Refresh
              </button>
            </div>

            <div className="max-h-[560px] space-y-2 overflow-auto pr-1">
              {isLoading ? (
                <p className="text-sm text-slate-700">Loading forum posts...</p>
              ) : posts.length === 0 ? (
                <p className="text-sm text-slate-600">No posts yet. Publish the first one.</p>
              ) : (
                posts.map((post) => (
                  <article
                    key={post.id}
                    className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900">{post.title}</p>
                      <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-800">
                        {post.author}
                      </span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{post.content}</p>
                    <p className="mt-2 text-xs text-slate-500">{formatCreatedAt(post.createdAt)}</p>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>

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
