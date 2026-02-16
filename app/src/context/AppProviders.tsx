import React from "react";
import { UserProvider } from "@context/UserContext";
import { ThemeProvider } from "@context/ThemeContext";
import { VaultProvider } from "@context/VaultContext";
import { ModalProvider } from "@context/ModalContext";
import { LayoutProvider } from "@context/LayoutContext";
import { RecorderProvider } from "@context/RecorderContext";
import { LanguageProvider } from "@context/LanguageContext";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { WebSocketProvider } from "@context/WebSocketContext";
import { BackgroundProvider } from "@context/BackgroundContext";
import { DeviceInformationProvider } from "./DeviceInformationContext";
import { initializeNotificationsStorage, REPLACERS } from "@utils";

initializeNotificationsStorage();

interface AppProvidersProps {
  children: React.ReactNode;
}

const AppProviders: React.FC<AppProvidersProps> = ({ children }) => (
  <BackgroundProvider>
    <SafeAreaProvider>
      <ThemeProvider>
        <DeviceInformationProvider>
          <LayoutProvider>
            <UserProvider>
              <LanguageProvider>
                <ModalProvider>
                  <WebSocketProvider>
                    <VaultProvider>
                      {REPLACERS.isWeb ? (
                        children
                      ) : (
                        <RecorderProvider>{children}</RecorderProvider>
                      )}
                    </VaultProvider>
                  </WebSocketProvider>
                </ModalProvider>
              </LanguageProvider>
            </UserProvider>
          </LayoutProvider>
        </DeviceInformationProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  </BackgroundProvider>
);

export default AppProviders;
