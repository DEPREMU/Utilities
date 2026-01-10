/* eslint-disable @stylistic/indent */
import {
  Platform,
  DeviceEventEmitter,
  TurboModuleRegistry,
} from "react-native";
import { logError } from "@utils";
import type { TurboModule } from "react-native";
import type { ProgressEvent } from "@types";

export type VaultUnlockResult =
  | {
      ok: true;
      created: boolean;
      keyId: string;
      wrappedMasterKeyJson?: string;
      authVerifierJson?: string;
    }
  | { ok: false; error: string };

export type VaultEnsureInitializedResult =
  | { ok: true; vaultRootPath: string }
  | { ok: false; error: string };

export type VaultEncryptResult =
  | {
      ok: true;
      results: Array<{
        fileId: string;
        keyId: string;
        originalName: string;
        nonceBase64: string;
        hashCipherHex: string;
        cipherPath: string;
        sizePlainBytes: number;
        sizeCipherBytes: number;
      }>;
    }
  | { ok: false; error: string };

export type VaultDecryptToTempResult =
  | { ok: true; tempPath: string }
  | { ok: false; error: string };

export interface Spec extends TurboModule {
  ensureInitialized: () => Promise<VaultEnsureInitializedResult>;
  unlock: (
    password: string,
    wrappedMasterKeyJson: string | null,
    authVerifierJson: string | null,
    autoLockSeconds: number,
  ) => Promise<VaultUnlockResult>;
  lock: () => void;

  encryptUris: (
    jobId: string,
    folderId: string,
    inputUris: string[],
  ) => Promise<VaultEncryptResult>;

  decryptToTemp: (
    jobId: string,
    folderId: string,
    itemId: string,
    nonceBase64: string,
    outputName: string,
    sessionId: string,
  ) => Promise<VaultDecryptToTempResult>;

  cleanTempSession: (sessionId: string) => Promise<boolean>;
  cancelJob: (jobId: string) => Promise<boolean>;
}

const defaultVaultCryptoModule: Spec = {
  ensureInitialized: async () => ({ ok: false, error: "NOT_AVAILABLE" }),
  unlock: async () => ({ ok: false, error: "NOT_AVAILABLE" }),
  lock: () => {},
  encryptUris: async () => ({ ok: false, error: "NOT_AVAILABLE" }),
  decryptToTemp: async () => ({ ok: false, error: "NOT_AVAILABLE" }),
  cleanTempSession: async () => false,
  cancelJob: async () => false,
};

const VaultCryptoModule: Spec =
  Platform.OS === "android"
    ? TurboModuleRegistry.getEnforcing<Spec>("VaultCryptoModule")
    : defaultVaultCryptoModule;

export const vaultCryptoEventEmitter =
  Platform.OS === "android" ? DeviceEventEmitter : null;

export const onVaultProgress = (callback: (event: ProgressEvent) => void) => {
  if (!vaultCryptoEventEmitter) return () => {};

  const sub = vaultCryptoEventEmitter.addListener("vault-progress", (e) => {
    callback(e as ProgressEvent);
  });

  return () => sub.remove();
};

if (
  process.env.NODE_ENV === "development" &&
  Platform.OS === "android" &&
  VaultCryptoModule === defaultVaultCryptoModule
) {
  logError("VaultCryptoModule is not available.");
}

export default VaultCryptoModule;
