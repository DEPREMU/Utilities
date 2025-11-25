import fs from "fs";
import path from "path";
import prettier from "prettier";
import { UTILITIES_PATH } from "./config.ts";

const validExtensions = [
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".json",
  ".css",
  ".scss",
  ".html",
  ".md",
  ".mdx",
];

const exclude = fs
  .readFileSync(path.join(UTILITIES_PATH, ".gitignore"), "utf-8")
  .split("\n")
  .map((line) => line.replace(/\/$/, ""))
  .filter((line) => line && !line.startsWith("#"));

const isValidFileExtension = (fileName: string): boolean => {
  return validExtensions.includes(path.extname(fileName));
};

const isExcludedPath = (filePath: string): boolean => {
  return exclude.some((excludedPath) => filePath.includes(excludedPath));
};

export const formatFolder = async (
  localPath: string,
  prettierConfig?: prettier.Options,
  first: boolean = true
): Promise<number> => {
  if (!fs.existsSync(localPath))
    throw new Error(`Path does not exist: ${localPath}`);

  const files = fs.readdirSync(localPath);
  const prettierFile = files.find(
    (file) => file === ".prettierrc" || file === ".prettierrc.json"
  );
  if (prettierFile) {
    const configPath = path.join(localPath, prettierFile);
    const configContent = fs.readFileSync(configPath, "utf-8");
    prettierConfig = JSON.parse(configContent) as prettier.Options;
  }
  console.log(`Using Prettier config: ${JSON.stringify(prettierConfig)}`);

  let formattedFiles = 0;
  await Promise.all(
    files.map(async (file) => {
      const fullPath = localPath + "/" + file;
      const stats = fs.statSync(fullPath);
      if (isExcludedPath(fullPath)) return;
      console.log(`Formatting: ${fullPath}`);
      if (stats.isDirectory()) {
        return await formatFolder(fullPath, prettierConfig, false);
      } else if (stats.isFile() && isValidFileExtension(file)) {
        const content = fs.readFileSync(fullPath, "utf-8");
        const formattedContent = await prettier.format(
          content,
          prettierConfig || {
            filepath: fullPath,
            endOfLine: "lf",
          }
        );
        fs.writeFileSync(fullPath, formattedContent, "utf-8");
        formattedFiles++;
      }
    })
  );
  if (first) {
    console.log(`Total formatted files: ${formattedFiles}`);
  }
  return formattedFiles;
};
