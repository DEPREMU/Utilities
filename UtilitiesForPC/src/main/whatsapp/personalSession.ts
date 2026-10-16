import {
  AuthenticationState,
  useMultiFileAuthState,
} from "@whiskeysockets/baileys";
import path from "path";
import { app } from "electron";
import { Directory, File } from "@common";

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
 * Checks whether an existing paired personal WhatsApp session exists on disk.
 *
 * @returns Promise resolving to true if creds.json exists and is registered
 */
export const hasPersonalSession = async (): Promise<boolean> => {
  const credsFile = new File(path.join(sessionDir.path, "creds.json"));
  if (!(await credsFile.exists())) return false;
  try {
    const raw = await credsFile.readFile("utf-8");
    if (!raw) return false;
    const data = JSON.parse(raw);
    return Boolean(data?.me || data?.registered);
  } catch {
    return false;
  }
};

/**
 * Permanently removes personal WhatsApp credentials from the local filesystem.
 *
 * @returns Promise that resolves once credentials are deleted
 */
export const purgePersonalSession = async (): Promise<void> => {
  await sessionDir.rm({ recursive: true, force: true });
};
