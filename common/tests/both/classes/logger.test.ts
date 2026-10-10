import {
  test,
  jest,
  expect,
  describe,
  afterEach,
  beforeEach,
} from "@jest/globals";
import chalk from "chalk";
import { Helper } from "../../../both/helpers";
import { Logger } from "../../../serverOrElectron/logger";

describe("Logger & Helper.stripAnsi", () => {
  describe("Helper.stripAnsi", () => {
    test("strips standard ANSI escape sequences from colored text", () => {
      const colored = chalk.green("Redis connected successfully");
      const stripped = Helper.stripAnsi(colored);
      expect(stripped).toBe("Redis connected successfully");
    });

    test("preserves legitimate brackets and non-ANSI tokens", () => {
      const text = "[19:43:36] [auth] DownDetector: 51766 [count: 42]";
      const stripped = Helper.stripAnsi(text);
      expect(stripped).toBe(text);
    });

    test("strips multi-color nested strings leaving clean plain text", () => {
      const multiColor = `${chalk.white("[19:43:36]")} ${chalk.green("INFO:")} ${chalk.blue("DownDetector: 51766")}`;
      const stripped = Helper.stripAnsi(multiColor);
      expect(stripped).toBe("[19:43:36] INFO: DownDetector: 51766");
    });
  });

  describe("Logger formatting and interceptors", () => {
    let logSpy: jest.SpiedFunction<typeof console.log>;
    let warnSpy: jest.SpiedFunction<typeof console.warn>;
    let errorSpy: jest.SpiedFunction<typeof console.error>;

    beforeEach(() => {
      logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
      warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
      errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
      logSpy.mockRestore();
      warnSpy.mockRestore();
      errorSpy.mockRestore();
    });

    test("logs info message preserving caller-provided colored message", () => {
      const message = chalk.green("Redis connected successfully");
      Logger.log(message);

      expect(logSpy).toHaveBeenCalledTimes(1);
      const callArgs = logSpy.mock.calls[0];
      const joinedOutput = callArgs.join(" ");

      expect(Helper.stripAnsi(joinedOutput)).toContain("INFO:");
      expect(Helper.stripAnsi(joinedOutput)).toContain(
        "Redis connected successfully",
      );
      expect(joinedOutput).toContain(message);
    });

    test("logs warn message with WARN prefix", () => {
      const message = chalk.yellow("Warning message");
      Logger.warn(message);

      expect(warnSpy).toHaveBeenCalledTimes(1);
      const callArgs = warnSpy.mock.calls[0];
      const joinedOutput = callArgs.join(" ");

      expect(Helper.stripAnsi(joinedOutput)).toContain("WARN:");
      expect(joinedOutput).toContain(message);
    });

    test("logs error message with ERROR prefix", () => {
      const message = chalk.red("Error message");
      Logger.error(message);

      expect(errorSpy).toHaveBeenCalledTimes(1);
      const callArgs = errorSpy.mock.calls[0];
      const joinedOutput = callArgs.join(" ");

      expect(Helper.stripAnsi(joinedOutput)).toContain("ERROR:");
      expect(joinedOutput).toContain(message);
    });

    test("suppresses console output when an interceptor returns true", () => {
      const interceptor = jest.fn((type: string, msg: string) => {
        return msg.includes("suppress-me");
      });
      Logger.addInterceptor(interceptor);

      Logger.log("suppress-me test");
      expect(interceptor).toHaveBeenCalledWith("log", "suppress-me test");
      expect(logSpy).not.toHaveBeenCalled();

      Logger.log("allow-me test");
      expect(logSpy).toHaveBeenCalledTimes(1);
    });
  });
});
