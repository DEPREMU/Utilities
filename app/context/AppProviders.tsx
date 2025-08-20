import React from "react";
import { UserProvider } from "@context/UserContext";
import { ModalProvider } from "@context/ModalContext";
import { LayoutProvider } from "@context/LayoutContext";
import { LanguageProvider } from "@context/LanguageContext";
import { WebSocketProvider } from "./WebSocketContext";
import { NotificationsProvider } from "./NotificationsContext";
import { ThemeProvider } from "./ThemeContext";
import { initializeNotificationsStorage } from "@/utils";

initializeNotificationsStorage();

const AppProviders = ({ children }: { children: React.ReactNode }) => (
  <LayoutProvider>
    <ThemeProvider>
      <UserProvider>
        <LanguageProvider>
          <NotificationsProvider>
            <ModalProvider>
              <WebSocketProvider>{children}</WebSocketProvider>
            </ModalProvider>
          </NotificationsProvider>
        </LanguageProvider>
      </UserProvider>
    </ThemeProvider>
  </LayoutProvider>
);

export default AppProviders;
