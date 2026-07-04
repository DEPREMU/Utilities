import { getHandlerPut } from "@common";

export const handleUpdateLog = getHandlerPut(
  "/logs",
  "/",
  {},
  async (_body, sendResponse) => {
    sendResponse("SUCCESS", { success: true });
  },
);
