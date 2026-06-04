import path from "path";
import { app } from "electron";
import { Logger } from "./logger";
import { path7za } from "7zip-bin";
import { ChannelsIpcRenderer } from "@types";
import { add, SevenZipOptions } from "node-7z";
import { Directory, File, URI_EXTENSION } from "@common";

export const zipFolder = async (
  ...args: ChannelsIpcRenderer["zip-folder"]["functionArgs"]
): Promise<string> => {
  try {
    const [files, outputPath, password, onProgress, onError] = args;

    const outputZipPath = path.join(
      outputPath.path,
      `${outputPath.folderName}.zip`,
    );

    const tempFolder = path.join(app.getPath("temp"), "zip-temp-folder");
    const tempDir = new Directory(tempFolder);
    await tempDir.mkdir({ recursive: true });
    await Promise.all(
      files.map(async (filePath) => {
        filePath = filePath.startsWith(URI_EXTENSION)
          ? filePath.slice(URI_EXTENSION.length)
          : filePath;

        const fileName = path.basename(filePath);
        const destPath = path.join(tempFolder, fileName);

        await new File(filePath).copyFile(destPath);
      }),
    );

    return await new Promise((resolve) => {
      const options: SevenZipOptions = {
        $bin: path7za,
        recursive: true,
        ...(password ? { password } : {}),
      };

      const zipStream = add(outputZipPath, `${tempFolder}/*`, options);

      zipStream.on("progress", (progress) => {
        onProgress?.(progress.percent, progress.file || "", progress.fileCount);
      });

      zipStream.on("end", async () => {
        try {
          onProgress?.(100, "", 0);
          await tempDir.rm({ recursive: true, force: true });
        } catch {
          // Ignore error
        }
        resolve(outputZipPath);
      });

      zipStream.on("error", (err) => {
        onError?.(err);
        Logger.error("Error zipping folder:", err);
        resolve("");
      });
    });
  } catch (error) {
    Logger.error("Error in zipFolder function:", error);
    return "";
  }
};
