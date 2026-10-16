import {
  getLinkedAccountByUserId,
  getLinkedAccountByWhatsAppId,
} from "./linkManager";
import {
  consumeDailyQuota,
  getDailyQuotaStatus,
  DEFAULT_GUEST_DAILY_QUOTA,
  DEFAULT_LINKED_DAILY_QUOTA,
} from "./rateLimiter";
import { Helper } from "@common";
import { prisma } from "@/database/postgres";
import { getEnvValue } from "@/env";
import { WhatsAppQuotaInfo } from "@types";
import { sendWebSocketMessageToUser } from "../websocket/WebSocket";
import { broadcastWhatsAppQuotaUpdate } from "../websocket/WebSocketWhatsApp";
import { detectLanguageFromJid, getBotMessage } from "./language";

export interface QuotaCheckResult {
  allowed: boolean;
  isLinked: boolean;
  consumed: number;
  remaining: number;
  rejectionMessage?: string;
}

/**
 * Checks if a user is the configured administrator based on ADMIN_EMAIL.
 *
 * @param userId - Application user ID
 * @returns Promise resolving to boolean
 */
export const isUserAdmin = async (userId: string): Promise<boolean> => {
  try {
    const adminEmail = getEnvValue("ADMIN_EMAIL")?.toLowerCase();
    if (!adminEmail) return false;

    const user = await prisma.users.findUnique({
      where: { userId },
      select: { email: true },
    });

    return !!(user?.email && user.email.toLowerCase() === adminEmail);
  } catch {
    return false;
  }
};

/**
 * Evaluates and atomically consumes one quota token for an incoming WhatsApp sender.
 * If the sender is linked to the administrator, the quota is infinite.
 *
 * @param senderJid - Inbound WhatsApp JID of sender
 * @returns Promise resolving to quota status and optional localized rejection message
 */
export const enforceWhatsAppQuota = async (
  senderJid: string,
): Promise<QuotaCheckResult> => {
  const linked = await getLinkedAccountByWhatsAppId(senderJid);
  const isLinked = !!linked;
  const identifier = linked ? linked.userId : senderJid;

  if (isLinked) {
    const isAdmin = await isUserAdmin(linked.userId);
    if (isAdmin) {
      const result = await consumeDailyQuota(identifier, 999999);
      return {
        allowed: true,
        isLinked: true,
        consumed: result.consumed,
        remaining: -1,
      };
    }
  }

  const limit = isLinked
    ? DEFAULT_LINKED_DAILY_QUOTA
    : DEFAULT_GUEST_DAILY_QUOTA;

  const result = await consumeDailyQuota(identifier, limit);

  if (!result.allowed) {
    const lang = detectLanguageFromJid(senderJid);
    const rejectionMessage = getBotMessage("quotaExceeded", lang);
    return {
      allowed: false,
      isLinked,
      consumed: result.consumed,
      remaining: 0,
      rejectionMessage,
    };
  }

  return {
    allowed: true,
    isLinked,
    consumed: result.consumed,
    remaining: result.remaining,
  };
};

/**
 * Retrieves the current quota and linking state for an authenticated application user.
 * Masked phone number uses Helper.secret with the real number.
 *
 * @param userId - Application user ID
 * @returns Promise resolving to WhatsAppQuotaInfo
 */
export const getUserQuotaStatus = async (
  userId: string,
): Promise<WhatsAppQuotaInfo> => {
  const [linked, isAdmin] = await Promise.all([
    getLinkedAccountByUserId(userId),
    isUserAdmin(userId),
  ]);

  const isLinked = !!linked;
  const limit = isAdmin
    ? -1
    : isLinked
      ? DEFAULT_LINKED_DAILY_QUOTA
      : DEFAULT_GUEST_DAILY_QUOTA;

  const status = await getDailyQuotaStatus(userId, isAdmin ? 999999 : limit);

  return {
    isLinked,
    linkedPhoneNumber: linked?.phoneNumber
      ? Helper.secret(linked.phoneNumber)
      : undefined,
    dailyQuota: isAdmin ? -1 : limit,
    consumedToday: status.consumed,
    remainingToday: isAdmin ? -1 : status.remaining,
    resetAt: status.resetAt,
    resetInSeconds: status.resetInSeconds,
  };
};

/**
 * Notifies all active sessions of a user about their updated WhatsApp quota.
 *
 * @param userId - Application user ID
 */
export const notifyUserQuotaUpdate = async (userId: string): Promise<void> => {
  try {
    const quota = await getUserQuotaStatus(userId);

    sendWebSocketMessageToUser(userId, {
      type: "whatsapp-quota-update",
      dailyQuota: quota.dailyQuota,
      remainingToday: quota.remainingToday,
      consumedToday: quota.consumedToday,
      resetAt: quota.resetAt,
      isLinked: quota.isLinked,
      linkedPhoneNumber: quota.linkedPhoneNumber,
    });

    broadcastWhatsAppQuotaUpdate(userId, {
      dailyQuota: quota.dailyQuota,
      remainingToday: quota.remainingToday,
      consumedToday: quota.consumedToday,
      resetAt: quota.resetAt,
      isLinked: quota.isLinked,
      linkedPhoneNumber: quota.linkedPhoneNumber,
    });
  } catch {
    return;
  }
};
