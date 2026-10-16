import {
  AuthenticationState,
  useMultiFileAuthState,
} from "@whiskeysockets/baileys";
import path from "path";
import { app } from "electron";
import { Directory } from "@common";

const sessionDir = new Directory(
  path.join(app.getPath("userData"), "whatsapp-personal-session"),
);

/**
 * Initializes or loads the multi-file authentication state for personal WhatsApp.
 *
 * @returns Promise resolving to the authentication state and credentials saver callback
 */
export const initPersonalAuthState = async (): Promise<{
  state: AuthenticationState;
  saveCreds: () => Promise<void>;
}> => {
  await sessionDir.mkdir({ recursive: true });

  // eslint-disable-next-line react-hooks/rules-of-hooks
  return await useMultiFileAuthState(sessionDir.path);
};

/**
 * Permanently removes personal WhatsApp credentials from the local filesystem.
 *
 * @returns Promise that resolves once credentials are deleted
 */
export const purgePersonalSession = async (): Promise<void> => {
  await sessionDir.rm({ recursive: true, force: true });
};
