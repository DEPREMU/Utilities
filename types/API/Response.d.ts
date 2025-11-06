export type ResponseDecrypt = {
  decryptedValue?: string;
  timestamp: string;
  error?: string;
};

export type ResponseEncrypt = {
  dataEncrypted?: string;
  timestamp: string;
  error?: string;
};
