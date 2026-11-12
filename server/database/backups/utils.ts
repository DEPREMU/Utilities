import chalk from "chalk";
import { File, InstanceManager, Logger, Task } from "@common";

const logger = new Logger("DatabaseBackupsUtils");

export const encryptedExtension = ".sql.gpg";

const encryptionManager = new InstanceManager(
  () =>
    new Task<boolean, "ENCRYPTION">({
      fileWorker: "ENCRYPTION",
      doNotDestroy: true,
    }),
  10 * 60 * 1000,
);

export const encryptFile = async (filePath: string, password: string) => {
  const file = new File(filePath);
  const copyFile = await file.copyFile(filePath + ".bak");

  if (copyFile instanceof Error) {
    logger.error(
      chalk.red("Error creating backup file for encryption:"),
      copyFile,
    );
    return;
  }

  const res = await encryptionManager.instance.getResult({
    data: { inputPath: copyFile.path, password, outputPath: filePath },
    abortAfter: 5 * 60 * 1000,
    functionName: "encryptFile",
  });
  await copyFile.rm({ force: true });

  encryptionManager.startTimer();

  if (res instanceof Error) {
    logger.error(chalk.red("Error encrypting file:"), res);
    return;
  }

  logger.log(chalk.green(`File encrypted successfully: ${filePath}`));
};

export const decryptFile = async (
  filePath: string,
  password: string,
  returnString = false,
): Promise<string | void> => {
  const file = new File(filePath);
  if (!(await file.exists())) {
    logger.error(chalk.red("File to decrypt does not exist:"), filePath);
    return;
  }

  const copyFile = await file.copyFile(filePath + ".bak");
  if (copyFile instanceof Error) {
    logger.error(
      chalk.red("Error creating backup file for decryption:"),
      copyFile,
    );
    return;
  }

  const res = await encryptionManager.instance.getResult({
    data: { inputPath: copyFile.path, password, outputPath: filePath },
    abortAfter: 5 * 60 * 1000,
    functionName: "decryptFile",
  });
  await copyFile.rm({ force: true });
  encryptionManager.startTimer();

  if (res instanceof Error) {
    logger.error(chalk.red("Error decrypting file:"), res);
    return;
  }
  logger.log(chalk.green(`File decrypted successfully: ${filePath}`));

  if (!returnString) return;

  const decryptedContent = await file.readFile("utf-8");
  return decryptedContent;
};
