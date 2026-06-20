import { prisma } from "@/database/postgres";
import { getHandlerPost } from "@/functions/getHandlerPost";

export const handleAddLog = getHandlerPost(
  "/logs",
  "/add",
  {
    type: "string",
    user: "undefined",
    userId: "string",
    message: "string",
    deviceId: "string",
    timestamp: "string",
    deviceName: "string",
  },
  async (body, sendResponse) => {
    try {
      const log = await prisma.logs.create({
        data: {
          type: body.type as "log",
          userId: body.userId,
          message: body.message,
          deviceId: body.deviceId,
          timestamp: body.timestamp,
          deviceName: body.deviceName,
        },
      });

      sendResponse("SUCCESS", { success: !!log.id });
    } catch {
      sendResponse("INTERNAL_SERVER_ERROR", {
        error: "Failed to add log",
        success: false,
      });
    }
  },
);
