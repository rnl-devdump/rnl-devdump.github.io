import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import LetterHelperPage from "./LetterHelperPage";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <LetterHelperPage />
  </StrictMode>,
);
