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

initializeNotificationsStorage();

const AppProviders = ({ children }: { children: React.ReactNode }) => (
  <SafeAreaProvider>
    <ThemeProvider>
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
    </ThemeProvider>
  </SafeAreaProvider>
);

export default AppProviders;
