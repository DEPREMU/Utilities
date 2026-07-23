import React from "react";
import { REPLACERS } from "@utils";
import { UserProvider } from "@context/UserContext";
import { ThemeProvider } from "@context/ThemeContext";
import { ModalProvider } from "@context/ModalContext";
import { LayoutProvider } from "@context/LayoutContext";
import { RecorderProvider } from "@context/RecorderContext";
import { LanguageProvider } from "@context/LanguageContext";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { WebSocketProvider } from "@context/WebSocketContext";
import { BackgroundProvider } from "@context/BackgroundContext";
import { DeviceInformationProvider } from "@context/DeviceInformationContext";

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

export default AppProviders;
