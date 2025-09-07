import React from "react";
import { UserProvider } from "@context/UserContext";
import { ThemeProvider } from "./ThemeContext";
import { ModalProvider } from "@context/ModalContext";
import { LayoutProvider } from "@context/LayoutContext";
import { LanguageProvider } from "@context/LanguageContext";
import { WebSocketProvider } from "./WebSocketContext";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NotificationsProvider } from "./NotificationsContext";
import { initializeNotificationsStorage } from "@/utils";
import { DeviceInformationProvider } from "./DeviceInformationContext";

initializeNotificationsStorage();

interface AppProvidersProps {
  children: React.ReactNode;
}

const AppProviders: React.FC<AppProvidersProps> = ({ children }) => (
  <SafeAreaProvider>
    <ThemeProvider>
      <DeviceInformationProvider>
        <LayoutProvider>
          <UserProvider>
            <LanguageProvider>
              <NotificationsProvider>
                <ModalProvider>
                  <WebSocketProvider>{children}</WebSocketProvider>
                </ModalProvider>
              </NotificationsProvider>
            </LanguageProvider>
          </UserProvider>
        </LayoutProvider>
      </DeviceInformationProvider>
    </ThemeProvider>
  </SafeAreaProvider>
);

export default AppProviders;
