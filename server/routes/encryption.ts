import chalk from "chalk";
import { Logger, Task } from "@common";
import { getHandlerPost } from "@/functions/getHandlerPost.ts";
import { RequestDecrypt, RequestEncrypt } from "@types";

const taskEncryption = new Task<string, "ENCRYPTION">({
  fileWorker: "ENCRYPTION",
  doNotDestroy: true,
});

/**
 * Handles encryption requests.
 *
 * Receives data to encrypt from the request body, encrypts it using the `encrypt` function,
 * and returns the encrypted data in the response. If encryption fails, responds with a 500 error
 * and an error message.
 *
 * @param req - Express request object containing the data to encrypt in the body.
 * @param res - Express response object used to send the encrypted data or an error message.
 * @returns A promise that resolves when the response is sent.
 */
export const encryptHandler = getHandlerPost(
  "/encrypt",
  {
    dataToEncrypt: "string",
  },
  async (body, sendResponse) => {
    try {
      const { dataToEncrypt } = body as RequestEncrypt;

      if (!dataToEncrypt)
        return sendResponse("BAD_REQUEST", {
          error: "No data provided to encrypt",
          success: false,
        });

      const encryptedData = await taskEncryption.getResult({
        data: { text: dataToEncrypt },
        functionName: "encryptText",
      });

      if (encryptedData instanceof Error) {
        Logger.error(chalk.red("Encryption error in task:"), encryptedData);
        return sendResponse("INTERNAL_SERVER_ERROR", {
          error: "Encryption failed",
          success: false,
        });
      }

      sendResponse("SUCCESS", {
        success: true,
        dataEncrypted: encryptedData,
      });
    } catch (error) {
      Logger.error(chalk.red("Encryption error:"), error);
      sendResponse("INTERNAL_SERVER_ERROR", {
        error: "Encryption failed",
        success: false,
      });
    }
  },
);

/**
 * Handles the decryption of data sent in the request body.
 *
 * @param req - Express request object containing the data to decrypt in the body.
 * @param res - Express response object used to send the decrypted data or an error response.
 * @returns A JSON response with the decrypted data if successful, or an error message if decryption fails.
 *
 * @remarks
 * Expects `dataToDecrypt` in the request body. On success, responds with `{ dataDecrypted }`.
 * On failure, responds with an error object containing a message and timestamp.
 */
export const decryptHandler = getHandlerPost(
  "/decrypt",
  {
    dataToDecrypt: "string",
  },
  async (body, sendResponse) => {
    try {
      const { dataToDecrypt } = body as RequestDecrypt;

      if (!dataToDecrypt)
        return sendResponse("BAD_REQUEST", {
          error: "No data provided to decrypt",
          success: false,
        });

      const decryptedData = await taskEncryption.getResult({
        data: { text: dataToDecrypt },
        functionName: "decryptText",
      });

      if (decryptedData instanceof Error) {
        Logger.error(chalk.red("Decryption error:"), decryptedData);
        return sendResponse("INTERNAL_SERVER_ERROR", {
          error: "Decryption failed",
          success: false,
        });
      }

      sendResponse("SUCCESS", {
        success: true,
        decryptedValue: decryptedData,
      });
    } catch (error) {
      Logger.error(chalk.red("Decryption error:"), error);
      sendResponse("INTERNAL_SERVER_ERROR", {
        error: "Decryption failed",
        success: false,
      });
    }
  },
);
