import "./index.css";
import React from "react";
import { REPLACERS } from "@common";
import { Routes, Route } from "react-router-dom";

if (!REPLACERS.typeBuild) throw new Error("REPLACERS.typeBuild is not defined");

import Logs from "./pages/Logs";

const App: React.FC = () => {
  return (
    <Routes>
      {REPLACERS.typeBuild === "clipboard" ? null : (
        <Route path="/" element={<div />} />
      )}

      {REPLACERS.typeBuild === "test" && (
        <Route path="/logs" element={<Logs />} />
      )}
    </Routes>
  );
};

export default App;
