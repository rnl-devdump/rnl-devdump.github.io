import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import DirectoryPage from "./DirectoryPage";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <DirectoryPage />
  </StrictMode>,
);
