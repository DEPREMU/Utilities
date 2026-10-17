import { LanguagesSupported } from "./typesTranslations";

export type PersonalWhatsAppConnectionState =
  "error" | "qr_ready" | "connected" | "connecting" | "disconnected";

export type PersonalWhatsAppStatus = {
  state: PersonalWhatsAppConnectionState;
  name?: string;
  qrDataUrl?: string;
  phoneNumber?: string;
  errorMessage?: string;
};

export type PersonalStickerConfig = {
  emojis: string[];
  quality: number;
  packName: string;
  authorName: string;
  autoConnect: boolean;
  allowedChats: "direct_only" | "all";
  enabledAutoReply: boolean;
};

export type WhatsAppStatusListener = (status: PersonalWhatsAppStatus) => void;

export type WhatsAppBridge = {
  updateConfig: (
    config: Partial<PersonalStickerConfig>,
  ) => Promise<PersonalStickerConfig>;

  connect: () => Promise<PersonalWhatsAppStatus>;
  getStatus: () => Promise<PersonalWhatsAppStatus>;
  getConfig: () => Promise<PersonalStickerConfig>;
  disconnect: () => Promise<boolean>;
  logoutAndPurge: () => Promise<boolean>;
  onStatusChanged: (listener: WhatsAppStatusListener) => () => void;
};

export type WhatsAppStickerProcessJobData = {
  lang: LanguagesSupported;
  jobId: string;
  senderId: string;
  isLinked: boolean;
  messageId: string;
  enqueuedAt: number;
  isAnimated: boolean;
  tempInputPath: string;
  options: {
    emojis: string[];
    quality: number;
    packName: string;
    authorName: string;
  };
};

export type WhatsAppStickerDeliveryJobData = {
  lang: LanguagesSupported;
  jobId: string;
  messageId: string;
  isAnimated: boolean;
  enqueuedAt: number;
  recipientId: string;
  tempStickerPath: string;
  processingDurationMs: number;
};

export type WhatsAppQuotaInfo = {
  resetAt: string;
  isLinked: boolean;
  dailyQuota: number;
  consumedToday: number;
  remainingToday: number;
  resetInSeconds: number;
  linkedPhoneNumber?: string;
};

export type WhatsAppHealthStatus = {
  redis: { connected: boolean };
  status: "healthy" | "degraded";
  timestamp: string;
  queues: {
    processQueueHealthy: boolean;
    deliveryQueueHealthy: boolean;
  };
  gateway: {
    state: "open" | "close" | "connecting";
    connected: boolean;
    uptimeSeconds: number;
  };
};

export type WhatsAppOperationalStatus = {
  sharedGateway: { connected: boolean; reconnectAttempts: number };
  serviceEnabled: boolean;
  workers: {
    processWorkersActive: number;
    deliveryWorkersActive: number;
  };
  queueDepth: {
    processActive: number;
    processWaiting: number;
    deliveryWaiting: number;
    processFailed24h: number;
    processCompleted24h: number;
  };
};

export type WhatsAppLinkTokenResult = {
  code: string;
  expiresAt: string;
  instructions: Record<LanguagesSupported, string>;
  expiresInSeconds: number;
};

export type WhatsAppQuotaUpdateMessage = {
  type: "whatsapp-quota-update";
  resetAt: string;
  isLinked: boolean;
  dailyQuota: number;
  consumedToday: number;
  remainingToday: number;
  linkedPhoneNumber?: string;
};

export type WhatsAppGatewayStatusMessage = {
  type: "whatsapp-gateway-status";
  connected: boolean;
  serviceEnabled: boolean;
  maintenanceMessage?: string;
};

export type WhatsAppWebSocketMessage =
  WhatsAppQuotaUpdateMessage | WhatsAppGatewayStatusMessage;
