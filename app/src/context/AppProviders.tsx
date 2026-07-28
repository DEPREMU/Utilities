import { BackHandler } from "react-native";
import { UserProvider } from "@context/UserContext";
import { ThemeProvider } from "@context/ThemeContext";
import { ModalProvider } from "@context/ModalContext";
import { LayoutProvider } from "@context/LayoutContext";
import React, { useEffect } from "react";
import { RecorderProvider } from "@context/RecorderContext";
import { LanguageProvider } from "@context/LanguageContext";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { WebSocketProvider } from "@context/WebSocketContext";
import { BackgroundProvider } from "@context/BackgroundContext";
import { DeviceInformationProvider } from "@context/DeviceInformationContext";
import { alerts, navigation, REPLACERS } from "@utils";

interface AppProvidersProps {
  children: React.ReactNode;
}

const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  useEffect(() => {
    if (!REPLACERS.isNative) return;

    const handlePressBack = (): boolean => {
      const screen = navigation.currentScreen;

      if (screen === "Home") {
        alerts.showAlert(
          "common.exitApp",
          "common.exitAppMessage",
          async (_, accept) => {
            if (!accept) return;

            BackHandler.exitApp();
          },
        );
      } else {
        alerts.showAlert(
          "common.back",
          "common.backMessage",
          async (_, accept) => {
            if (!accept) return;

            navigation.replace("Home");
          },
        );
      }

      return true;
    };

    const handler = BackHandler.addEventListener(
      "hardwareBackPress",
      handlePressBack,
    );

    return () => {
      handler.remove();
    };
  }, []);

  return (
    <KeyboardProvider>
      <BackgroundProvider>
        <SafeAreaProvider>
          <ThemeProvider>
            <DeviceInformationProvider>
              <LayoutProvider>
                <UserProvider>
                  <LanguageProvider>
                    <ModalProvider>
                      <WebSocketProvider>
                        {REPLACERS.isWeb ? (
                          children
                        ) : (
                          <RecorderProvider>{children}</RecorderProvider>
                        )}
                      </WebSocketProvider>
                    </ModalProvider>
                  </LanguageProvider>
                </UserProvider>
              </LayoutProvider>
            </DeviceInformationProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      </BackgroundProvider>
    </KeyboardProvider>
  );
};

export default AppProviders;
