const LOCATION_FALLBACK = "Location unavailable";

/**
 * Determines whether a given IP address is private, loopback, or local.
 *
 * @param ip - The IP address string to check
 * @returns True if the IP is local or private, false otherwise
 */
const isPrivateOrLocalIP = (ip: string): boolean => {
  if (!ip) return true;

  const cleanIp = ip.replace(/^::ffff:/, "");

  if (cleanIp === "::1" || cleanIp === "127.0.0.1" || cleanIp === "localhost") {
    return true;
  }

  if (
    cleanIp.startsWith("10.") ||
    cleanIp.startsWith("192.168.") ||
    cleanIp.startsWith("169.254.") ||
    cleanIp.startsWith("fc00:") ||
    cleanIp.startsWith("fe80:")
  ) {
    return true;
  }

  const parts = cleanIp.split(".");
  if (parts.length === 4) {
    const first = Number(parts[0]);
    const second = Number(parts[1]);
    if (first === 172 && second >= 16 && second <= 31) {
      return true;
    }
  }

  return false;
};

/**
 * Resolves the approximate geographic location (e.g. "City, Country") for a given IP address.
 * Never throws an error; returns "Location unavailable" if resolution fails or times out.
 *
 * @param ip - The client IP address
 * @returns A promise resolving to the approximate location string
 */
export const getApproximateLocation = async (
  ip: string | undefined,
): Promise<string> => {
  if (!ip || isPrivateOrLocalIP(ip)) {
    return LOCATION_FALLBACK;
  }

  const cleanIp = ip.replace(/^::ffff:/, "");
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 1500);

  try {
    const response = await fetch(
      `http://ip-api.com/json/${cleanIp}?fields=status,country,city`,
      { signal: controller.signal },
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      return LOCATION_FALLBACK;
    }

    const data = (await response.json()) as {
      status?: string;
      city?: string;
      country?: string;
    };

    if (data.status === "success" && (data.city || data.country)) {
      if (data.city && data.country) {
        return `${data.city}, ${data.country}`;
      }
      return data.country || data.city || LOCATION_FALLBACK;
    }

    return LOCATION_FALLBACK;
  } catch {
    clearTimeout(timeoutId);
    return LOCATION_FALLBACK;
  }
};
