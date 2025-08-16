import React from "react";
import { UserProvider } from "@context/UserContext";
import { ModalProvider } from "@context/ModalContext";
import { LayoutProvider } from "@context/LayoutContext";
import { LanguageProvider } from "@context/LanguageContext";
import { WebSocketProvider } from "./WebSocketContext";
import { NotificationsProvider } from "./NotificationsContext";

const AppProviders = ({ children }: { children: React.ReactNode }) => (
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
);

export default AppProviders;
