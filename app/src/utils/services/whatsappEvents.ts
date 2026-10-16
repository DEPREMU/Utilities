import { EventHandler } from "@common";
import { WhatsAppQuotaInfo } from "@types";

export type WhatsAppEventsRecord = {
  "quota-update": (quota: WhatsAppQuotaInfo) => void;
};

class WhatsAppEventsManager extends EventHandler<WhatsAppEventsRecord> {
  /**
   * Emits a quota-update event with updated WhatsApp quota and linking status.
   *
   * @param quota - Updated quota status object
   */
  public emitQuotaUpdate(quota: WhatsAppQuotaInfo): void {
    this.emit("quota-update", quota);
  }
}

export const whatsAppEvents = new WhatsAppEventsManager();
