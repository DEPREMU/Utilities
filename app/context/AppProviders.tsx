import React from "react";
import { Platform } from "react-native";
import { UserProvider } from "@context/UserContext";
import { ThemeProvider } from "./ThemeContext";
import { VaultProvider } from "./VaultContext";
import { ModalProvider } from "@context/ModalContext";
import { LayoutProvider } from "@context/LayoutContext";
import { RecorderProvider } from "./RecorderContext";
import { LanguageProvider } from "@context/LanguageContext";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { WebSocketProvider } from "./WebSocketContext";
import { BackgroundProvider } from "./BackgroundContext";
import { NotificationsProvider } from "./NotificationsContext";
import { DeviceInformationProvider } from "./DeviceInformationContext";
import { initializeNotificationsStorage } from "@utils";

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
                  <NotificationsProvider>
                    <WebSocketProvider>
                      <VaultProvider>
                        {Platform.OS === "web" ? (
                          children
                        ) : (
                          <RecorderProvider>{children}</RecorderProvider>
                        )}
                      </VaultProvider>
                    </WebSocketProvider>
                  </NotificationsProvider>
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
