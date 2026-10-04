import { File, STATUS_RESPONSE } from "@common";
import type { Response } from "express";

export interface AccelRedirectOptions {
  contentType?: string;
  redirectPrefix?: string;
}

/**
 * Delegates file downloading to Nginx via X-Accel-Redirect header.
 */
export const sendAccelRedirect = async (
  res: Response,
  filePath: string,
  fileName: string,
  options?: AccelRedirectOptions,
): Promise<void> => {
  const file = new File(filePath);
  const fileStats = await file.stats();

  if (!fileStats || !fileStats.isFile())
    throw new Error("File not found on server");

  const contentType = options?.contentType ?? "application/octet-stream";
  const prefix = (options?.redirectPrefix ?? "/internal-downloads").replace(
    /\/+$/,
    "",
  );
  const encodedFileName = encodeURIComponent(fileName);
  const redirectUri = `${prefix}/${encodedFileName}`;

  res.status(STATUS_RESPONSE.SUCCESS);
  res.setHeader("X-Accel-Redirect", redirectUri);
  res.setHeader("Content-Type", contentType);
  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Content-Length", fileStats.size);
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="download"; filename*=UTF-8''${encodedFileName}`,
  );

  res.end();
};
