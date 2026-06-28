import { prisma } from "@/database/postgres";
import { getHandlerPost } from "@common";

export const handleAddLog = getHandlerPost(
  "/logs",
  "/add",
  {
    id: "undefined",
    type: "string",
    user: "undefined",
    userId: ["string", "undefined"],
    message: "string",
    deviceId: "string",
    timestamp: "string",
    deviceName: "string",
  },
  async (body, sendResponse) => {
    try {
      const log = await prisma.logs.create({
        data: {
          type: body.type,
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
