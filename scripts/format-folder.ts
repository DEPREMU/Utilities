import path from "path";
import prettier from "prettier";
import { Script } from "./common";
import { Logger } from "@commonSrc/serverOrElectron/logger.ts";
import { Directory, File } from "@commonSrc/serverOrElectron/fs.ts";
import { Helper } from "@commonSrc/both";

const script = new Script();

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

let exclude: string[] = [];

const getExclude = async () => {
  if (exclude.length > 0) return exclude;
  exclude = await new File(path.join(script.PATHS.root, ".gitignore"))
    .readFile("utf-8")
    .then((content) =>
      content
        .split("\n")
        .map((line) => line.replace(/\/$/, ""))
        .filter((line) => line && !line.startsWith("#")),
    );
  return exclude;
};

const isValidFileExtension = (fileName: string): boolean => {
  return validExtensions.includes(path.extname(fileName));
};

const isExcludedPath = async (filePath: string): Promise<boolean> => {
  const normalizedPath = filePath.replace(/\\/g, "/");
  if (
    normalizedPath.includes("/node_modules/") ||
    normalizedPath.endsWith("/node_modules") ||
    normalizedPath.includes("/.git/") ||
    normalizedPath.endsWith("/.git")
  ) {
    return true;
  }
  const excl = await getExclude();
  return excl.some((excludedPath) => {
    const cleanExcl = excludedPath.replace(/\\/g, "/").replace(/^\//, "");
    return (
      normalizedPath.includes(`/${cleanExcl}/`) ||
      normalizedPath.endsWith(`/${cleanExcl}`) ||
      normalizedPath.includes(cleanExcl)
    );
  });
};

export const formatFolder = async (
  localPath: string,
  prettierConfig?: prettier.Options,
  first: boolean = true,
): Promise<number> => {
  const dir = new Directory(localPath);
  if (!(await dir.exists()))
    throw new Error(`Path does not exist: ${localPath}`);

  const files = await dir.readDir();

  if (!prettierConfig) {
    const configContent = await new File(
      path.join(script.PATHS.root, ".prettierrc"),
    ).readFile("utf-8");

    prettierConfig = JSON.parse(configContent) as prettier.Options;
  }
  Logger.log(`Using Prettier config: ${JSON.stringify(prettierConfig)}`);

  let formattedFiles = 0;

  await Helper.Arrays.forEachQueue(5, files, async (_filename) => {
    const file = new File(path.join(localPath, _filename));

    const stats = await file.stats();

    if ((await isExcludedPath(file.path)) || !stats) return;
    Logger.log(`Formatting: ${file.path}`);
    if (stats.isDirectory()) {
      await formatFolder(file.path, prettierConfig, false);
    } else if (stats.isFile() && isValidFileExtension(file.path)) {
      const content = await file.readFile("utf-8");
      const formattedContent = await prettier.format(content, {
        ...(prettierConfig || {}),
        filepath: file.path,
        endOfLine: "lf",
      });

      if (content === formattedContent) return;
      await file.writeFile(formattedContent, "utf-8");

      formattedFiles++;
    }
  });

  if (first) Logger.log(`Total formatted files: ${formattedFiles}`);

  return formattedFiles;
};
