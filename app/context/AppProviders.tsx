import React from "react";
import { UserProvider } from "@context/UserContext";
import { ThemeProvider } from "./ThemeContext";
import { ModalProvider } from "@context/ModalContext";
import { LayoutProvider } from "@context/LayoutContext";
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
                    <WebSocketProvider>{children}</WebSocketProvider>
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
