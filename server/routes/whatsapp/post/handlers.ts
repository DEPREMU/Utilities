import { prisma } from "@/database/postgres";
import { setServiceEnabled } from "@/whatsapp/gateway";
import { generateLinkToken } from "@/whatsapp/linkManager";
import { RequestError, getHandlerPost, STATUS_RESPONSE } from "@common";

export const handleGenerateLink = getHandlerPost(
  "/whatsapp",
  "/link/generate",
  async (_, sendResponse, { req }) => {
    const userId = req.user.token.data.userId;

    try {
      const result = await generateLinkToken(userId);
      sendResponse(STATUS_RESPONSE.SUCCESS, result);
    } catch (error) {
      const message = (error as Error).message;
      if (message.includes("already has an active linked WhatsApp")) {
        throw new RequestError(STATUS_RESPONSE.CONFLICT, message);
      }
      throw error;
    }
  },
);

export const handleAdminToggle = getHandlerPost(
  "/whatsapp",
  "/admin/toggle",
  async ({ body }, sendResponse, { req }) => {
    const userId = req.user.token.data.userId;

    const userConfig = await prisma.userConfig.findUnique({
      where: { userId },
      select: { hasAdmin: true },
    });

    if (!userConfig?.hasAdmin) {
      throw new RequestError(
        STATUS_RESPONSE.FORBIDDEN,
        "Administrative privileges required",
      );
    }

    setServiceEnabled(body.enabled);

    sendResponse(STATUS_RESPONSE.SUCCESS, {
      success: true,
      serviceEnabled: body.enabled,
    });
  },
);
