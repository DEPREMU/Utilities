import React from "react";
import ThemeChildren from "./components/ThemeChildren";
import { ThemeProvider } from "./components/context/ThemeContext";
import { defineBackgroundFetchTask } from "./utils/Tasks";

defineBackgroundFetchTask();

const App = () => {
  return (
    <ThemeProvider>
      <ThemeChildren />
    </ThemeProvider>
  );
};

export default App;
