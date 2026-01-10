export type VaultSchemaVersion = 1;

export type VaultProgressPhase =
  | "scan"
  | "compress"
  | "decompress"
  | "copy"
  | "encrypt"
  | "decrypt"
  | "verify"
  | "cleanup";

export type ProgressEvent = {
  jobId: string;
  fileId?: string;
  phase: VaultProgressPhase;
  writtenBytes: number;
  totalBytes?: number;
  percent?: number;
  rateBytesPerSec?: number;
};

export type VaultEncryptionAlgorithm = "AES-256-GCM";

export type VaultItemEncryption = {
  schemaVersion: VaultSchemaVersion;
  algorithm: VaultEncryptionAlgorithm;
  keyId: string;
  nonceBase64: string;
  tagLength: 16;
  aad?: string;
};

export type VaultItemIntegrity = {
  hashAlg: "SHA-256";
  hashCipherHex: string;
};

export type VaultItemFlags = {
  readOnly: boolean;
  incognito: boolean;
  secretHidden: boolean;
};

export type VaultItemAccessControl = {
  requiresAuth: boolean;
  accessTTLSeconds: number;
  lastAuthAt: string | null;
  lockedUntil: string | null;
};

export type VaultItemAudit = {
  failedAttempts: number;
  lastFailedAt: string | null;
};

export type VaultItem = {
  id: string;
  folderId: string;
  displayName: string;
  originalName: string;
  extension: string;
  mimeType: string;
  sizePlainBytes: number | null;
  sizeCipherBytes: number;
  importedAt: string;
  modifiedAt: string | null;
  encryption: VaultItemEncryption;
  integrity: VaultItemIntegrity;
  flags: VaultItemFlags;
  accessControl: VaultItemAccessControl;
  audit: VaultItemAudit;
};

export type VaultFolderFlags = {
  readOnly: boolean;
  secretHidden: boolean;
};

export type VaultFolderEncryptionPolicy = "inheritMaster" | "perFolderKey";

export type VaultFolder = {
  id: string;
  displayName: string;
  createdAt: string;
  encryptionPolicy: VaultFolderEncryptionPolicy;
  keyId: string;
  flags: VaultFolderFlags;
  accessTTLSeconds: number;
};

export type VaultKdfParamsScrypt = {
  algorithm: "scrypt";
  saltBase64: string;
  N: number;
  r: number;
  p: number;
  keyLen: 32;
};

export type VaultKdfParamsPbkdf2 = {
  algorithm: "pbkdf2";
  saltBase64: string;
  iterations: number;
  hash: "SHA-256";
  keyLen: 32;
};

export type VaultManifest = {
  schemaVersion: VaultSchemaVersion;
  encryptionVersion: 1;
  folders: string[];
  kdf?: VaultKdfParamsScrypt | VaultKdfParamsPbkdf2;
  masterKeyId: string;
};

export type VaultAuthMethod =
  | "none"
  | "pin"
  | "password"
  | "biometric"
  | "pin+biometric"
  | "password+biometric";

export type VaultBackupPolicy = {
  allowExport: boolean;
  allowSameKeyExport: boolean;
  requireLongPasswordForReencrypt: boolean;
};

export type VaultSettings = {
  authMethod: VaultAuthMethod;
  autoLockSeconds: number;
  failedAttemptsLimit: number;
  cooldownSeconds: number;
  integrityCheckOnImport: boolean;
  integrityCheckOnAccess: boolean;
  compressionThresholdBytes: number;
  autoCompressLargeFiles: boolean;
  incognitoModeEnabled: boolean;
  secretModeEnabled: boolean;
  backupPolicy: VaultBackupPolicy;
};

export type VaultWrappedMasterKey = {
  schemaVersion: VaultSchemaVersion;
  keyId: string;
  wrappedKeyBase64: string;
  wrapNonceBase64: string;
  kdf: VaultKdfParamsScrypt | VaultKdfParamsPbkdf2;
};

export type VaultAuthVerifier = {
  schemaVersion: VaultSchemaVersion;
  method: Exclude<VaultAuthMethod, "none">;
  kdf: VaultKdfParamsScrypt | VaultKdfParamsPbkdf2;
  verifierBase64: string;
};

export type VaultIndex = {
  schemaVersion: VaultSchemaVersion;
  updatedAt: string;
  foldersById: Record<string, VaultFolder>;
  itemsByFolderId: Record<string, VaultItem[]>;
};
