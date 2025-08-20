import { API_URL } from "../constants/API_URL";
import { stringifyData } from "./appManagement";
import { RequestBody, RoutesAPI } from "@types";
import { loadData } from "./storageManagement";

/**
 * Generates an options object for a fetch request.
 *
 * @param method - The HTTP method to use for the request. Can be either "POST" or "GET".
 * @param body - An optional request body, which can be of type `RequestEncrypt` or `RequestDecrypt`.
 *               If provided, it will be stringified and included in the request.
 * @returns An object containing the HTTP method, headers, and optionally the stringified body.
 */
export const fetchOptions = <T = RequestBody>(
  method: "POST" | "GET" | "PUT" | "DELETE",
  body?: T,
) => {
  return {
    method,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: stringifyData(body) ?? undefined,
  };
};

/**
 * Constructs a full API route URL by appending the given route to the base API URL.
 *
 * @param route - The specific route to append to the base API URL.
 * @returns The full API route URL as a string.
 *
 * @remarks
 * This function is useful for constructing API endpoints dynamically.
 * For example, if the base API URL is "https://example.com/api/v1"
 * and the route is "users", the resulting URL will be:
 * "https://example.com/api/v1/users".
 *
 * @example
 * ```typescript
 * const userRoute = getRouteAPI("/users");
 * log(userRoute); // Outputs: "https://example.com/api/v1/users"
 * ```
 */
export const getRouteAPI = async (route: RoutesAPI): Promise<string> => {
  let apiUrl = await loadData<string>("@API_URL").then(
    (data) => data || API_URL,
  );
  if (apiUrl.endsWith("/")) apiUrl = apiUrl.slice(0, -1);

  console.log(`URL: ${apiUrl}${route}`);
  return `${apiUrl}${route}`;
};

/**
 * Constructs a full image route URL by appending the given filename to the base API URL.
 *
 * @param filename - The name of the image file to append to the base API URL.
 * @returns The full image route URL as a string.
 *
 * @remarks
 * This function is useful for constructing image URLs dynamically.
 * For example, if the base API URL is "https://example.com/api/v1"
 * and the filename is "/images/photo.jpg", the resulting URL will be:
 * "https://example.com/images/photo.jpg".
 *
 * @example
 * ```typescript
 * const imageRoute = getRouteImage("/images/photo.jpg");
 * log(imageRoute); // Outputs: "https://example.com/images/photo.jpg"
 * ```
 */
export const getRouteImage = async (filename: string): Promise<string> => {
  const apiUrl = await loadData<string>("@API_URL").then(
    (data) => data || API_URL,
  );
  return `${apiUrl.replace("/api/v1", "")}${filename}`;
};
