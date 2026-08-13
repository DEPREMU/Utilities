import {
  throwTestError,
  hasCriticalError,
  validateResponse,
} from "./validator.ts";
import { user } from "../utils";
import { testCases } from "./testCases.ts";
import { MethodsAPI } from "@types";
import { Helper, Logger, ServerFetch, Timers } from "@common";
import { TestResult, TestRoutes, TestSummary } from "./types.ts";

const LOG = false;

/**
 * Executes a single test case
 * @param route - API route to test
 * @param description - Test description
 * @param body - Request body
 * @param method - HTTP method
 * @param expectedResponse - Expected response structure
 * @param shouldSucceed - Whether the request should succeed
 * @returns Test result
 */
const executeTest = async (
  route: RoutesAPI[keyof RoutesAPI],
  description: string,
  body: unknown,
  method: MethodsAPI,
  expectedResponse: Record<string, unknown>,
  shouldSucceed: TestRoutes["GET"]["/cryptos/"][0]["shouldSucceed"],
  authorizationToken: string | null,
): Promise<TestResult> => {
  const startTime = Date.now();

  try {
    const response = await ServerFetch.server(
      method,
      route,
      body as never,
      authorizationToken as never,
    );

    const duration = Date.now() - startTime;

    if (hasCriticalError(response)) {
      return {
        route,
        duration,
        response: response.data,
        description,
        expectedResponse,
        error: "Critical server or network error detected",
        success: false,
      };
    }

    const validation = await validateResponse(
      response.status,
      response.data,
      expectedResponse,
      shouldSucceed,
    );

    return {
      route,
      response: response.data,
      duration,
      description,
      expectedResponse,
      error: validation.error,
      success: validation.isValid,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      route,
      duration,
      description,
      expectedResponse,
      error: error instanceof Error ? error.message : String(error),
      success: false,
    };
  }
};

const executeRouteTests = async <M extends MethodsAPI>(
  method: M,
  route: RoutesAPI[M],
): Promise<TestResult[]> => {
  const tests = testCases[method][route] || [];
  const results: TestResult[] = [];

  if (LOG) {
    Logger.log(`\nTesting route: ${route}`);
    Logger.log(`   Running ${tests.length} tests...\n`);
  }

  for (const test of tests) {
    const resolvedBody =
      typeof test.requestInput === "function"
        ? await test.requestInput()
        : test.requestInput;

    const result = await executeTest(
      route,
      test.description,
      resolvedBody,
      method,
      test.expectedResponse as Record<string, unknown>,
      test.shouldSucceed as never,
      test.auth
        ? typeof test.auth === "function"
          ? await test.auth()
          : test.auth
        : null,
    );

    results.push(result);

    if (LOG) {
      if (result.success) {
        Logger.log(`   ✓ ${result.description} (${result.duration}ms)`);
      } else {
        Logger.log(`   ✗ ${result.description} (${result.duration}ms)`);
        Logger.log(`     Error: ${result.error}`);
      }
    }

    if (result.success) {
      await test.onFinish?.(result.response || null);
    }
  }

  return results;
};

/**
 * Executes all test suites
 * @param stopOnError - Whether to stop execution on first error
 * @returns Test summary
 */
export const runAllTests = async (
  stopOnError = false,
): Promise<TestSummary> => {
  await Promise.all([Timers.sleep(1000), user.initUserData()]);

  const startTime = Date.now();
  const allResults: TestResult[] = [];

  if (LOG) {
    Logger.log(
      "╔════════════════════════════════════════════════════════════════",
    );
    Logger.log("║ 🚀 Starting API Test Suite");
    Logger.log(
      "╚════════════════════════════════════════════════════════════════\n",
    );
  }

  for (const method in testCases) {
    const routes = Helper.Object.keys(testCases[method as "GET"]);

    for (const route of routes) {
      const results = await executeRouteTests(method as "GET", route);
      allResults.push(...results);

      const failed = results.filter((r) => !r.success);
      if (failed.length > 0 && stopOnError) {
        Logger.log("\n❌ Stopping tests due to failure (stopOnError=true)\n");
        throwTestError(failed[0]);
      }
    }
  }

  const duration = Date.now() - startTime;
  const passed = allResults.filter((r) => r.success).length;
  const failed = allResults.filter((r) => !r.success).length;

  const summary: TestSummary = {
    total: allResults.length,
    passed,
    failed,
    duration,
    results: allResults,
  };

  if (LOG) {
    Logger.log(
      "\n|================================================================",
    );
    Logger.log("| Test Summary");
    Logger.log(
      "|================================================================",
    );
    Logger.log(`| Total Tests:    ${summary.total}`);
    Logger.log(`| Passed:         ${summary.passed}`);
    Logger.log(`| Failed:         ${summary.failed}`);
    Logger.log(
      `| Success Rate:   ${((passed / summary.total) * 100).toFixed(2)}%`,
    );
    Logger.log(`| Total Duration: ${summary.duration}ms`);
    Logger.log(
      "|================================================================\n",
    );
  }

  if (failed > 0) {
    Logger.log("Some tests failed. See details above.\n");
    Logger.log("Failed tests:");
    allResults
      .filter((r) => !r.success)
      .forEach((r) => {
        Logger.log(`  * ${r.route} - ${r.description}`);
        Logger.log(`    Error: ${r.error}\n`);
      });
  } else {
    Logger.log("All tests passed!\n");
  }

  return summary;
};

/**
 * Executes tests for a specific route
 * @param route - Route to test
 * @param stopOnError - Whether to stop on first error
 * @returns Test summary for the route
 */
export const runRouteTests = async <M extends MethodsAPI>(
  method: M,
  route: RoutesAPI[M],
  stopOnError = false,
): Promise<TestSummary> => {
  const startTime = Date.now();

  Logger.log(
    "|================================================================",
  );
  Logger.log(`| 🚀 Testing Route: ${route}`);
  Logger.log(
    "|================================================================",
  );

  const results = await executeRouteTests(method, route);

  if (stopOnError) {
    const failed = results.find((r) => !r.success);
    if (failed) throwTestError(failed);
  }

  const duration = Date.now() - startTime;
  const passed = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  const summary: TestSummary = {
    total: results.length,
    passed,
    failed,
    duration,
    results,
  };

  Logger.log(
    "\n|================================================================",
  );
  Logger.log("| Route Test Summary");
  Logger.log(
    "|================================================================",
  );
  Logger.log(`| Route:          ${route}`);
  Logger.log(`| Total Tests:    ${summary.total}`);
  Logger.log(`| Passed:         ${summary.passed}`);
  Logger.log(`| Failed:         ${summary.failed}`);
  Logger.log(
    `| Success Rate:   ${((passed / summary.total) * 100).toFixed(2)}%`,
  );
  Logger.log(`| Duration:       ${summary.duration}ms`);
  Logger.log(
    "|================================================================\n",
  );

  return summary;
};
