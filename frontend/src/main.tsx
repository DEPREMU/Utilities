import "./utils/t";

import App from "./App.tsx";
import { REPLACERS } from "@common";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "./pages/common/contexts/ThemeContext";

const rootElement = document.getElementById("root");

if (!rootElement) throw new Error("No root element found");

if (REPLACERS.isDev)
  import("@common")
    .then((p) => ((window as unknown as Record<string, unknown>).common = p))
    .catch((e) => {
      // eslint-disable-next-line no-console
      console.error(e);
    });

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
);
