import type { TestResult, TestRoutes } from "./types";

/**
 * Validates if a value matches the expected matcher
 * @param actual - Actual value received
 * @param expected - Expected matcher or value
 * @returns true if matches, false otherwise
 */
const matchesExpectation = (actual: unknown, expected: unknown): boolean => {
  if (expected === null || expected === undefined) {
    return actual === expected;
  }

  if (typeof expected === "object" && expected !== null) {
    const expectObj = expected as Record<string, unknown>;

    // Handle expect.any() matcher
    if (expectObj.__type === "any") {
      const constructor = expectObj.constructor as () => unknown;
      if (constructor === String) return typeof actual === "string";
      if (constructor === Number) return typeof actual === "number";
      if (constructor === Boolean) return typeof actual === "boolean";
      if (constructor === Array) return Array.isArray(actual);
      if (constructor === Object)
        return typeof actual === "object" && actual !== null;
      return true;
    }

    // Handle expect.anything() matcher
    if (expectObj.__type === "anything") {
      return actual !== null && actual !== undefined;
    }

    // Handle expect.objectContaining() matcher
    if (expectObj.__type === "objectContaining") {
      if (typeof actual !== "object" || actual === null) return false;
      const actualObj = actual as Record<string, unknown>;
      const expectedProps = expectObj.obj as
        | Record<string, unknown>
        | Record<string, unknown>[];

      if (Array.isArray(expectedProps)) {
        return expectedProps.some((item) =>
          Array.isArray(actualObj)
            ? actualObj.some((el) => matchesExpectation(el, item))
            : matchesExpectation(actualObj, item),
        );
      }

      for (const [key, value] of Object.entries(expectedProps)) {
        if (!matchesExpectation(actualObj[key], value)) {
          return false;
        }
      }
      return true;
    }

    // Regular object comparison
    if (typeof actual !== "object" || actual === null) return false;
    const actualObj = actual as Record<string, unknown>;

    for (const [key, value] of Object.entries(expectObj)) {
      if (!matchesExpectation(actualObj[key], value)) {
        return false;
      }
    }
    return true;
  }

  return actual === expected;
};

/**
 * Validates a response against expected values
 * @param response - The actual response received
 * @param expectedResponse - Expected response structure
 * @param shouldSucceed - Whether the request should succeed
 * @returns Validation result with error message if failed
 */
export const validateResponse = async (
  status: number,
  response: unknown,
  expectedResponse: Record<string, unknown>,
  shouldSucceed: TestRoutes["GET"]["/cryptos/"][0]["shouldSucceed"],
): Promise<{ isValid: boolean; error?: string }> => {
  if (response === expectedResponse) return { isValid: true };

  if (typeof response !== "object" || response === null) {
    return {
      isValid: false,
      error: `Response is not an object. Received: ${JSON.stringify(response)}`,
    };
  }

  const responseObj = response as Record<string, unknown>;

  // Check for success indicators
  const hasSuccess = "success" in responseObj;
  const hasError = "error" in responseObj;

  // Validate success expectation
  if (typeof shouldSucceed === "boolean" && shouldSucceed) {
    // If response has success field, it should be true
    if (hasSuccess && responseObj.success !== true) {
      return {
        isValid: false,
        error: `Expected success: true, but got success: ${responseObj.success}. Error: ${responseObj.error || "none"}`,
      };
    }

    // If response has error field and it's defined, it should fail
    if (
      hasError &&
      responseObj.error !== undefined &&
      responseObj.error !== null
    ) {
      return {
        isValid: false,
        error: `Expected successful response but got error: ${responseObj.error}`,
      };
    }
  } else if (typeof shouldSucceed === "function") {
    const funcResult = await shouldSucceed(status, response);

    if (!funcResult) {
      return {
        isValid: false,
        error: `Custom success function returned false. Response: ${JSON.stringify(response)}`,
      };
    }
  } else {
    // Should fail
    // Either success should be false or error should be present
    const hasFailed =
      (hasSuccess && responseObj.success === false) ||
      (hasError &&
        responseObj.error !== undefined &&
        responseObj.error !== null);

    if (!hasFailed) {
      return {
        isValid: false,
        error: `Expected response to fail, but it succeeded. Response: ${JSON.stringify(response)}`,
      };
    }
  }

  // Validate expected fields
  for (const [key, expectedValue] of Object.entries(expectedResponse)) {
    const actualValue = responseObj[key];

    if (!matchesExpectation(actualValue, expectedValue)) {
      return {
        isValid: false,
        error: `Field '${key}' mismatch. Expected: ${JSON.stringify(expectedValue)}, Actual: ${JSON.stringify(actualValue)}`,
      };
    }
  }

  return { isValid: true };
};

/**
 * Throws an error with detailed information about the failed test
 * @param testResult - Result of the failed test
 */
export const throwTestError = (testResult: TestResult): never => {
  const errorMessage = `
|================================================================
| TEST FAILED
|================================================================
| Route: ${testResult.route}
| Description: ${testResult.description}
| Duration: ${testResult.duration}ms
|================================================================
| Error: ${testResult.error || "Unknown error"}
|================================================================
| Expected Response:
| ${JSON.stringify(testResult.expectedResponse, null, 2)
    .split("\n")
    .join("\n| ")}
|================================================================
| Actual Response:
| ${JSON.stringify(testResult.response, null, 2).split("\n").join("\n| ")}
|================================================================
  `.trim();

  throw new Error(errorMessage);
};

/**
 * Checks if response indicates a network or server error
 * @param response - The response to check
 * @returns true if there's a critical error
 */
export const hasCriticalError = (response: unknown): boolean => {
  if (typeof response !== "object" || response === null) {
    return true;
  }

  const responseObj = response as Record<string, unknown>;

  // Check for common error indicators
  if (responseObj.statusCode === 500) return true;
  if (responseObj.statusCode === 503) return true;
  if (responseObj.message && typeof responseObj.message === "string") {
    const msg = responseObj.message.toLowerCase();
    if (msg.includes("connection refused")) return true;
    if (msg.includes("timeout")) return true;
    if (msg.includes("network error")) return true;
  }

  return false;
};
