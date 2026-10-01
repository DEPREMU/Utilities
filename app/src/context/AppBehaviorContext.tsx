import { useColors } from "@/hooks/useColors";
import { StatusBar } from "react-native";
import { PaperProvider } from "react-native-paper";
import { storageManagement } from "@/utils/services/storage";
import { ExpectedStorageTypes } from "@common";
import { ReducedMotionConfig, ReduceMotion } from "react-native-reanimated";
import React, { useMemo, useState, useContext, createContext } from "react";

interface AppBehaviorProviderProps {
  children: React.ReactNode;
}

type AppBehavior = ExpectedStorageTypes<"UNSECURE">["APP_BEHAVIOR"];

type AppBehaviorContextType = ReturnType<typeof useColors> & {
  appBehavior: AppBehavior;
  setAppBehavior: React.Dispatch<React.SetStateAction<AppBehavior>>;
};

const AppBehaviorContext = createContext<AppBehaviorContextType | undefined>(
  undefined,
);

export const AppBehaviorProvider: React.FC<AppBehaviorProviderProps> = ({
  children,
}) => {
  const [appBehavior, setAppBehavior] = useState(
    storageManagement.get("APP_BEHAVIOR"),
  );

  const colors = useColors(appBehavior.theme);

  const { paperTheme, isLight } = colors;

  const value: AppBehaviorContextType = useMemo(
    () => ({
      ...colors,
      appBehavior,
      setAppBehavior,
    }),
    [colors, appBehavior],
  );

  return (
    <AppBehaviorContext.Provider value={value}>
      <ReducedMotionConfig
        mode={
          appBehavior.useAnimations ? ReduceMotion.Always : ReduceMotion.Never
        }
      />
      <PaperProvider theme={paperTheme}>
        <StatusBar
          barStyle={isLight ? "light-content" : "dark-content"}
          backgroundColor={paperTheme.colors.background}
        />
        {children}
      </PaperProvider>
    </AppBehaviorContext.Provider>
  );
};

export const useAppBehavior = () => {
  const context = useContext(AppBehaviorContext);
  if (!context) {
    throw new Error("useAppBehavior must be used within a AppBehaviorProvider");
  }
  return context;
};

export default AppBehaviorProvider;
