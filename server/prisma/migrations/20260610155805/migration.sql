-- CreateEnum
CREATE TYPE "LogType" AS ENUM ('log', 'warn', 'error');

-- CreateEnum
CREATE TYPE "Theme" AS ENUM ('light', 'dark', 'auto');

-- CreateEnum
CREATE TYPE "Languages" AS ENUM ('en', 'es');

-- CreateEnum
CREATE TYPE "ReasonNotification" AS ENUM ('cryptos', 'streamers', 'downDetector', 'batteryAlerts', 'timeToDownload', 'locationEnabled', 'updateAvailable', 'allNotifications', 'recorderNotification', 'noInternetConnection', 'loggedInStatusChannel');

-- CreateEnum
CREATE TYPE "FontStyle" AS ENUM ('normal', 'italic');

-- CreateEnum
CREATE TYPE "FontWeight" AS ENUM ('normal', 'bold');

-- CreateEnum
CREATE TYPE "TextDecorationLine" AS ENUM ('none', 'underline', 'line_through');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('image', 'video', 'audio', 'other');

-- CreateTable
CREATE TABLE "users" (
    "userId" UUID NOT NULL,
    "name" TEXT DEFAULT '',
    "email" TEXT NOT NULL,
    "phone" TEXT DEFAULT '',
    "password" TEXT NOT NULL,
    "description" TEXT DEFAULT '',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "logs" (
    "id" UUID NOT NULL,
    "type" "LogType" NOT NULL,
    "message" TEXT NOT NULL,
    "userId" UUID,
    "deviceId" TEXT NOT NULL,
    "timestamp" TIMESTAMPTZ NOT NULL,
    "deviceName" TEXT NOT NULL,

    CONSTRAINT "logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auto_refresh_crypto" (
    "id" UUID NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "valueMs" INTEGER NOT NULL DEFAULT 60000,
    "cryptosSettingsId" UUID NOT NULL,

    CONSTRAINT "auto_refresh_crypto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_crypto" (
    "id" UUID NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "valueMs" INTEGER NOT NULL DEFAULT 3600000,
    "cryptosSettingsId" UUID NOT NULL,

    CONSTRAINT "notification_crypto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cryptos_settings" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "defaultCurrency" TEXT DEFAULT 'USDT',

    CONSTRAINT "cryptos_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cryptos" (
    "id" UUID NOT NULL,
    "amount" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "baseCoin" TEXT NOT NULL,
    "quoteCoin" TEXT NOT NULL,
    "datePurchased" TIMESTAMPTZ NOT NULL,
    "firstPricePurchased" DECIMAL NOT NULL,

    CONSTRAINT "cryptos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_tokens" (
    "id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_notifications_config" (
    "id" UUID NOT NULL,
    "reason" "ReasonNotification" NOT NULL,
    "paused" BOOLEAN DEFAULT false,
    "userId" UUID NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pauseTime" INTEGER NOT NULL DEFAULT -1,

    CONSTRAINT "user_notifications_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_streamer_notification" (
    "id" UUID NOT NULL,
    "paused" BOOLEAN DEFAULT false,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "streamer" TEXT NOT NULL,
    "pauseTime" INTEGER NOT NULL DEFAULT -1,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userNotificationConfigId" UUID NOT NULL,

    CONSTRAINT "user_streamer_notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_config" (
    "id" UUID NOT NULL,
    "theme" "Theme" NOT NULL,
    "language" "Languages" NOT NULL DEFAULT 'en',
    "userId" UUID NOT NULL,
    "API_URL" TEXT,
    "hasAdmin" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "webSocketURL" TEXT,

    CONSTRAINT "user_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clipboard_sync" (
    "id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "deleted" BOOLEAN DEFAULT false,
    "userId" UUID NOT NULL,
    "deviceId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clipboard_sync_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "streamer" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "linkImage" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "streamer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "deviceId" TEXT NOT NULL,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "down_detector" (
    "id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sendNotification" BOOLEAN NOT NULL,

    CONSTRAINT "down_detector_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notes" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "folderId" TEXT,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "note_sources" (
    "id" UUID NOT NULL,
    "uri" TEXT NOT NULL,
    "type" "SourceType" NOT NULL,
    "name" TEXT,
    "size" INTEGER,
    "mimeType" TEXT,
    "durationMs" INTEGER,
    "noteId" UUID NOT NULL,

    CONSTRAINT "note_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rich_text_runs" (
    "id" UUID NOT NULL,
    "start" INTEGER NOT NULL,
    "end" INTEGER NOT NULL,
    "color" TEXT,
    "fontSize" INTEGER,
    "fontStyle" "FontStyle",
    "fontFamily" TEXT,
    "fontWeight" "FontWeight",
    "textDecorationLine" "TextDecorationLine",
    "noteId" UUID NOT NULL,

    CONSTRAINT "rich_text_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "auto_refresh_crypto_cryptosSettingsId_key" ON "auto_refresh_crypto"("cryptosSettingsId");

-- CreateIndex
CREATE UNIQUE INDEX "notification_crypto_cryptosSettingsId_key" ON "notification_crypto"("cryptosSettingsId");

-- CreateIndex
CREATE UNIQUE INDEX "cryptos_settings_userId_key" ON "cryptos_settings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "cryptos_userId_symbol_key" ON "cryptos"("userId", "symbol");

-- CreateIndex
CREATE UNIQUE INDEX "push_tokens_token_key" ON "push_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "push_tokens_token_userId_key" ON "push_tokens"("token", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_notifications_config_userId_reason_key" ON "user_notifications_config"("userId", "reason");

-- CreateIndex
CREATE UNIQUE INDEX "user_streamer_notification_userNotificationConfigId_streame_key" ON "user_streamer_notification"("userNotificationConfigId", "streamer");

-- CreateIndex
CREATE UNIQUE INDEX "user_config_userId_key" ON "user_config"("userId");

-- CreateIndex
CREATE INDEX "idx_clipboard_userid" ON "clipboard_sync"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "clipboard_sync_userId_deviceId_content_key" ON "clipboard_sync"("userId", "deviceId", "content");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_userId_deviceId_key" ON "user_sessions"("userId", "deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_userId_token_key" ON "user_sessions"("userId", "token");

-- AddForeignKey
ALTER TABLE "logs" ADD CONSTRAINT "logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auto_refresh_crypto" ADD CONSTRAINT "auto_refresh_crypto_cryptosSettingsId_fkey" FOREIGN KEY ("cryptosSettingsId") REFERENCES "cryptos_settings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_crypto" ADD CONSTRAINT "notification_crypto_cryptosSettingsId_fkey" FOREIGN KEY ("cryptosSettingsId") REFERENCES "cryptos_settings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cryptos_settings" ADD CONSTRAINT "cryptos_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cryptos" ADD CONSTRAINT "cryptos_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_tokens" ADD CONSTRAINT "push_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_notifications_config" ADD CONSTRAINT "user_notifications_config_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_streamer_notification" ADD CONSTRAINT "user_streamer_notification_userNotificationConfigId_fkey" FOREIGN KEY ("userNotificationConfigId") REFERENCES "user_notifications_config"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_config" ADD CONSTRAINT "user_config_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clipboard_sync" ADD CONSTRAINT "clipboard_sync_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "streamer" ADD CONSTRAINT "streamer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "down_detector" ADD CONSTRAINT "down_detector_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "note_sources" ADD CONSTRAINT "note_sources_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rich_text_runs" ADD CONSTRAINT "rich_text_runs_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
