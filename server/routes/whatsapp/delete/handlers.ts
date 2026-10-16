import { getHandlerDelete, STATUS_RESPONSE } from "@common";
import { unlinkWhatsAppAccount } from "@/whatsapp/linkManager";

export const handleUnlinkWhatsApp = getHandlerDelete(
  "/whatsapp",
  "/link",
  async (_, sendResponse, { req }) => {
    const userId = req.user.token.data.userId;
    await unlinkWhatsAppAccount(userId);

    sendResponse(STATUS_RESPONSE.SUCCESS, {
      success: true,
      message: "WhatsApp account unlinked successfully.",
    });
  },
);
