import { Timers } from "@common";
import AppNavigator from "./AppNavigator";
import AppProviders from "@context/AppProviders";
import LoadingScreen from "@screens/Loading/screens/LoadingScreen";
import { useEffect, useState } from "react";
import { NativeFunctionsModule } from "@modules";
import { REPLACERS, cleanupServices, storageManagement } from "@utils";

if (REPLACERS.isDev) {
  import("@utils").then((utils) => {
    (global as Record<string, unknown>).utils = utils;
  });
}

const App = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    storageManagement.setHasUI();

    const cleanup = () => () => {
      cleanupServices();
    };

    if (REPLACERS.isWeb) return cleanup();

    if (!REPLACERS.isDev)
      Timers.setTimeout(async () => {
        const launchedFromService =
          await NativeFunctionsModule.wasLaunchedFromService();
        if (!launchedFromService) return;

        NativeFunctionsModule.minimizeApp();
      }, 500);

    return cleanup();
  }, []);

  if (isLoading) return <LoadingScreen setIsLoading={setIsLoading} />;

  return (
    <AppProviders>
      <AppNavigator />
    </AppProviders>
  );
};

export default App;
