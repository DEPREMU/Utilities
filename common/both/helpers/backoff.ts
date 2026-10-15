import type { ExponentialBackoffOptions } from "@types";

const DEFAULT_JITTER = 0.1;
const DEFAULT_MAX_DELAY = 30000;
const DEFAULT_MULTIPLIER = 1.5;
const DEFAULT_INITIAL_DELAY = 1000;

/**
 * Calculates exponential backoff delay with proportional jitter.
 *
 * @param attempt - The zero-indexed consecutive attempt count.
 * @param options - Backoff tuning parameters (initialDelay, maxDelay, multiplier, jitter).
 * @returns The calculated delay in milliseconds.
 */
export const calculateExponentialBackoff = (
  attempt: number,
  options?: ExponentialBackoffOptions,
): number => {
  const {
    jitter = DEFAULT_JITTER,
    maxDelay = DEFAULT_MAX_DELAY,
    multiplier = DEFAULT_MULTIPLIER,
    initialDelay = DEFAULT_INITIAL_DELAY,
  } = options || {};

  const safeAttempt = Math.max(0, Math.floor(attempt));
  const rawDelay = initialDelay * Math.pow(multiplier, safeAttempt);
  const boundedDelay = Math.min(maxDelay, rawDelay);

  if (jitter <= 0) return Math.round(boundedDelay);

  const jitterOffset = (Math.random() * 2 - 1) * jitter;
  const jitteredDelay = boundedDelay * (1 + jitterOffset);

  return Math.max(initialDelay, Math.round(jitteredDelay));
};
