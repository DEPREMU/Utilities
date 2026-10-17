import {
  Task,
  Logger,
  RequestError,
  getHandlerPost,
  STATUS_RESPONSE,
} from "@common";
import chalk from "chalk";

const logger = new Logger("EncryptionPost");

const taskEncryption = new Task<string, "ENCRYPTION">({
  fileWorker: "ENCRYPTION",
  doNotDestroy: true,
});

export const handleEncrypt = getHandlerPost(
  "/encryption",
  "/encrypt",
  async ({ body }, sendResponse) => {
    const { value } = body;

    if (!value)
      throw new RequestError(
        STATUS_RESPONSE.BAD_REQUEST,
        "No data provided to encrypt",
      );

    const result = await taskEncryption.getResult({
      data: { text: value },
      functionName: "encryptText",
    });

    if (result instanceof Error) {
      logger.error(chalk.red("Encryption error in task:"), result);
      throw new RequestError(
        STATUS_RESPONSE.INTERNAL_SERVER_ERROR,
        `Encryption failed: ${result.message}`,
      );
    }

    sendResponse(STATUS_RESPONSE.SUCCESS, { value: result });
  },
);

export const handleDecrypt = getHandlerPost(
  "/encryption",
  "/decrypt",
  async ({ body }, sendResponse) => {
    const { value } = body;

    if (!value)
      throw new RequestError(
        STATUS_RESPONSE.BAD_REQUEST,
        "No data provided to decrypt",
      );

    const result = await taskEncryption.getResult({
      data: { text: value },
      functionName: "decryptText",
    });
    if (result instanceof Error) {
      logger.error(chalk.red("Decryption error in task:"), result);
      throw new RequestError(
        STATUS_RESPONSE.INTERNAL_SERVER_ERROR,
        `Decryption failed: ${result.message}`,
      );
    }

    sendResponse(STATUS_RESPONSE.SUCCESS, { value: result });
  },
);
