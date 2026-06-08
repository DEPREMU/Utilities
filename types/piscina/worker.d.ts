import { RequestChangeImageFormat } from "../API";

export type WorkerFiles = "IMAGES" | "ENCRYPTION" | "GET_LOCAL_IP";

export type EncryptionWorkerData = {
  password: string;
  inputPath: string;
  outputPath: string;
};

type EncryptionWorker = {
  functions: {
    encryptFile: {
      data: EncryptionWorkerData;
    };
    decryptFile: {
      data: EncryptionWorkerData;
    };
    encryptText: {
      data: { text: string };
    };
    decryptText: {
      data: { text: string };
    };
  };
};

type ImagesWorker = {
  functions: {
    changeImageFormat: {
      data: RequestChangeImageFormat;
    };
  };
};

type GetLocalIPWorker = {
  functions: {
    default: {
      data: never;
    };
  };
};

type AdditionalWorkerData = {
  filePath: string;
};

export type WorkerData<T extends WorkerFiles> = T extends "IMAGES"
  ? ImagesWorker & AdditionalWorkerData
  : T extends "ENCRYPTION"
    ? EncryptionWorker & AdditionalWorkerData
    : T extends "GET_LOCAL_IP"
      ? GetLocalIPWorker & AdditionalWorkerData
      : never;
