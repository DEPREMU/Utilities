import { getRedisClient } from "../redis/client";

export const DEFAULT_GUEST_DAILY_QUOTA = 5;
export const DEFAULT_LINKED_DAILY_QUOTA = 50;
export const DEFAULT_MAX_PER_MINUTE = 6;
export const QUOTA_TTL_SECONDS = 172800;

const LUA_ATOMIC_QUOTA = `
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local ttl = tonumber(ARGV[2])

local current = tonumber(redis.call('get', key) or '0')
if current >= limit then
  return { 0, current }
else
  local nextVal = redis.call('incr', key)
  if nextVal == 1 then
    redis.call('expire', key, ttl)
  end
  return { 1, nextVal }
end
`;

/**
 * Computes today's calendar date string in YYYY-MM-DD UTC format.
 *
 * @returns Current date string
 */
export const getUtcDateKey = (): string => {
  return new Date().toISOString().split("T")[0];
};

/**
 * Computes the remaining seconds until next midnight UTC.
 *
 * @returns Seconds until next UTC midnight
 */
export const getSecondsUntilMidnightUtc = (): number => {
  const now = new Date();
  const nextMidnight = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1,
      0,
      0,
      0,
      0,
    ),
  );
  return Math.max(1, Math.floor((nextMidnight.getTime() - now.getTime()) / 1000));
};

/**
 * Checks and increments sliding-window per-minute rate limit for a sender.
 *
 * @param senderId - Unique identifier of the WhatsApp sender
 * @param maxPerMinute - Maximum allowed requests in a 60-second window
 * @returns Promise resolving to true if under limit, false if rate-limited
 */
export const checkRateLimit = async (
  senderId: string,
  maxPerMinute: number = DEFAULT_MAX_PER_MINUTE,
): Promise<boolean> => {
  const redis = getRedisClient();
  const key = `wpp:ratelimit:${senderId}`;

  const current = await redis.incr(key);
  if (current === 1) {
    await redis.expire(key, 60);
  }

  return current <= maxPerMinute;
};

/**
 * Atomically evaluates and consumes one unit of a user or guest daily quota.
 *
 * @param identifier - Sender identifier (userId or guest WhatsApp JID)
 * @param limit - Maximum allowed conversions for today
 * @returns Promise resolving to allowance status, consumed count, and remaining quota
 */
export const consumeDailyQuota = async (
  identifier: string,
  limit: number,
): Promise<{ allowed: boolean; consumed: number; remaining: number }> => {
  const redis = getRedisClient();
  const dateKey = getUtcDateKey();
  const key = `wpp:quota:daily:${dateKey}:${identifier}`;

  const result = (await redis.eval(
    LUA_ATOMIC_QUOTA,
    1,
    key,
    limit,
    QUOTA_TTL_SECONDS,
  )) as [number, number];

  const allowed = result[0] === 1;
  const consumed = result[1];
  const remaining = Math.max(0, limit - consumed);

  return {
    allowed,
    consumed,
    remaining,
  };
};

/**
 * Retrieves current daily quota consumption and reset timing without incrementing.
 *
 * @param identifier - Sender identifier (userId or guest WhatsApp JID)
 * @param limit - Configured daily limit
 * @returns Promise resolving to consumed, remaining, and reset timestamp
 */
export const getDailyQuotaStatus = async (
  identifier: string,
  limit: number,
): Promise<{
  consumed: number;
  remaining: number;
  resetAt: string;
  resetInSeconds: number;
}> => {
  const redis = getRedisClient();
  const dateKey = getUtcDateKey();
  const key = `wpp:quota:daily:${dateKey}:${identifier}`;

  const raw = await redis.get(key);
  const consumed = raw ? parseInt(raw, 10) : 0;
  const remaining = Math.max(0, limit - consumed);
  const resetInSeconds = getSecondsUntilMidnightUtc();
  const resetAt = new Date(Date.now() + resetInSeconds * 1000).toISOString();

  return {
    consumed,
    remaining,
    resetAt,
    resetInSeconds,
  };
};
