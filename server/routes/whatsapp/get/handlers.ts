import { prisma } from "@/database/postgres";
import { getRedisClient } from "@/redis/client";
import { getProcessQueue } from "@/whatsapp/queues/processQueue";
import { getDeliveryQueue } from "@/whatsapp/queues/deliveryQueue";
import { getUserQuotaStatus } from "@/whatsapp/quotaMiddleware";
import { getSharedGatewayStatus, isServiceEnabled } from "@/whatsapp/gateway";
import { RequestError, getHandlerGet, STATUS_RESPONSE } from "@common";

export const handleWhatsAppHealth = getHandlerGet(
  "/whatsapp",
  "/health",
  async (_, sendResponse) => {
    const gateway = getSharedGatewayStatus();
    const redis = getRedisClient();
    const isRedisConnected = redis.status === "ready";

    let processQueueHealthy = false;
    let deliveryQueueHealthy = false;

    try {
      const pQueue = getProcessQueue();
      await pQueue.getWaitingCount();
      processQueueHealthy = true;
    } catch {
      // Ignore
    }

    try {
      const dQueue = getDeliveryQueue();
      await dQueue.getWaitingCount();
      deliveryQueueHealthy = true;
    } catch {
      // Ignore
    }

    const isHealthy =
      gateway.connected &&
      isRedisConnected &&
      processQueueHealthy &&
      deliveryQueueHealthy;

    sendResponse(
      isHealthy ? STATUS_RESPONSE.SUCCESS : STATUS_RESPONSE.SERVICE_UNAVAILABLE,
      {
        status: isHealthy ? "healthy" : "degraded",
        timestamp: new Date().toISOString(),

        redis: { connected: isRedisConnected },
        queues: {
          processQueueHealthy,
          deliveryQueueHealthy,
        },
        gateway: {
          state: gateway.state,
          connected: gateway.connected,
          uptimeSeconds: gateway.uptimeSeconds,
        },
      },
    );
  },
);

export const handleWhatsAppStatus = getHandlerGet(
  "/whatsapp",
  "/status",
  async (_, sendResponse, { req }) => {
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

    const gateway = getSharedGatewayStatus();
    const pQueue = getProcessQueue();
    const dQueue = getDeliveryQueue();

    const [
      processWaiting,
      processActive,
      processFailed24h,
      deliveryWaiting,
      processCompleted24h,
    ] = await Promise.all([
      pQueue.getWaitingCount().catch(() => 0),
      pQueue.getActiveCount().catch(() => 0),
      pQueue.getFailedCount().catch(() => 0),
      dQueue.getWaitingCount().catch(() => 0),
      pQueue.getCompletedCount().catch(() => 0),
    ]);

    sendResponse(STATUS_RESPONSE.SUCCESS, {
      serviceEnabled: isServiceEnabled(),
      workers: {
        processWorkersActive: 3,
        deliveryWorkersActive: 1,
      },
      sharedGateway: {
        connected: gateway.connected,
        reconnectAttempts: gateway.reconnectAttempts,
      },
      queueDepth: {
        processActive,
        processWaiting,
        deliveryWaiting,
        processFailed24h,
        processCompleted24h,
      },
    });
  },
);

export const handleWhatsAppQuota = getHandlerGet(
  "/whatsapp",
  "/quota",
  async (_, sendResponse, { req }) => {
    const userId = req.user.token.data.userId;
    const quotaInfo = await getUserQuotaStatus(userId);
    sendResponse(STATUS_RESPONSE.SUCCESS, quotaInfo);
  },
);
