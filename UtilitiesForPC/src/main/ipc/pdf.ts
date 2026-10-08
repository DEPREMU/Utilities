import { createPDFWithImages } from "../utils/pdf";
import { Logger } from "../utils/logger";
import { IpcHandlersRecord } from "./types";

export const pdfIpcHandlers: IpcHandlersRecord<"pdf.create"> = {
  "pdf.create": {
    type: "handle",
    func: async (event, request) => {
      try {
        Logger.log(
          `Received pdf.create request with ${request?.images?.length || 0} images`,
        );
        const result = await createPDFWithImages(request, (progress) => {
          event.sender.send("create-pdf-progress", progress);
        });
        return result;
      } catch (error) {
        Logger.error("Error creating PDF:", error);
        return null;
      }
    },
  },
};
