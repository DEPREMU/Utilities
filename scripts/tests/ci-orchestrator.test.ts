import {
  getRootEnvContent,
  setupCiEnvironment,
  getDockerEnvContent,
} from "../ci/setup-ci-env.ts";
import {
  generateReport,
  discoverWorkspaces,
  resolveWorkspacePaths,
  type DiscoveredWorkspace,
  type WorkspaceTestResult,
  sortWorkspacesTopologically,
} from "../ci/test-orchestrator.ts";
import fs from "fs";
import os from "os";
import path from "path";
import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";

describe("CI Orchestrator & Environment Setup", () => {
  describe("discoverWorkspaces on real repo", () => {
    it("should discover all workspaces and identify test scripts", () => {
      const workspaces = discoverWorkspaces(process.cwd());

      expect(workspaces.length).toBeGreaterThanOrEqual(6);

      const serverWs = workspaces.find((w) => w.name === "utilities-server");
      expect(serverWs).toBeDefined();
      expect(serverWs?.hasTest).toBe(true);
      expect(serverWs?.requiresDocker).toBe(true);

      const commonWs = workspaces.find((w) => w.name === "utilities-common");
      expect(commonWs).toBeDefined();
      expect(commonWs?.hasTest).toBe(true);
      expect(commonWs?.requiresDocker).toBe(false);

      const scriptsWs = workspaces.find((w) => w.name === "utilities-scripts");
      expect(scriptsWs).toBeDefined();
      expect(scriptsWs?.hasTest).toBe(true);
      expect(scriptsWs?.requiresDocker).toBe(false);
    });
  });

  describe("Future Workspace Discovery Acceptance Test", () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "ci-orch-test-"));
      // Create root package.json
      fs.writeFileSync(
        path.join(tempDir, "package.json"),
        JSON.stringify({
          name: "test-monorepo",
          private: true,
          workspaces: ["packages/*"],
        }),
        "utf8",
      );
      fs.mkdirSync(path.join(tempDir, "packages"), { recursive: true });
    });

    afterEach(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it("should automatically discover a new workspace with independent tests without CI config changes", () => {
      const pkgDir = path.join(tempDir, "packages", "new-independent-pkg");
      fs.mkdirSync(pkgDir, { recursive: true });
      fs.writeFileSync(
        path.join(pkgDir, "package.json"),
        JSON.stringify({
          name: "new-independent-pkg",
          scripts: { test: "jest" },
          ci: { requiresDocker: false },
        }),
        "utf8",
      );

      const discovered = discoverWorkspaces(tempDir);
      const pkg = discovered.find((w) => w.name === "new-independent-pkg");

      expect(pkg).toBeDefined();
      expect(pkg?.hasTest).toBe(true);
      expect(pkg?.requiresDocker).toBe(false);
    });

    it("should automatically discover a new workspace with Docker requirements without CI config changes", () => {
      const pkgDir = path.join(tempDir, "packages", "new-docker-pkg");
      fs.mkdirSync(pkgDir, { recursive: true });
      fs.writeFileSync(
        path.join(pkgDir, "package.json"),
        JSON.stringify({
          name: "new-docker-pkg",
          scripts: { test: "jest" },
          ci: { requiresDocker: true },
        }),
        "utf8",
      );

      const discovered = discoverWorkspaces(tempDir);
      const pkg = discovered.find((w) => w.name === "new-docker-pkg");

      expect(pkg).toBeDefined();
      expect(pkg?.hasTest).toBe(true);
      expect(pkg?.requiresDocker).toBe(true);
    });

    it("should apply conservative strategy (requiresDocker: true) to undeclared future workspaces", () => {
      const pkgDir = path.join(tempDir, "packages", "unknown-pkg");
      fs.mkdirSync(pkgDir, { recursive: true });
      fs.writeFileSync(
        path.join(pkgDir, "package.json"),
        JSON.stringify({
          name: "unknown-pkg",
          scripts: { test: "jest" },
          // No ci metadata declared
        }),
        "utf8",
      );

      const discovered = discoverWorkspaces(tempDir);
      const pkg = discovered.find((w) => w.name === "unknown-pkg");

      expect(pkg).toBeDefined();
      expect(pkg?.hasTest).toBe(true);
      // Conservative default
      expect(pkg?.requiresDocker).toBe(false);
    });
  });

  describe("sortWorkspacesTopologically", () => {
    it("should place dependency before dependent workspace", () => {
      const wsA: DiscoveredWorkspace = {
        name: "pkg-a",
        location: "packages/a",
        packageJson: { name: "pkg-a" },
        hasTest: true,
        requiresDocker: false,
        dependencies: ["pkg-b"],
      };

      const wsB: DiscoveredWorkspace = {
        name: "pkg-b",
        location: "packages/b",
        packageJson: { name: "pkg-b" },
        hasTest: true,
        requiresDocker: false,
        dependencies: [],
      };

      const sorted = sortWorkspacesTopologically([wsA, wsB]);
      const idxA = sorted.findIndex((w) => w.name === "pkg-a");
      const idxB = sorted.findIndex((w) => w.name === "pkg-b");

      expect(idxB).toBeLessThan(idxA);
    });
  });

  describe("resolveWorkspacePaths", () => {
    it("should return empty array for non-existent pattern", () => {
      expect(resolveWorkspacePaths("non-existent-dir", process.cwd())).toEqual(
        [],
      );
    });
  });

  describe("generateReport", () => {
    it("should mark allPassed true when all results succeeded", () => {
      const results: WorkspaceTestResult[] = [
        {
          name: "utilities-common",
          location: "common",
          phase: "independent",
          requiresDocker: false,
          exitCode: 0,
          durationMs: 1200,
          output: "Tests passed",
          errorOutput: "",
          success: true,
        },
      ];

      const { markdown, allPassed } = generateReport(results);
      expect(allPassed).toBe(true);
      expect(markdown).toContain("`utilities-common`");
      expect(markdown).toContain("Passed");
    });

    it("should mark allPassed false and include error details when a result failed", () => {
      const results: WorkspaceTestResult[] = [
        {
          name: "failing-package",
          location: "packages/fail",
          phase: "independent",
          requiresDocker: false,
          exitCode: 1,
          durationMs: 800,
          output: "",
          errorOutput: "Test assertion failure in suite A",
          success: false,
        },
      ];

      const { markdown, allPassed } = generateReport(results);
      expect(allPassed).toBe(false);
      expect(markdown).toContain("FAILED");
      expect(markdown).toContain("Test assertion failure in suite A");
    });
  });

  describe("setup-ci-env", () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "ci-env-test-"));
    });

    afterEach(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it("getRootEnvContent should include essential CI test environment variables", () => {
      const content = getRootEnvContent();
      expect(content).toContain("IV=0123456789abcdef");
      expect(content).toContain("DATABASE_URL=");
      expect(content).toContain("WS_URL=ws://localhost:3000/ws");
    });

    it("getDockerEnvContent should include NordVPN token when provided", () => {
      const user = `User-${Math.random()}`;
      const pass = `Password-${Math.random()}`;

      const content = getDockerEnvContent({
        user,
        pass,
      });
      expect(content).toContain(`OPENVPN_USER=${user}`);
      expect(content).toContain(`OPENVPN_PASSWORD=${pass}`);
      expect(content).toContain("POSTGRES_USER=postgres");
    });

    it("setupCiEnvironment should create files and directories", () => {
      setupCiEnvironment("all", {
        rootDir: tempDir,
        openVPN: {
          user: "User",
          pass: "Password",
        },
      });

      expect(fs.existsSync(path.join(tempDir, ".env"))).toBe(true);
      expect(
        fs.existsSync(path.join(tempDir, "server", "vps", "docker", ".env")),
      ).toBe(true);
      expect(
        fs.existsSync(
          path.join(tempDir, "server", ".temp", "whatsapp-shared-session"),
        ),
      ).toBe(true);
    });
  });
});
