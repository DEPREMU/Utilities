import {
  it,
  jest,
  expect,
  describe,
  afterEach,
  beforeEach,
} from "@jest/globals";

jest.mock("chalk", () => ({
  __esModule: true,
  default: {
    gray: (s: string) => s,
    cyan: (s: string) => s,
    green: { bold: (s: string) => s },
    yellow: { bold: (s: string) => s },
    red: { bold: (s: string) => s },
  },
  gray: (s: string) => s,
  cyan: (s: string) => s,
  green: { bold: (s: string) => s },
  yellow: { bold: (s: string) => s },
  red: { bold: (s: string) => s },
}));

import { Logger } from "@common";
import { REPLACERS } from "@REPLACERS";

describe("Server Logger", () => {
  let logSpy: jest.SpiedFunction<typeof Logger.pino.info>;
  let warnSpy: jest.SpiedFunction<typeof Logger.pino.warn>;
  let errorSpy: jest.SpiedFunction<typeof Logger.pino.error>;

  beforeEach(() => {
    logSpy = jest.spyOn(Logger.pino, "info").mockImplementation(() => {});
    warnSpy = jest.spyOn(Logger.pino, "warn").mockImplementation(() => {});
    errorSpy = jest.spyOn(Logger.pino, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  describe("Logging Methods & Formatting", () => {
    it("should log info messages with bracketed format and module name", () => {
      const logger = new Logger("Auth");
      logger.log("User logged in");

      expect(logSpy).toHaveBeenCalledTimes(1);
      const output = logSpy.mock.calls[0][0];
      expect(output).toContain("[Auth]");
      expect(output).toContain("[LOG]");
      expect(output).toContain("User logged in");
    });

    it("should log warning messages with bracketed format", () => {
      const logger = new Logger("Database");
      logger.warn("Slow query detected");

      expect(warnSpy).toHaveBeenCalledTimes(1);
      const output = warnSpy.mock.calls[0][0];
      expect(output).toContain("[Database]");
      expect(output).toContain("[WARN]");
      expect(output).toContain("Slow query detected");
    });

    it("should log error messages with bracketed format", () => {
      const logger = new Logger("WebSocket");
      logger.error("Connection failed");

      expect(errorSpy).toHaveBeenCalledTimes(1);
      const output = errorSpy.mock.calls[0][0];
      expect(output).toContain("[WebSocket]");
      expect(output).toContain("[ERROR]");
      expect(output).toContain("Connection failed");
    });
  });

  describe("Interceptors", () => {
    it("should invoke registered interceptors and respect skip return", () => {
      const intercepted: { type: string; msg: string }[] = [];
      Logger.addInterceptor((type, msg) => {
        intercepted.push({ type, msg });
        return true;
      });

      const logger = new Logger("TestInterception");
      logger.log("Hello interceptor");

      expect(intercepted.length).toBeGreaterThan(0);
      const last = intercepted[intercepted.length - 1];
      expect(last.type).toBe("log");
      expect(last.msg).toContain("[TestInterception]");
      expect(last.msg).toContain("Hello interceptor");
      expect(logSpy).not.toHaveBeenCalled();
    });
  });

  describe("Secret Masking", () => {
    it("should return full value in dev mode", () => {
      const originalIsDev = REPLACERS.isDev;
      (REPLACERS as { isDev: boolean }).isDev = true;

      const logger = new Logger("DevTest");
      expect(logger.secret("my-super-secret")).toBe("my-super-secret");
      expect(logger.secret("token")).toBe("token");

      (REPLACERS as { isDev: boolean }).isDev = originalIsDev;
    });

    it("should mask values correctly in non-dev mode", () => {
      const originalIsDev = REPLACERS.isDev;
      (REPLACERS as { isDev: boolean }).isDev = false;

      const logger = new Logger("ProdTest");

      expect(logger.secret(null)).toBe("***");
      expect(logger.secret(undefined)).toBe("***");
      expect(logger.secret("")).toBe("***");
      expect(logger.secret("a")).toBe("***");
      expect(logger.secret("ab")).toBe("a***");
      expect(logger.secret("token")).toBe("tok***");
      expect(logger.secret("abcdef")).toBe("abc***");
      expect(logger.secret("user@example.com")).toBe("use***com");
      expect(logger.secret(12345678)).toBe("123***678");

      (REPLACERS as { isDev: boolean }).isDev = originalIsDev;
    });
  });
});
