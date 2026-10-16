-- CreateTable
CREATE TABLE "whatsapp_account_links" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "whatsappId" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "verifiedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_account_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_link_tokens" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "usedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_link_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_usage" (
    "id" UUID NOT NULL,
    "identifier" TEXT NOT NULL,
    "userId" UUID,
    "date" TEXT NOT NULL,
    "consumedCount" INTEGER NOT NULL DEFAULT 0,
    "lastRequestAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_job_audits" (
    "id" UUID NOT NULL,
    "senderId" TEXT NOT NULL,
    "isLinked" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL,
    "isAnimated" BOOLEAN NOT NULL DEFAULT false,
    "durationMs" INTEGER NOT NULL,
    "errorCode" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_job_audits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_account_links_whatsappId_key" ON "whatsapp_account_links"("whatsappId");

-- CreateIndex
CREATE INDEX "whatsapp_account_links_userId_idx" ON "whatsapp_account_links"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_link_tokens_code_key" ON "whatsapp_link_tokens"("code");

-- CreateIndex
CREATE INDEX "whatsapp_link_tokens_code_idx" ON "whatsapp_link_tokens"("code");

-- CreateIndex
CREATE INDEX "whatsapp_link_tokens_userId_idx" ON "whatsapp_link_tokens"("userId");

-- CreateIndex
CREATE INDEX "whatsapp_usage_userId_date_idx" ON "whatsapp_usage"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_usage_identifier_date_key" ON "whatsapp_usage"("identifier", "date");

-- CreateIndex
CREATE INDEX "whatsapp_job_audits_createdAt_idx" ON "whatsapp_job_audits"("createdAt");

-- CreateIndex
CREATE INDEX "whatsapp_job_audits_status_idx" ON "whatsapp_job_audits"("status");

-- AddForeignKey
ALTER TABLE "whatsapp_account_links" ADD CONSTRAINT "whatsapp_account_links_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_link_tokens" ADD CONSTRAINT "whatsapp_link_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_usage" ADD CONSTRAINT "whatsapp_usage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("userId") ON DELETE SET NULL ON UPDATE CASCADE;
