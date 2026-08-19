import "./index.css";
import React from "react";
import { REPLACERS } from "@common";
import { Routes, Route } from "react-router-dom";

if (!REPLACERS.typeBuild) throw new Error("REPLACERS.typeBuild is not defined");

import Logs from "./pages/Logs";
import Updates from "./pages/updates";

const App: React.FC = () => {
  return (
    <Routes>
      {REPLACERS.typeBuild === "clipboard" ? null : (
        <Route path="/" element={<div />} />
      )}

      {REPLACERS.typeBuild === "test" && (
        <Route path="/logs" element={<Logs />} />
      )}
      
      <Route path="/updates" element={<Updates />} />
    </Routes>
  );
};

export default App;
