-- CreateTable
CREATE TABLE "server_logs" (
    "id" UUID NOT NULL,
    "type" "LogType" NOT NULL,
    "originalContent" TEXT NOT NULL,
    "cleanedContent" TEXT NOT NULL,
    "tag" TEXT NOT NULL DEFAULT 'untagged',
    "timestamp" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "server_logs_pkey" PRIMARY KEY ("id")
);
