import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { execSync } from "child_process";
import { Validations } from "../common/both/validations.ts";
import { ServerFetch } from "../common/both/fetch/fetch.ts";

if (fs.existsSync(path.join(process.cwd(), ".env")))
  dotenv.config({ path: path.join(process.cwd(), ".env") });

export const fetchServerVersion = async (
  version: string,
  buildType: string,
): Promise<{
  reachable: boolean;
  latestVersion?: string;
  isGreater?: boolean;
  error?: string;
}> => {
  try {
    const res = await ServerFetch.get(
      "/updates/is-update-available/:version/:buildType",
      {
        params: {
          version,
          buildType: buildType as never,
        },
      },
    );
    if (!res.ok || "error" in res.data) {
      return {
        reachable: false,
        error:
          "error" in res.data ? String(res.data.error) : `HTTP ${res.status}`,
      };
    }
    const data = res.data;
    const latestVersion = data.latestVersion || "0.0.0";
    const isGreater = Validations.isNewVersion(version, latestVersion);
    return { reachable: true, latestVersion, isGreater };
  } catch (err) {
    return {
      reachable: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
};

export const checkAndroidFallback = (
  currentVersion: string,
  cwd = process.cwd(),
): boolean => {
  let prevVersion = "";
  try {
    const output = execSync("git show HEAD^:app/app.config.ts", {
      encoding: "utf8",
      cwd,
      stdio: ["pipe", "pipe", "ignore"],
    });
    const match = output.match(
      /const\s+version\s*=\s*"([0-9]+\.[0-9]+\.[0-9]+)/,
    );
    if (match) prevVersion = match[1];
  } catch {
    // If git show fails (e.g. shallow clone or initial commit), prevVersion remains empty
  }

  const currMatch = currentVersion.match(/([0-9]+\.[0-9]+\.[0-9]+)/);
  const cleanCurr = currMatch ? currMatch[1] : currentVersion;

  // eslint-disable-next-line no-console
  console.log(
    `[Android Fallback] Previous version: "${prevVersion}", New version: "${cleanCurr}"`,
  );

  if (!prevVersion || !cleanCurr) {
    // eslint-disable-next-line no-console
    console.log(
      "[Android Fallback] Could not extract versions, defaulting to build.",
    );
    return true;
  }

  if (prevVersion === cleanCurr) {
    // eslint-disable-next-line no-console
    console.log("[Android Fallback] Version is identical. Skipping build.");
    return false;
  }

  const prevParts = prevVersion.split(".").map((n) => Number(n) || 0);
  const currParts = cleanCurr.split(".").map((n) => Number(n) || 0);

  const prevMajor = prevParts[0] ?? 0;
  const prevMinor = prevParts[1] ?? 0;
  const currMajor = currParts[0] ?? 0;
  const currMinor = currParts[1] ?? 0;

  if (currMajor > prevMajor) {
    // eslint-disable-next-line no-console
    console.log("[Android Fallback] Major version changed.");
    return true;
  }

  if (currMajor === prevMajor && currMinor > prevMinor) {
    // eslint-disable-next-line no-console
    console.log("[Android Fallback] Minor version changed.");
    return true;
  }

  // eslint-disable-next-line no-console
  console.log("[Android Fallback] No major or minor version change detected.");
  return false;
};

export const checkElectronFallback = (
  currentVersion: string,
  cwd = process.cwd(),
): boolean => {
  let prevVersion = "";
  try {
    const output = execSync("git show HEAD^:UtilitiesForPC/package.json", {
      encoding: "utf8",
      cwd,
      stdio: ["pipe", "pipe", "ignore"],
    });
    const json = JSON.parse(output) as { version?: string };
    if (json.version) prevVersion = json.version;
  } catch {
    // If git show fails, prevVersion remains empty
  }

  // eslint-disable-next-line no-console
  console.log(
    `[Electron Fallback] Current version: "${currentVersion}", Previous version: "${prevVersion}"`,
  );

  if (!prevVersion) {
    // eslint-disable-next-line no-console
    console.log(
      "[Electron Fallback] Could not extract previous version, defaulting to build.",
    );
    return true;
  }

  if (currentVersion !== prevVersion) {
    // eslint-disable-next-line no-console
    console.log("[Electron Fallback] Version changed.");
    return true;
  }

  // eslint-disable-next-line no-console
  console.log("[Electron Fallback] Version did not change.");
  return false;
};

export const setGithubOutput = (key: string, value: string | boolean): void => {
  const outputPath = process.env.GITHUB_OUTPUT;
  if (!outputPath) return;
  fs.appendFileSync(outputPath, `${key}=${String(value)}\n`, "utf8");
};

export const getAndroidVersion = (rootPath: string): string => {
  const configPath = path.join(rootPath, "app", "app.config.ts");
  const content = fs.readFileSync(configPath, "utf8");
  const match = content.match(/const\s+version\s*=\s*"([^"]+)"/);
  if (!match)
    throw new Error("Could not extract version from app/app.config.ts");
  return match[1];
};

export const getElectronVersion = (rootPath: string): string => {
  const pkgPath = path.join(rootPath, "UtilitiesForPC", "package.json");
  const content = fs.readFileSync(pkgPath, "utf8");
  const json = JSON.parse(content) as { version?: string };
  if (!json.version)
    throw new Error(
      "Could not extract version from UtilitiesForPC/package.json",
    );
  return json.version;
};

export const evaluateBuildType = async (
  isServerUp: boolean,
  buildType: "android" | "linux" | "windows",
  currentVersion: string,
  cwd = process.cwd(),
): Promise<boolean> => {
  if (isServerUp) {
    // eslint-disable-next-line no-console
    console.log(
      `[${buildType}] Checking version against server: ${process.env.API_URL}...`,
    );
    const serverResult = await fetchServerVersion(currentVersion, buildType);
    if (serverResult.reachable) {
      const serverVersion = serverResult.latestVersion ?? "";
      const isGreater = serverResult.isGreater ?? false;
      // eslint-disable-next-line no-console
      console.log(
        `[${buildType}] Server check success -> Current: "${currentVersion}", Server: "${serverVersion}" -> Greater: ${isGreater}`,
      );
      return isGreater;
    }
    // eslint-disable-next-line no-console
    console.log(
      `[${buildType}] Server route returned unreachable or error: ${serverResult.error}. Falling back to git comparison.`,
    );
  } else {
    // eslint-disable-next-line no-console
    console.log(
      `[${buildType}] Server is not reachable at ${process.env.API_URL || "(empty API_URL)"}. Falling back to git comparison.`,
    );
  }

  if (buildType === "android") {
    return checkAndroidFallback(currentVersion, cwd);
  }
  return checkElectronFallback(currentVersion, cwd);
};

export const runCheckVersion = async (): Promise<void> => {
  const args = process.argv.slice(2);
  let platform = "android";

  for (const arg of args) {
    if (arg.startsWith("--platform=")) {
      platform = arg.split("=")[1].toLowerCase();
    } else if (!arg.startsWith("-")) {
      platform = arg.toLowerCase();
    }
  }

  const rootPath = process.cwd();
  const apiUrl = process.env.API_URL ?? "";

  const isServerUp = await ServerFetch.isServerAlive();
  // eslint-disable-next-line no-console
  console.log(`Server alive status: ${isServerUp} (API_URL: "${apiUrl}")`);

  if (platform === "android") {
    const version = getAndroidVersion(rootPath);
    // eslint-disable-next-line no-console
    console.log(`Detected Android version: "${version}"`);
    const shouldBuild = await evaluateBuildType(
      isServerUp,
      "android",
      version,
      rootPath,
    );
    // eslint-disable-next-line no-console
    console.log(`Final Android should_build: ${shouldBuild}`);
    setGithubOutput("should_build", shouldBuild);
  } else if (platform === "electron") {
    const version = getElectronVersion(rootPath);
    // eslint-disable-next-line no-console
    console.log(`Detected Electron version: "${version}"`);

    const [shouldBuildLinux, shouldBuildWindows] = await Promise.all([
      evaluateBuildType(isServerUp, "linux", version, rootPath),
      evaluateBuildType(isServerUp, "windows", version, rootPath),
    ]);

    const changed = shouldBuildLinux || shouldBuildWindows;
    // eslint-disable-next-line no-console
    console.log(
      `Final Electron outputs -> changed: ${changed}, build_linux: ${shouldBuildLinux}, build_windows: ${shouldBuildWindows}`,
    );

    setGithubOutput("changed", changed);
    setGithubOutput("build_linux", shouldBuildLinux);
    setGithubOutput("build_windows", shouldBuildWindows);
  } else if (platform === "linux" || platform === "windows") {
    const version = getElectronVersion(rootPath);
    // eslint-disable-next-line no-console
    console.log(`Detected ${platform} version: "${version}"`);

    const shouldBuild = await evaluateBuildType(
      isServerUp,
      platform,
      version,
      rootPath,
    );
    // eslint-disable-next-line no-console
    console.log(`Final ${platform} should_build: ${shouldBuild}`);
    setGithubOutput("should_build", shouldBuild);
    setGithubOutput("changed", shouldBuild);
    setGithubOutput(`build_${platform}`, shouldBuild);
  } else {
    throw new Error(
      `Unknown platform: ${platform}. Expected: android, electron, linux, or windows.`,
    );
  }
};

if (process.env.NODE_ENV !== "test") {
  runCheckVersion().catch((err) => {
    // eslint-disable-next-line no-console
    console.error("Error checking version:", err);
    process.exit(1);
  });
}
