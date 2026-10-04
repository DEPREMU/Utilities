import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { execSync } from "child_process";
import { Validations } from "../common/both/validations.ts";
import { ServerFetch } from "../common/both/fetch/fetch.ts";

if (fs.existsSync(path.join(process.cwd(), ".env")))
  dotenv.config({ path: path.join(process.cwd(), ".env") });

export type VersionAction = "build" | "update" | "skip";

export interface VersionEvaluation {
  action: VersionAction;
  shouldBuild: boolean;
  shouldUpdate: boolean;
  isNewer: boolean;
  currentVersion: string;
  previousVersion: string;
}

export const compareSemver = (
  prevVersion: string,
  currVersion: string,
): VersionEvaluation => {
  const cleanPrev = (
    prevVersion.match(/([0-9]+\.[0-9]+\.[0-9]+)/)?.[1] ?? prevVersion
  ).trim();
  const cleanCurr = (
    currVersion.match(/([0-9]+\.[0-9]+\.[0-9]+)/)?.[1] ?? currVersion
  ).trim();

  if (!cleanPrev || !cleanCurr) {
    return {
      action: "build",
      shouldBuild: true,
      shouldUpdate: false,
      isNewer: true,
      currentVersion: currVersion,
      previousVersion: prevVersion,
    };
  }

  if (cleanPrev === cleanCurr) {
    return {
      action: "skip",
      shouldBuild: false,
      shouldUpdate: false,
      isNewer: false,
      currentVersion: currVersion,
      previousVersion: prevVersion,
    };
  }

  const prevParts = cleanPrev.split(".").map((n) => Number(n) || 0);
  const currParts = cleanCurr.split(".").map((n) => Number(n) || 0);

  const prevMajor = prevParts[0] ?? 0;
  const prevMinor = prevParts[1] ?? 0;
  const prevPatch = prevParts[2] ?? 0;

  const currMajor = currParts[0] ?? 0;
  const currMinor = currParts[1] ?? 0;
  const currPatch = currParts[2] ?? 0;

  if (
    currMajor > prevMajor ||
    (currMajor === prevMajor && currMinor > prevMinor)
  ) {
    return {
      action: "build",
      shouldBuild: true,
      shouldUpdate: false,
      isNewer: true,
      currentVersion: currVersion,
      previousVersion: prevVersion,
    };
  }

  if (
    currMajor === prevMajor &&
    currMinor === prevMinor &&
    currPatch > prevPatch
  ) {
    return {
      action: "update",
      shouldBuild: false,
      shouldUpdate: true,
      isNewer: true,
      currentVersion: currVersion,
      previousVersion: prevVersion,
    };
  }

  return {
    action: "skip",
    shouldBuild: false,
    shouldUpdate: false,
    isNewer: false,
    currentVersion: currVersion,
    previousVersion: prevVersion,
  };
};

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
    const timeoutPromise = new Promise<{
      ok: false;
      status: number;
      data: { error: string };
    }>((resolve) =>
      setTimeout(
        () =>
          resolve({
            ok: false,
            status: 408,
            data: { error: "Request timeout after 3000ms" },
          }),
        3000,
      ),
    );

    const fetchPromise = ServerFetch.get(
      "/updates/is-update-available/:version/:buildType",
      {
        params: {
          version,
          buildType: buildType as never,
        },
      },
    );

    const res = await Promise.race([fetchPromise, timeoutPromise]);
    if (!res.ok || "error" in res.data) {
      return {
        reachable: false,
        error:
          "error" in res.data ? String(res.data.error) : `HTTP ${res.status}`,
      };
    }
    const data = res.data;
    const serverVersion = data.latestVersion || "";
    const isGreater = Validations.isNewVersion(serverVersion, version);
    return { reachable: true, latestVersion: serverVersion, isGreater };
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
): VersionEvaluation => {
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

  const evaluation = compareSemver(prevVersion, currentVersion);
  // eslint-disable-next-line no-console
  console.log(
    `[Android Fallback] Previous version: "${prevVersion}", New version: "${currentVersion}" -> Action: "${evaluation.action}"`,
  );
  return evaluation;
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

  const evaluation = compareSemver(prevVersion, currentVersion);

  // eslint-disable-next-line no-console
  console.log(
    `[Electron Fallback] Previous version: "${prevVersion}", Current version: "${currentVersion}" -> Action: "${evaluation.action}", shouldBuild: ${evaluation.shouldBuild}`,
  );

  return evaluation.shouldBuild;
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

export const getCommitMessage = (cwd = process.cwd()): string => {
  if (process.env.COMMIT_MESSAGE) {
    return process.env.COMMIT_MESSAGE.replace(/["\r\n]+/g, " ").trim();
  }
  try {
    const output = execSync("git log -1 --pretty=%B", {
      encoding: "utf8",
      cwd,
      stdio: ["pipe", "pipe", "ignore"],
    });
    return (
      output.replace(/["\r\n]+/g, " ").trim() || "CI automated build/update"
    );
  } catch {
    return "CI automated build/update";
  }
};

export const evaluateAndroid = async (
  isServerUp: boolean,
  currentVersion: string,
  cwd = process.cwd(),
): Promise<VersionEvaluation> => {
  if (isServerUp) {
    // eslint-disable-next-line no-console
    console.log(
      `[android] Checking version against server: ${process.env.API_URL}...`,
    );
    const serverResult = await fetchServerVersion(currentVersion, "android");
    if (serverResult.reachable) {
      const serverVersion = serverResult.latestVersion ?? "";
      const evaluation = compareSemver(serverVersion, currentVersion);
      // eslint-disable-next-line no-console
      console.log(
        `[android] Server check success -> Current: "${currentVersion}", Server: "${serverVersion}" -> Action: "${evaluation.action}"`,
      );
      return evaluation;
    }
    // eslint-disable-next-line no-console
    console.log(
      `[android] Server route returned unreachable or error: ${serverResult.error}. Falling back to git comparison.`,
    );
  } else {
    // eslint-disable-next-line no-console
    console.log(
      `[android] Server is not reachable at ${process.env.API_URL || "(empty API_URL)"}. Falling back to git comparison.`,
    );
  }

  return checkAndroidFallback(currentVersion, cwd);
};

export const evaluateBuildType = async (
  isServerUp: boolean,
  buildType: "android" | "linux" | "windows",
  currentVersion: string,
  cwd = process.cwd(),
): Promise<boolean> => {
  if (buildType === "android") {
    const evalRes = await evaluateAndroid(isServerUp, currentVersion, cwd);
    return evalRes.shouldBuild;
  }

  if (isServerUp) {
    // eslint-disable-next-line no-console
    console.log(
      `[${buildType}] Checking version against server: ${process.env.API_URL}...`,
    );
    const serverResult = await fetchServerVersion(currentVersion, buildType);
    if (serverResult.reachable) {
      const serverVersion = serverResult.latestVersion ?? "";
      const evaluation = compareSemver(serverVersion, currentVersion);
      // eslint-disable-next-line no-console
      console.log(
        `[${buildType}] Server check success -> Current: "${currentVersion}", Server: "${serverVersion}" -> Action: "${evaluation.action}", shouldBuild: ${evaluation.shouldBuild}`,
      );
      return evaluation.shouldBuild;
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

  const isServerUp = await (async () => {
    try {
      const alivePromise = ServerFetch.isServerAlive();
      const timeoutPromise = new Promise<boolean>((resolve) =>
        setTimeout(() => resolve(false), 3000),
      );
      return await Promise.race([alivePromise, timeoutPromise]);
    } catch {
      return false;
    }
  })();

  // eslint-disable-next-line no-console
  console.log(`Server alive status: ${isServerUp} (API_URL: "${apiUrl}")`);

  const commitMessage = getCommitMessage(rootPath);
  setGithubOutput("commit_message", commitMessage);

  if (platform === "android") {
    const version = getAndroidVersion(rootPath);
    // eslint-disable-next-line no-console
    console.log(`Detected Android version: "${version}"`);
    const evaluation = await evaluateAndroid(isServerUp, version, rootPath);
    // eslint-disable-next-line no-console
    console.log(
      `Final Android evaluation -> should_build: ${evaluation.shouldBuild}, should_update: ${evaluation.shouldUpdate}, action: ${evaluation.action}`,
    );
    setGithubOutput("should_build", evaluation.shouldBuild);
    setGithubOutput("should_update", evaluation.shouldUpdate);
    setGithubOutput("action", evaluation.action);
    setGithubOutput(
      "changed",
      evaluation.shouldBuild || evaluation.shouldUpdate,
    );
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
    setGithubOutput("should_build", changed);
    setGithubOutput("should_update", false);
    setGithubOutput("action", changed ? "build" : "skip");
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
    setGithubOutput("should_update", false);
    setGithubOutput("action", shouldBuild ? "build" : "skip");
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
