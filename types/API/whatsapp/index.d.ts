import {
  GetUrlFetch,
  WhatsAppQuotaInfo,
  WhatsAppHealthStatus,
  WhatsAppLinkTokenResult,
  WhatsAppOperationalStatus,
} from "@types";

export type WhatsAppGetFetch =
  | GetUrlFetch<"/health", null, Record<string, never>, WhatsAppHealthStatus>
  | GetUrlFetch<"/status", null, { auth: true }, WhatsAppOperationalStatus>
  | GetUrlFetch<"/quota", null, { auth: true }, WhatsAppQuotaInfo>;

export type WhatsAppPostFetch =
  | GetUrlFetch<"/link/generate", null, { auth: true }, WhatsAppLinkTokenResult>
  | GetUrlFetch<
      "/admin/toggle",
      { body: { enabled: boolean; maintenanceMessage?: string } },
      { auth: true },
      { success: boolean; serviceEnabled: boolean }
    >;

export type WhatsAppDeleteFetch = GetUrlFetch<
  "/link",
  null,
  { auth: true },
  { success: boolean; message: string }
>;
