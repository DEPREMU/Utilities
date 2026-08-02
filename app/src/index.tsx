/* eslint-disable @typescript-eslint/no-require-imports */
import "@/utils/TOP_LEVEL";
import { registerRootComponent } from "expo";

try {
  const App = require("@/app/App")
    .default as typeof import("@/app/App").default;

  registerRootComponent(App);
} catch (error) {
  // eslint-disable-next-line no-console
  console.error("Error loading the app:", error);

  const ErrorScreen = require("@screens/Error/screens")
    .default as typeof import("@screens/Error/screens").default;

  registerRootComponent(() => (
    <ErrorScreen
      error={error instanceof Error ? error : new Error(String(error))}
    />
  ));
}
