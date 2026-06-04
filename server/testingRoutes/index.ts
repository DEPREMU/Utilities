import {
  throwTestError,
  hasCriticalError,
  validateResponse,
} from "./validator.ts";
import { Logger } from "@common";
import { routeTests } from "./testCases.ts";
import { makeRequest } from "./utils.ts";
import { TestResult, TestSummary } from "./types.ts";
import { MethodsAvailableInAPI, RoutesAPI } from "@types";

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
  route: RoutesAPI,
  description: string,
  body: unknown,
  method: MethodsAvailableInAPI[keyof MethodsAvailableInAPI],
  expectedResponse: Record<string, unknown>,
  shouldSucceed: boolean,
  authorizationToken: string | null,
): Promise<TestResult> => {
  const startTime = Date.now();

  try {
    const response = await makeRequest(
      route,
      method,
      body,
      authorizationToken
        ? { Authorization: `Bearer ${authorizationToken}` }
        : undefined,
    );
    const duration = Date.now() - startTime;

    if (hasCriticalError(response)) {
      return {
        route,
        description,
        success: false,
        error: "Critical server or network error detected",
        response,
        expectedResponse,
        duration,
      };
    }

    const validation = validateResponse(
      response,
      expectedResponse,
      shouldSucceed,
    );

    return {
      route,
      description,
      success: validation.isValid,
      error: validation.error,
      response,
      expectedResponse,
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      route,
      description,
      success: false,
      error: error instanceof Error ? error.message : String(error),
      expectedResponse,
      duration,
    };
  }
};

/**
 * Executes all tests for a specific route
 * @param route - Route to test
 * @returns Array of test results
 */
const executeRouteTests = async (route: RoutesAPI): Promise<TestResult[]> => {
  const tests = routeTests[route];
  const results: TestResult[] = [];

  Logger.log(`\nTesting route: ${route}`);
  Logger.log(`   Running ${tests.length} tests...\n`);

  for (const test of tests) {
    const method =
      test.route === "/health"
        ? "get"
        : test.route.includes("/database/update")
          ? "put"
          : "post";

    const resolvedBody =
      typeof test.body === "function" ? await test.body() : test.body;

    const result = await executeTest(
      test.route,
      test.description,
      resolvedBody,
      method,
      test.expectedResponse as Record<string, unknown>,
      test.shouldSucceed,
      "authorization" in test ? test.authorization?.() || null : null,
    );

    results.push(result);

    if (result.success) {
      Logger.log(`   ✓ ${result.description} (${result.duration}ms)`);
    } else {
      Logger.log(`   ✗ ${result.description} (${result.duration}ms)`);
      Logger.log(`     Error: ${result.error}`);
    }

    if (result.success) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await test.onSuccess?.((result.response as any) || null);
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
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const startTime = Date.now();
  const allResults: TestResult[] = [];

  Logger.log(
    "╔════════════════════════════════════════════════════════════════",
  );
  Logger.log("║ 🚀 Starting API Test Suite");
  Logger.log(
    "╚════════════════════════════════════════════════════════════════\n",
  );

  const routes = Object.keys(routeTests) as RoutesAPI[];

  for (const route of routes) {
    const results = await executeRouteTests(route);
    allResults.push(...results);

    const failed = results.filter((r) => !r.success);
    if (failed.length > 0 && stopOnError) {
      Logger.log("\n❌ Stopping tests due to failure (stopOnError=true)\n");
      throwTestError(failed[0]);
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
export const runRouteTests = async (
  route: RoutesAPI,
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

  const results = await executeRouteTests(route);

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
