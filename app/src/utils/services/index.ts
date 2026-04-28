import { debug } from "./debug";
import { updates } from "./updates";
import { deviceInfo } from "./deviceInfo";
import { navigation } from "./navigation";
import { sessionManager } from "./session";
import { recorderManager } from "./recorder";
import { clipboardManager } from "./clipboard";
import { storageManagement } from "./storage";
import { notificationsManager } from "./notifications";

export * from "./debug";
export * from "./alerts";
export * from "./storage";
export * from "./session";
export * from "./updates";
export * from "./recorder";
export * from "./clipboard";
export * from "./deviceInfo";
export * from "./navigation";
export * from "./notifications";

export const cleanupServices = async () => {
  import("@screens/Vault/services/vaultDomain").then(
    ({ vaultDomainServiceManager }) => {
      vaultDomainServiceManager.destroy();
    },
  );

  await Promise.all([
    debug?.destroy(),
    updates?.destroy(),
    deviceInfo?.destroy(),
    navigation?.destroy(),
    sessionManager?.destroy(),
    recorderManager?.destroy(),
    clipboardManager?.destroy(),
    storageManagement?.destroy(),
    notificationsManager?.destroy(),
  ]);
};
