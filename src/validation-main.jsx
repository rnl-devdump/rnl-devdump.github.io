import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import ValidatorDashboardPage from "./ValidatorDashboardPage";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ValidatorDashboardPage />
  </StrictMode>,
);
