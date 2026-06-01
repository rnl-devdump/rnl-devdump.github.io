import LetterEntriesPage from "./LetterEntriesPage";
import LetterHelperPage from "./LetterHelperPage";
import LetterPage from "./LetterPage";
import { isLetterEntriesRoute, isLetterHelperRoute } from "./lib/letterConfig";

export default function LetterApp() {
  const path = typeof window !== "undefined" ? window.location.pathname : "";
  if (isLetterHelperRoute(path)) {
    return <LetterHelperPage />;
  }
  if (isLetterEntriesRoute(path)) {
    return <LetterEntriesPage />;
  }
  return <LetterPage />;
}
