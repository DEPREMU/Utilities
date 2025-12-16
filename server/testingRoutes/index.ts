import {
  throwTestError,
  hasCriticalError,
  validateResponse,
} from "./validator.ts";
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

  console.log(`\n🧪 Testing route: ${route}`);
  console.log(`   Running ${tests.length} tests...\n`);

  for (const test of tests) {
    const method =
      test.route === "/health" || test.route === "/getRandomUUID"
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
      "authorization" in test ? test.authorization?.() : null,
    );

    results.push(result);

    if (result.success) {
      console.log(`   ✓ ${result.description} (${result.duration}ms)`);
    } else {
      console.log(`   ✗ ${result.description} (${result.duration}ms)`);
      console.log(`     Error: ${result.error}`);
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

  console.log(
    "╔════════════════════════════════════════════════════════════════",
  );
  console.log("║ 🚀 Starting API Test Suite");
  console.log(
    "╚════════════════════════════════════════════════════════════════\n",
  );

  const routes = Object.keys(routeTests) as RoutesAPI[];

  for (const route of routes) {
    const results = await executeRouteTests(route);
    allResults.push(...results);

    const failed = results.filter((r) => !r.success);
    if (failed.length > 0 && stopOnError) {
      console.log("\n❌ Stopping tests due to failure (stopOnError=true)\n");
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

  console.log(
    "\n|================================================================",
  );
  console.log("| Test Summary");
  console.log(
    "|================================================================",
  );
  console.log(`| Total Tests:    ${summary.total}`);
  console.log(`| Passed:         ${summary.passed}`);
  console.log(`| Failed:         ${summary.failed}`);
  console.log(
    `| Success Rate:   ${((passed / summary.total) * 100).toFixed(2)}%`,
  );
  console.log(`| Total Duration: ${summary.duration}ms`);
  console.log(
    "|================================================================\n",
  );

  if (failed > 0) {
    console.log("Some tests failed. See details above.\n");
    console.log("Failed tests:");
    allResults
      .filter((r) => !r.success)
      .forEach((r) => {
        console.log(`  * ${r.route} - ${r.description}`);
        console.log(`    Error: ${r.error}\n`);
      });
  } else {
    console.log("All tests passed!\n");
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

  console.log(
    "|================================================================",
  );
  console.log(`| 🚀 Testing Route: ${route}`);
  console.log(
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

  console.log(
    "\n|================================================================",
  );
  console.log("| Route Test Summary");
  console.log(
    "|================================================================",
  );
  console.log(`| Route:          ${route}`);
  console.log(`| Total Tests:    ${summary.total}`);
  console.log(`| Passed:         ${summary.passed}`);
  console.log(`| Failed:         ${summary.failed}`);
  console.log(
    `| Success Rate:   ${((passed / summary.total) * 100).toFixed(2)}%`,
  );
  console.log(`| Duration:       ${summary.duration}ms`);
  console.log(
    "|================================================================\n",
  );

  return summary;
};
