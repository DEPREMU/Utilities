import "./index.css";
import React from "react";
import { REPLACERS, Timers } from "@common";
import { Routes, Route, Navigate } from "react-router-dom";

if (!REPLACERS.typeBuild) throw new Error("REPLACERS.typeBuild is not defined");

import Logs from "./pages/Logs";
import Updates from "./pages/updates";
import Clipboard from "./pages/Clipboard";

const App: React.FC = () => {
  React.useEffect(() => {
    if (
      REPLACERS.typeBuild !== "normal" &&
      (window as { UtilitiesForPC?: Record<string, unknown> }).UtilitiesForPC
    ) {
      const id = Timers.setTimeout(() => {
        if (!window.location.href.includes("/clipboard"))
          window.location.href = "/clipboard";
      }, 500);
      return () => Timers.clearTimeout(id);
    }
  }, []);

  if (REPLACERS.typeBuild === "clipboard") return <Clipboard />;

  return (
    <Routes>
      {REPLACERS.typeBuild === "test" && (
        <Route path="/logs" element={<Logs />} />
      )}

      <Route path="/updates" element={<Updates />} />

      {"UtilitiesForPC" in window && (
        <Route
          path="/clipboard"
          element={React.createElement(
            React.lazy(() => import("./pages/Clipboard")),
          )}
        />
      )}

      <Route path="*" element={<Navigate to="/updates" replace />} />
    </Routes>
  );
};

export default App;
