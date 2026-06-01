import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import LetterApp from "./LetterApp";
import "./galaxy-letter.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <LetterApp />
  </StrictMode>,
);
