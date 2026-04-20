import React from "react";
import { REPLACERS } from "@utils";
import { UserProvider } from "@context/UserContext";
import { ThemeProvider } from "@context/ThemeContext";
import { ModalProvider } from "@context/ModalContext";
import { LayoutProvider } from "@context/LayoutContext";
import { RecorderProvider } from "@context/RecorderContext";
import { LanguageProvider } from "@context/LanguageContext";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { WebSocketProvider } from "@context/WebSocketContext";
import { BackgroundProvider } from "@context/BackgroundContext";
import { BackgroundTaskProvider } from "@context/BackgroundTaskContext";
import { DeviceInformationProvider } from "@context/DeviceInformationContext";
import { KeyboardProvider } from "react-native-keyboard-controller";

interface AppProvidersProps {
  children: React.ReactNode;
}

const AppProviders: React.FC<AppProvidersProps> = ({ children }) => (
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
                      <BackgroundTaskProvider>
                        {REPLACERS.isWeb ? (
                          children
                        ) : (
                          <RecorderProvider>{children}</RecorderProvider>
                        )}
                      </BackgroundTaskProvider>
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

export default AppProviders;
