import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { Validations } from "../common/both/validations.ts";

export type VersionAction = "build" | "update" | "skip";

export interface VersionEvaluation {
  action: VersionAction;
  shouldBuild: boolean;
  shouldUpdate: boolean;
  isNewer: boolean;
  currentVersion: string;
  previousVersion: string;
}

export interface HttpResponse<T = unknown> {
  ok: boolean;
  status: number;
  data: T;
}

export interface HttpClient {
  get<T = unknown>(
    url: string,
    options?: { timeoutMs?: number; headers?: Record<string, string> },
  ): Promise<HttpResponse<T>>;
}

export type HttpTransportType = "axios" | "fetch";

export interface HttpClientHolder {
  client: HttpClient;
  transport: HttpTransportType;
}

export const isModuleNotFoundError = (err: unknown): boolean => {
  if (!err || typeof err !== "object") return false;
  const errorObj = err as { code?: string; message?: string };
  if (
    errorObj.code === "ERR_MODULE_NOT_FOUND" ||
    errorObj.code === "MODULE_NOT_FOUND"
  ) {
    return true;
  }
  const msg = String(errorObj.message || "");
  return (
    msg.includes("Cannot find package 'axios'") ||
    msg.includes("Cannot find module 'axios'") ||
    msg.includes("Failed to resolve module specifier 'axios'")
  );
};

export const createAxiosClient = (axiosModule: unknown): HttpClient => {
  const axiosInstance =
    (axiosModule as { default?: unknown }).default || axiosModule;
  const axios = axiosInstance as {
    get: (
      url: string,
      config?: {
        headers?: Record<string, string>;
        timeout?: number;
        validateStatus?: () => boolean;
      },
    ) => Promise<{ status: number; data: unknown }>;
  };

  return {
    async get<T = unknown>(
      url: string,
      options?: { timeoutMs?: number; headers?: Record<string, string> },
    ): Promise<HttpResponse<T>> {
      const response = await axios.get(url, {
        headers: options?.headers,
        timeout: options?.timeoutMs ?? 3000,
        validateStatus: () => true,
      });

      return {
        ok: response.status >= 200 && response.status < 400,
        status: response.status,
        data: response.data as T,
      };
    },
  };
};

export const createFetchClient = (): HttpClient => {
  return {
    async get<T = unknown>(
      url: string,
      options?: { timeoutMs?: number; headers?: Record<string, string> },
    ): Promise<HttpResponse<T>> {
      const controller = new AbortController();
      const timeoutMs = options?.timeoutMs ?? 3000;
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(url, {
          method: "GET",
          headers: options?.headers,
          signal: controller.signal,
        });

        let data: T;
        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          data = (await response.json()) as T;
        } else {
          const text = await response.text();
          try {
            data = JSON.parse(text) as T;
          } catch {
            data = text as unknown as T;
          }
        }

        return {
          ok: response.status >= 200 && response.status < 400,
          status: response.status,
          data,
        };
      } finally {
        clearTimeout(timeoutId);
      }
    },
  };
};

let cachedClientHolder: HttpClientHolder | null = null;

export const resolveHttpClient = async (
  customImport?: () => Promise<unknown>,
): Promise<HttpClientHolder> => {
  const importFn = customImport ?? (() => import("axios"));
  try {
    const axiosModule = await importFn();
    return {
      client: createAxiosClient(axiosModule),
      transport: "axios",
    };
  } catch (err) {
    if (isModuleNotFoundError(err)) {
      return {
        client: createFetchClient(),
        transport: "fetch",
      };
    }
    throw err;
  }
};

export const getOrCreateHttpClient = async (
  customImport?: () => Promise<unknown>,
): Promise<HttpClient> => {
  if (!cachedClientHolder || customImport) {
    cachedClientHolder = await resolveHttpClient(customImport);
  }
  return cachedClientHolder.client;
};

export const resetHttpClientCache = (): void => {
  cachedClientHolder = null;
};

export const loadEnvironmentVariables = async (): Promise<void> => {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;

  try {
    const dotenv = await import("dotenv");
    dotenv.config({ path: envPath });
  } catch {
    try {
      const content = fs.readFileSync(envPath, "utf8");
      content.split("\n").forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) return;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim();
          let value = trimmed.slice(eqIdx + 1).trim();
          if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
          ) {
            value = value.slice(1, -1);
          }
          if (!(key in process.env)) {
            process.env[key] = value;
          }
        }
      });
    } catch {
      // Ignore if local .env cannot be read
    }
  }
};

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

export const isServerAlive = async (
  client?: HttpClient,
  apiUrl = process.env.API_URL || "http://localhost:3000/api",
): Promise<boolean> => {
  try {
    const httpClient = client ?? (await getOrCreateHttpClient());
    const baseUrl = apiUrl.endsWith("/") ? apiUrl.slice(0, -1) : apiUrl;
    const url = `${baseUrl}/info/generate204`;
    const res = await httpClient.get(url, { timeoutMs: 3000 });
    return res.status === 204 || res.status === 200;
  } catch {
    return false;
  }
};

export const fetchServerVersion = async (
  version: string,
  buildType: string,
  client?: HttpClient,
  apiUrl = process.env.API_URL || "http://localhost:3000/api",
): Promise<{
  reachable: boolean;
  latestVersion?: string;
  isGreater?: boolean;
  error?: string;
}> => {
  try {
    const httpClient = client ?? (await getOrCreateHttpClient());
    const baseUrl = apiUrl.endsWith("/") ? apiUrl.slice(0, -1) : apiUrl;
    const url = `${baseUrl}/downloads/is-update-available/${encodeURIComponent(version)}/${encodeURIComponent(buildType)}`;

    const res = await httpClient.get<{
      latestVersion?: string;
      isUpdateAvailable?: boolean;
      error?: string;
    }>(url, { timeoutMs: 3000 });

    if (
      !res.ok ||
      (res.data && typeof res.data === "object" && "error" in res.data)
    ) {
      return {
        reachable: false,
        error:
          res.data && typeof res.data === "object" && "error" in res.data
            ? String((res.data as { error: string }).error)
            : `HTTP ${res.status}`,
      };
    }

    const data = res.data;
    const serverVersion = data?.latestVersion || "";
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
  // For Electron, any newer version (including patch increments) requires building installers
  const shouldBuild = evaluation.isNewer;

  // eslint-disable-next-line no-console
  console.log(
    `[Electron Fallback] Previous version: "${prevVersion}", Current version: "${currentVersion}" -> isNewer: ${evaluation.isNewer}, shouldBuild: ${shouldBuild}`,
  );

  return shouldBuild;
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
  client?: HttpClient,
): Promise<VersionEvaluation> => {
  if (isServerUp) {
    // eslint-disable-next-line no-console
    console.log(
      `[android] Checking version against server: ${process.env.API_URL}...`,
    );
    const serverResult = await fetchServerVersion(
      currentVersion,
      "android",
      client,
    );
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
  client?: HttpClient,
): Promise<boolean> => {
  if (buildType === "android") {
    const evalRes = await evaluateAndroid(
      isServerUp,
      currentVersion,
      cwd,
      client,
    );
    return evalRes.shouldBuild;
  }

  if (isServerUp) {
    // eslint-disable-next-line no-console
    console.log(
      `[${buildType}] Checking version against server: ${process.env.API_URL}...`,
    );
    const serverResult = await fetchServerVersion(
      currentVersion,
      buildType,
      client,
    );
    if (serverResult.reachable) {
      const serverVersion = serverResult.latestVersion ?? "";
      const evaluation = compareSemver(serverVersion, currentVersion);
      // For Electron platforms (linux and windows), patch version increments require a build
      const shouldBuild = evaluation.isNewer;
      // eslint-disable-next-line no-console
      console.log(
        `[${buildType}] Server check success -> Current: "${currentVersion}", Server: "${serverVersion}" -> isNewer: ${evaluation.isNewer}, shouldBuild: ${shouldBuild}`,
      );
      return shouldBuild;
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
  await loadEnvironmentVariables();

  const args = process.argv.slice(2);
  let platform = "android";
  let forceBuild = process.env.FORCE_BUILD === "true";

  for (const arg of args) {
    if (arg.startsWith("--platform=")) {
      platform = arg.split("=")[1].toLowerCase();
    } else if (arg === "--force") {
      forceBuild = true;
    } else if (!arg.startsWith("-")) {
      platform = arg.toLowerCase();
    }
  }

  const rootPath = process.cwd();
  const apiUrl = process.env.API_URL ?? "";

  const clientHolder = await resolveHttpClient();
  // eslint-disable-next-line no-console
  console.log(`[check-version-ci] Using HTTP transport: ${clientHolder.transport}`);

  const isUp = await isServerAlive(clientHolder.client, apiUrl);
  // eslint-disable-next-line no-console
  console.log(`Server alive status: ${isUp} (API_URL: "${apiUrl}")`);

  const commitMessage = getCommitMessage(rootPath);
  setGithubOutput("commit_message", commitMessage);

  if (platform === "android") {
    const version = getAndroidVersion(rootPath);
    // eslint-disable-next-line no-console
    console.log(`Detected Android version: "${version}"`);
    const evaluation = await evaluateAndroid(
      isUp,
      version,
      rootPath,
      clientHolder.client,
    );
    const shouldBuild = forceBuild || evaluation.shouldBuild;
    const shouldUpdate = !forceBuild && evaluation.shouldUpdate;
    // eslint-disable-next-line no-console
    console.log(
      `Final Android evaluation -> should_build: ${shouldBuild}, should_update: ${shouldUpdate}, action: ${forceBuild ? "build" : evaluation.action}`,
    );
    setGithubOutput("should_build", shouldBuild);
    setGithubOutput("should_update", shouldUpdate);
    setGithubOutput("action", forceBuild ? "build" : evaluation.action);
    setGithubOutput("changed", shouldBuild || shouldUpdate);
  } else if (platform === "electron") {
    const version = getElectronVersion(rootPath);
    // eslint-disable-next-line no-console
    console.log(`Detected Electron version: "${version}"`);

    const [shouldBuildLinuxRaw, shouldBuildWindowsRaw] = await Promise.all([
      evaluateBuildType(isUp, "linux", version, rootPath, clientHolder.client),
      evaluateBuildType(
        isUp,
        "windows",
        version,
        rootPath,
        clientHolder.client,
      ),
    ]);

    const shouldBuildLinux = forceBuild || shouldBuildLinuxRaw;
    const shouldBuildWindows = forceBuild || shouldBuildWindowsRaw;
    const changed = shouldBuildLinux || shouldBuildWindows;

    const matrixInclude: Array<{ os: string; platform: string }> = [];
    if (shouldBuildLinux) {
      matrixInclude.push({ os: "ubuntu-latest", platform: "linux" });
    }
    if (shouldBuildWindows) {
      matrixInclude.push({ os: "windows-latest", platform: "windows" });
    }

    const matrixJson = JSON.stringify({ include: matrixInclude });

    // eslint-disable-next-line no-console
    console.log(
      `Final Electron outputs -> changed: ${changed}, build_linux: ${shouldBuildLinux}, build_windows: ${shouldBuildWindows}, matrix: ${matrixJson}`,
    );

    setGithubOutput("changed", changed);
    setGithubOutput("build_linux", shouldBuildLinux);
    setGithubOutput("build_windows", shouldBuildWindows);
    setGithubOutput("matrix", matrixJson);
    setGithubOutput("should_build", changed);
    setGithubOutput("should_update", false);
    setGithubOutput("action", changed ? "build" : "skip");
  } else if (platform === "linux" || platform === "windows") {
    const version = getElectronVersion(rootPath);
    // eslint-disable-next-line no-console
    console.log(`Detected ${platform} version: "${version}"`);

    const shouldBuildRaw = await evaluateBuildType(
      isUp,
      platform,
      version,
      rootPath,
      clientHolder.client,
    );
    const shouldBuild = forceBuild || shouldBuildRaw;

    // eslint-disable-next-line no-console
    console.log(`Final ${platform} should_build: ${shouldBuild}`);
    setGithubOutput("should_build", shouldBuild);
    setGithubOutput("should_update", false);
    setGithubOutput("action", shouldBuild ? "build" : "skip");
    setGithubOutput("changed", shouldBuild);
    setGithubOutput(`build_${platform}`, shouldBuild);

    const osName = platform === "linux" ? "ubuntu-latest" : "windows-latest";
    const matrixInclude = shouldBuild ? [{ os: osName, platform }] : [];
    setGithubOutput("matrix", JSON.stringify({ include: matrixInclude }));
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

