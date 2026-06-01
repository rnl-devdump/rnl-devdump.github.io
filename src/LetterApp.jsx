import LetterEntriesPage from "./LetterEntriesPage";
import LetterPage from "./LetterPage";
import { isLetterEntriesRoute } from "./lib/letterConfig";

export default function LetterApp() {
  const path = typeof window !== "undefined" ? window.location.pathname : "";
  if (isLetterEntriesRoute(path)) {
    return <LetterEntriesPage />;
  }
  return <LetterPage />;
}
