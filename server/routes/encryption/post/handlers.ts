import chalk from "chalk";
import { Task, Logger, getHandlerPost } from "@common";

const taskEncryption = new Task<string, "ENCRYPTION">({
  fileWorker: "ENCRYPTION",
  doNotDestroy: true,
});

export const handleEncrypt = getHandlerPost(
  "/encryption",
  "/encrypt",
  { value: "string" },
  async (body, sendResponse) => {
    try {
      const { value } = body;

      if (!value)
        return sendResponse("BAD_REQUEST", {
          error: "No data provided to encrypt",
        });

      const result = await taskEncryption.getResult({
        data: { text: value },
        functionName: "encryptText",
      });

      if (result instanceof Error) {
        Logger.error(chalk.red("Encryption error in task:"), result);
        sendResponse("INTERNAL_SERVER_ERROR", {
          error: "Encryption failed",
        });
        return;
      }

      sendResponse("SUCCESS", { value: result });
    } catch (error) {
      Logger.error(chalk.red("Encryption error:"), error);
      sendResponse("INTERNAL_SERVER_ERROR", { error: "Encryption failed" });
    }
  },
);

export const handleDecrypt = getHandlerPost(
  "/encryption",
  "/decrypt",
  { value: "string" },
  async (body, sendResponse) => {
    try {
      const { value } = body;

      if (!value)
        return sendResponse("BAD_REQUEST", {
          error: "No data provided to decrypt",
        });

      const result = await taskEncryption.getResult({
        data: { text: value },
        functionName: "decryptText",
      });
      if (result instanceof Error) {
        Logger.error(chalk.red("Decryption error in task:"), result);
        sendResponse("INTERNAL_SERVER_ERROR", {
          error: "Decryption failed",
        });
        return;
      }

      sendResponse("SUCCESS", { value: result });
    } catch (error) {
      Logger.error(chalk.red("Decryption error:"), error);
      sendResponse("INTERNAL_SERVER_ERROR", { error: "Decryption failed" });
    }
  },
);
