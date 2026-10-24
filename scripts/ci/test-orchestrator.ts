import fs from "fs";
import path from "path";
import { spawn, execSync } from "child_process";

export type WorkspacePackageJson = {
  name: string;
  version?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  ci?: {
    requiresDocker?: boolean;
    timeoutMinutes?: number;
  };
};

export type DiscoveredWorkspace = {
  name: string;
  location: string;
  packageJson: WorkspacePackageJson;
  hasTest: boolean;
  requiresDocker: boolean;
  dependencies: string[];
};

export type WorkspaceTestResult = {
  name: string;
  location: string;
  phase: "independent" | "dependent";
  requiresDocker: boolean;
  exitCode: number;
  durationMs: number;
  output: string;
  errorOutput: string;
  success: boolean;
};

export const resolveWorkspacePaths = (
  pattern: string,
  rootDir: string,
): string[] => {
  if (!pattern.includes("*")) {
    const fullPath = path.join(rootDir, pattern);
    if (
      fs.existsSync(fullPath) &&
      fs.statSync(fullPath).isDirectory() &&
      fs.existsSync(path.join(fullPath, "package.json"))
    ) {
      return [pattern];
    }
    return [];
  }

  const prefix = pattern.replace(/\/\*.*$/, "");
  const baseDir = path.join(rootDir, prefix);
  if (!fs.existsSync(baseDir) || !fs.statSync(baseDir).isDirectory()) {
    return [];
  }

  const entries = fs.readdirSync(baseDir);
  const matched: string[] = [];
  for (const entry of entries) {
    const itemPath = path.join(baseDir, entry);
    if (
      fs.statSync(itemPath).isDirectory() &&
      fs.existsSync(path.join(itemPath, "package.json"))
    ) {
      matched.push(path.join(prefix, entry).replace(/\\/g, "/"));
    }
  }

  return matched;
};

export const findMonorepoRoot = (startDir = process.cwd()): string => {
  let curr = path.resolve(startDir);
  while (curr) {
    const pkgPath = path.join(curr, "package.json");
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8")) as {
          workspaces?: unknown;
        };
        if (pkg.workspaces) {
          return curr;
        }
      } catch {
        // Continue searching upward
      }
    }
    const parent = path.dirname(curr);
    if (parent === curr) break;
    curr = parent;
  }
  return startDir;
};

export const discoverWorkspaces = (
  inputRootDir = process.cwd(),
): DiscoveredWorkspace[] => {
  const rootDir = findMonorepoRoot(inputRootDir);
  const rootPkgPath = path.join(rootDir, "package.json");
  if (!fs.existsSync(rootPkgPath)) {
    throw new Error(`Root package.json not found at: ${rootPkgPath}`);
  }

  const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, "utf8")) as {
    workspaces?: string[] | { packages?: string[] };
  };

  const patterns = Array.isArray(rootPkg.workspaces)
    ? rootPkg.workspaces
    : rootPkg.workspaces?.packages || [];

  const locations = new Set<string>();
  for (const pattern of patterns) {
    const resolved = resolveWorkspacePaths(pattern, rootDir);
    resolved.forEach((loc) => locations.add(loc));
  }

  const rawWorkspaces: Array<{
    name: string;
    location: string;
    packageJson: WorkspacePackageJson;
    allDeps: string[];
  }> = [];

  for (const location of locations) {
    const pkgPath = path.join(rootDir, location, "package.json");
    if (!fs.existsSync(pkgPath)) continue;

    try {
      const pkg = JSON.parse(
        fs.readFileSync(pkgPath, "utf8"),
      ) as WorkspacePackageJson;
      const allDeps = [
        ...Object.keys(pkg.dependencies || {}),
        ...Object.keys(pkg.devDependencies || {}),
      ];

      rawWorkspaces.push({
        name: pkg.name,
        location,
        packageJson: pkg,
        allDeps,
      });
    } catch {
      // Ignore corrupted package.json
    }
  }

  const workspaceNames = new Set(rawWorkspaces.map((w) => w.name));

  const workspaces: DiscoveredWorkspace[] = rawWorkspaces.map((item) => {
    const hasTest = Boolean(item.packageJson.scripts?.test);
    const internalDeps = item.allDeps.filter((dep) => workspaceNames.has(dep));

    let requiresDocker: boolean;
    if (typeof item.packageJson.ci?.requiresDocker === "boolean") {
      requiresDocker = item.packageJson.ci.requiresDocker;
    } else {
      requiresDocker = false;
    }

    return {
      name: item.name,
      location: item.location,
      packageJson: item.packageJson,
      hasTest,
      requiresDocker,
      dependencies: internalDeps,
    };
  });

  return workspaces;
};

export const sortWorkspacesTopologically = (
  workspaces: DiscoveredWorkspace[],
): DiscoveredWorkspace[] => {
  const byName = new Map(workspaces.map((w) => [w.name, w]));
  const visited = new Set<string>();
  const sorted: DiscoveredWorkspace[] = [];

  const visit = (w: DiscoveredWorkspace): void => {
    if (visited.has(w.name)) return;
    visited.add(w.name);

    for (const depName of w.dependencies) {
      const dep = byName.get(depName);
      if (dep) {
        visit(dep);
      }
    }

    sorted.push(w);
  };

  workspaces.forEach((w) => visit(w));
  return sorted;
};

export const runSingleWorkspaceTest = async (
  workspace: DiscoveredWorkspace,
  phase: "independent" | "dependent",
  rootDir = process.cwd(),
): Promise<WorkspaceTestResult> => {
  const startTime = Date.now();
  let output = "";
  let errorOutput = "";

  return new Promise((resolve) => {
    const isWindows = process.platform === "win32";
    const child = spawn(
      isWindows ? "yarn.cmd" : "yarn",
      ["workspace", workspace.name, "run", "test"],
      {
        cwd: rootDir,
        shell: isWindows,
        env: {
          ...process.env,
          CI: "true",
        },
      },
    );

    child.stdout.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      output += text;
      process.stdout.write(`[${workspace.name}] ${text}`);
    });

    child.stderr.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      errorOutput += text;
      process.stderr.write(`[${workspace.name}] ${text}`);
    });

    child.on("close", (code: number | null) => {
      const durationMs = Date.now() - startTime;
      const exitCode = code ?? 0;
      resolve({
        name: workspace.name,
        location: workspace.location,
        phase,
        requiresDocker: workspace.requiresDocker,
        exitCode,
        durationMs,
        output,
        errorOutput,
        success: exitCode === 0,
      });
    });

    child.on("error", (err: Error) => {
      const durationMs = Date.now() - startTime;
      resolve({
        name: workspace.name,
        location: workspace.location,
        phase,
        requiresDocker: workspace.requiresDocker,
        exitCode: 1,
        durationMs,
        output,
        errorOutput: errorOutput + "\n" + err.message,
        success: false,
      });
    });
  });
};

export const getResultsFilePath = (rootDir = process.cwd()): string => {
  const dir = path.join(rootDir, ".temp");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return path.join(dir, "ci-test-results.json");
};

export const loadSavedResults = (
  rootDir = process.cwd(),
): WorkspaceTestResult[] => {
  const filePath = getResultsFilePath(rootDir);
  if (!fs.existsSync(filePath)) return [];
  try {
    return JSON.parse(
      fs.readFileSync(filePath, "utf8"),
    ) as WorkspaceTestResult[];
  } catch {
    return [];
  }
};

export const saveResults = (
  newResults: WorkspaceTestResult[],
  rootDir = process.cwd(),
): void => {
  const existing = loadSavedResults(rootDir);
  const byName = new Map<string, WorkspaceTestResult>();

  existing.forEach((r) => byName.set(r.name, r));
  newResults.forEach((r) => byName.set(r.name, r));

  const merged = Array.from(byName.values());
  fs.writeFileSync(
    getResultsFilePath(rootDir),
    JSON.stringify(merged, null, 2),
    "utf8",
  );
};

export const generateReport = (
  results: WorkspaceTestResult[],
): { markdown: string; allPassed: boolean } => {
  const allPassed = results.every((r) => r.success);

  let md = "## CI Workspace Test Results\n\n";
  md += "| Workspace | Category | Duration | Status |\n";
  md += "| :--- | :--- | :--- | :--- |\n";

  for (const res of results) {
    const statusIcon = res.success ? "Passed" : "FAILED";
    const category = res.requiresDocker ? "Docker-dependent" : "Independent";
    const duration = `${(res.durationMs / 1000).toFixed(2)}s`;
    md += `| \`${res.name}\` | ${category} | ${duration} | ${statusIcon} |\n`;
  }

  md += "\n";
  if (!allPassed) {
    md += "### Failures\n\n";
    for (const res of results.filter((r) => !r.success)) {
      md += `#### ${res.name} (exit code ${res.exitCode})\n\`\`\`\n${res.errorOutput || res.output || "No output"}\n\`\`\`\n\n`;
    }
  }

  return { markdown: md, allPassed };
};

export const ensurePrismaClient = (rootDir: string): void => {
  const prismaClientDir = path.join(rootDir, "server", "generated", "prisma");
  if (!fs.existsSync(prismaClientDir)) {
    // eslint-disable-next-line no-console
    console.log(
      "[test-orchestrator] Prisma client not detected. Generating Prisma client...",
    );
    try {
      execSync("yarn workspace utilities-server run db-generate", {
        cwd: rootDir,
        stdio: "inherit",
        env: {
          ...process.env,
          DATABASE_URL:
            process.env.DATABASE_URL ||
            "postgresql://postgres:postgres@localhost:5432/UtilitiesDB?schema=public",
        },
      });
      // eslint-disable-next-line no-console
      console.log("[test-orchestrator] Prisma client generated successfully.");
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(
        "[test-orchestrator] Warning: Failed to generate Prisma client:",
        err,
      );
    }
  }
};

export const runOrchestrator = async (): Promise<void> => {
  const args = process.argv.slice(2);
  let phase: "independent" | "dependent" | "report" | "all" = "all";

  for (const arg of args) {
    if (arg.startsWith("--phase=")) {
      const val = arg.split("=")[1].toLowerCase();
      if (
        val === "independent" ||
        val === "dependent" ||
        val === "report" ||
        val === "all"
      ) {
        phase = val;
      }
    }
  }

  const rootDir = process.cwd();
  const allWorkspaces = discoverWorkspaces(rootDir);
  const testableWorkspaces = allWorkspaces.filter((w) => w.hasTest);

  // eslint-disable-next-line no-console
  console.log(
    `[test-orchestrator] Discovered ${allWorkspaces.length} workspaces (${testableWorkspaces.length} with test scripts)`,
  );

  if (phase === "report") {
    const saved = loadSavedResults(rootDir);
    const { markdown, allPassed } = generateReport(saved);
    // eslint-disable-next-line no-console
    console.log(markdown);

    if (process.env.GITHUB_STEP_SUMMARY) {
      fs.appendFileSync(
        process.env.GITHUB_STEP_SUMMARY,
        markdown + "\n",
        "utf8",
      );
    }

    if (!allPassed) {
      process.exit(1);
    }
    return;
  }

  ensurePrismaClient(rootDir);

  const independent = testableWorkspaces.filter((w) => !w.requiresDocker);
  const dependent = testableWorkspaces.filter((w) => w.requiresDocker);

  const results: WorkspaceTestResult[] = [];

  if (phase === "independent" || phase === "all") {
    // eslint-disable-next-line no-console
    console.log(
      `[test-orchestrator] Running ${independent.length} independent workspace tests concurrently...`,
    );
    const independentSorted = sortWorkspacesTopologically(independent);
    const independentResults = await Promise.all(
      independentSorted.map((w) =>
        runSingleWorkspaceTest(w, "independent", rootDir),
      ),
    );
    results.push(...independentResults);
    saveResults(independentResults, rootDir);
  }

  if (phase === "dependent" || phase === "all") {
    // eslint-disable-next-line no-console
    console.log(
      `[test-orchestrator] Running ${dependent.length} Docker-dependent workspace tests...`,
    );
    const dependentSorted = sortWorkspacesTopologically(dependent);
    for (const w of dependentSorted) {
      const res = await runSingleWorkspaceTest(w, "dependent", rootDir);
      results.push(res);
      saveResults([res], rootDir);
    }
  }

  if (phase === "all") {
    const { markdown, allPassed } = generateReport(results);
    // eslint-disable-next-line no-console
    console.log(markdown);

    if (process.env.GITHUB_STEP_SUMMARY) {
      fs.appendFileSync(
        process.env.GITHUB_STEP_SUMMARY,
        markdown + "\n",
        "utf8",
      );
    }

    if (!allPassed) {
      process.exit(1);
    }
  }
};

if (process.env.NODE_ENV !== "test") {
  runOrchestrator().catch((err) => {
    // eslint-disable-next-line no-console
    console.error("[test-orchestrator] Fatal error:", err);
    process.exit(1);
  });
}
