import { LanguagesSupported } from "./typesTranslations";

export type PersonalWhatsAppConnectionState =
  "error" | "qr_ready" | "connected" | "connecting" | "disconnected";

export interface PersonalWhatsAppStatus {
  state: PersonalWhatsAppConnectionState;
  phoneNumber?: string;
  name?: string;
  qrDataUrl?: string;
  errorMessage?: string;
}

export interface PersonalStickerConfig {
  emojis: string[];
  quality: number;
  packName: string;
  authorName: string;
  allowedChats: "direct_only" | "all";
  enabledAutoReply: boolean;
}

export type WhatsAppStatusListener = (status: PersonalWhatsAppStatus) => void;

export interface WhatsAppBridge {
  updateConfig: (
    config: Partial<PersonalStickerConfig>,
  ) => Promise<PersonalStickerConfig>;

  connect: () => Promise<PersonalWhatsAppStatus>;
  getStatus: () => Promise<PersonalWhatsAppStatus>;
  getConfig: () => Promise<PersonalStickerConfig>;
  disconnect: () => Promise<boolean>;
  logoutAndPurge: () => Promise<boolean>;
  onStatusChanged: (listener: WhatsAppStatusListener) => () => void;
}

export interface WhatsAppStickerProcessJobData {
  jobId: string;
  messageId: string;
  senderId: string;
  isLinked: boolean;
  isAnimated: boolean;
  tempInputPath: string;
  lang: "en" | "es";
  options: {
    emojis: string[];
    quality: number;
    packName: string;
    authorName: string;
  };
  enqueuedAt: number;
}

export interface WhatsAppStickerDeliveryJobData {
  lang: LanguagesSupported;
  jobId: string;
  messageId: string;
  isAnimated: boolean;
  enqueuedAt: number;
  recipientId: string;
  tempStickerPath: string;
  processingDurationMs: number;
}

export interface WhatsAppQuotaInfo {
  resetAt: string;
  isLinked: boolean;
  dailyQuota: number;
  consumedToday: number;
  remainingToday: number;
  resetInSeconds: number;
  linkedPhoneNumber?: string;
}

export interface WhatsAppHealthStatus {
  status: "healthy" | "degraded";
  timestamp: string;
  gateway: {
    connected: boolean;
    state: "open" | "close" | "connecting";
    uptimeSeconds: number;
  };
  redis: { connected: boolean };
  queues: {
    processQueueHealthy: boolean;
    deliveryQueueHealthy: boolean;
  };
}

export interface WhatsAppOperationalStatus {
  serviceEnabled: boolean;
  workers: {
    processWorkersActive: number;
    deliveryWorkersActive: number;
  };
  sharedGateway: {
    connected: boolean;
    reconnectAttempts: number;
  };
  queueDepth: {
    processActive: number;
    processWaiting: number;
    deliveryWaiting: number;
    processFailed24h: number;
    processCompleted24h: number;
  };
  queueDepth: {
    processActive: number;
    processWaiting: number;
    deliveryWaiting: number;
    processFailed24h: number;
    processCompleted24h: number;
  };
}

export interface WhatsAppLinkTokenResult {
  code: string;
  expiresAt: string;
  instructions: Record<LanguagesSupported, string>;
  expiresInSeconds: number;
}

export interface WhatsAppQuotaUpdateMessage {
  type: "whatsapp-quota-update";
  resetAt: string;
  isLinked: boolean;
  dailyQuota: number;
  consumedToday: number;
  remainingToday: number;
  linkedPhoneNumber?: string;
}

export interface WhatsAppGatewayStatusMessage {
  type: "whatsapp-gateway-status";
  connected: boolean;
  serviceEnabled: boolean;
  maintenanceMessage?: string;
}

export type WhatsAppWebSocketMessage =
  WhatsAppQuotaUpdateMessage | WhatsAppGatewayStatusMessage;
