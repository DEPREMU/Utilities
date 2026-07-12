import axios from "axios";
import { Timers } from "../timer.ts";

export const enum STATUS_RESPONSE {
  SUCCESS = 200,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  PAYLOAD_TOO_LARGE = 413,
  INTERNAL_SERVER_ERROR = 500,
}

export class Network {
  static readonly URL_GOOGLE_204 = "https://www.google.com/generate_204";

  /**
   * Checks if the device has an active internet connection by attempting to reach a Google server.
   *
   * This function performs a GET request to a predefined Google server URL with a 10-second timeout.
   * It considers the connection active if the request returns a status code in the range of 200-399.
   *
   * @returns {Promise<boolean>} A promise that resolves to `true` if the internet connection is verified, or `false` if the request fails or times out.
   */
  static readonly isOnline = async (): Promise<boolean> => {
    try {
      const res = await axios.get(Network.URL_GOOGLE_204, { timeout: 5000 });
      return res.status < 400 && res.status >= 200;
    } catch {
      return false;
    }
  };

  /**
   * Checks if a specific URL is reachable and responsive by making an HTTP request with a specified method and timeout.
   *
   * This function allows you to verify the availability of a particular URL by sending either a GET or POST request.
   * It returns `true` if the response status code indicates success (200-399) and `false` if the request fails, times out, or returns an error status code.
   */
  static readonly isOnlineUrl = async (
    url: string,
    method?: "get" | "post",
    timeout?: number,
  ): Promise<boolean> => {
    try {
      if (!method) method = "get";
      if (!timeout) timeout = 3000;

      const res = await axios.request<{ destroy?: () => void }>({
        url,
        method,
        timeout,
        data: method === "post" ? {} : undefined,
        validateStatus: () => true,
      });
      res?.data?.destroy?.();
      return res.status >= 200 && res.status < 400;
    } catch {
      return false;
    }
  };

  /**
   * Waits for an active internet connection by repeatedly checking connectivity with a specified number of retries and interval.
   * The function attempts to verify the internet connection by calling `hasInternetConnection` at regular intervals until a connection is established or the maximum number of retries is reached.
   *
   * @param retries - The maximum number of attempts to check for an internet connection before giving up.
   * @param interval - The time in milliseconds to wait between each connectivity check. Default is 2000ms (2 seconds).
   * @returns A promise that resolves to `true` if an internet connection is established within the given retries, or `false` if all attempts fail.
   */
  static readonly waitForOnline = async (
    retries: number,
    interval: number = 2000,
  ): Promise<boolean> => {
    for (let i = 0; i < retries; i++) {
      if (await Network.isOnline()) return true;
      await Timers.sleep(interval);
    }
    return false;
  };
}
