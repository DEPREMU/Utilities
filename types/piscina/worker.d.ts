import { RequestChangeImageFormat } from "../API";

export type WorkerFiles = "IMAGES" | "ENCRYPTION" | "GET_LOCAL_IP";

export type EncryptionWorkerData = {
  password: string;
  inputPath: string;
  outputPath: string;
};

type EncryptionWorker = {
  functions: {
    encryptData: {
      data: EncryptionWorkerData;
    };
    decryptData: {
      data: EncryptionWorkerData;
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
