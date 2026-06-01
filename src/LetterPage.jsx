import { useEffect, useMemo, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import GalaxyLetterExperience from "./GalaxyLetterExperience";
import { db } from "./lib/firebase";
import {
  defaultLetterConfig,
  getConfigFromUrl,
  mapFirestoreData,
} from "./lib/letterConfig";

const LETTER_HELPER_URL = "/letterhelper/";

function getLetterSlug() {
  if (typeof window === "undefined") return "my-love";
  const idParam = new URLSearchParams(window.location.search).get("id");
  if (idParam === "helper") return null;
  if (idParam) return idParam;
  const parts = window.location.pathname.split("/").filter(Boolean);
  const letterIndex = parts.indexOf("letter");
  if (letterIndex === -1) return "my-love";
  const segment = parts[letterIndex + 1] || "my-love";
  if (segment === "entries" || segment === "helper") return "my-love";
  return segment;
}

export default function LetterPage() {
  const [isLoadingLetter, setIsLoadingLetter] = useState(true);
  const [config, setConfig] = useState(defaultLetterConfig);

  const slug = useMemo(() => getLetterSlug(), []);
  const urlConfig = useMemo(() => getConfigFromUrl(), []);

  useEffect(() => {
    const idParam = new URLSearchParams(window.location.search).get("id");
    if (idParam === "helper") {
      window.location.replace(LETTER_HELPER_URL);
    }
  }, []);

  useEffect(() => {
    if (slug === null) return undefined;

    let cancelled = false;

    async function loadLetter() {
      try {
        setIsLoadingLetter(true);
        const snap = await getDoc(doc(db, "letterC", slug));
        if (cancelled) return;

        if (snap.exists()) {
          setConfig(mapFirestoreData(snap.data() || {}));
          return;
        }

        setConfig(urlConfig);
      } catch {
        setConfig(urlConfig);
      } finally {
        if (!cancelled) setIsLoadingLetter(false);
      }
    }

    loadLetter();
    return () => {
      cancelled = true;
    };
  }, [slug, urlConfig]);

  if (slug === null) {
    return <div className="galaxy-letter-loading">redirecting</div>;
  }

  if (isLoadingLetter) {
    return <div className="galaxy-letter-loading">loading letter</div>;
  }

  return <GalaxyLetterExperience config={config} />;
}
