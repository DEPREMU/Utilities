import { getHandlerPut, STATUS_RESPONSE } from "@common";

export const handleUpdateLog = getHandlerPut(
  "/logs",
  "/",
  {},
  async (_body, sendResponse) => {
    sendResponse(STATUS_RESPONSE.SUCCESS, { success: true });
  },
);
