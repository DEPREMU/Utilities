import { debug } from "./debug";
import { updates } from "./updates";
import { deviceInfo } from "./deviceInfo";
import { sessionManager } from "./session";
import { recorderManager } from "./recorder";
import { clipboardManager } from "./clipboard";

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
      vaultDomainServiceManager.cleanUp(true);
    },
  );
  
  await Promise.all([
    debug?.cleanup(),
    updates?.cleanup(),
    deviceInfo?.cleanup(),
    sessionManager?.cleanup(),
    recorderManager?.cleanup(),
    clipboardManager?.cleanup(),
  ]);
  ;
};
