import {
  REPLACERS,
  cleanupServices,
  storageManagement,
  setTimeoutPolyfill,
} from "@utils";
import AppNavigator from "./AppNavigator";
import AppProviders from "@context/AppProviders";
import LoadingScreen from "@screens/Loading/screens/LoadingScreen";
import React, { useEffect } from "react";
import { NativeFunctionsModule } from "@modules";

const App = () => {
  const [isLoading, setIsLoading] = React.useState<boolean>(true);

  useEffect(() => {
    storageManagement.setHasUI();

    const cleanup = (fun?: () => void) => () => {
      cleanupServices();

      fun?.();
    };

    if (REPLACERS.isWeb) return cleanup();

    if (!REPLACERS.isDev)
      setTimeoutPolyfill(async () => {
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
