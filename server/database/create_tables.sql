-- ==============================================
-- Script of PostgreSQL table creation
-- Based on the provided TypeScript types
-- ==============================================

-- Enable UUID extension (for unique IDs if desired)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================
-- Table: Users
-- ==============================================
CREATE TABLE IF NOT EXISTS users (
  "userId" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT DEFAULT '',
  email TEXT UNIQUE DEFAULT '',
  phone TEXT DEFAULT '',
  password TEXT NOT NULL,
  description TEXT DEFAULT '',
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================
-- Table: Logs
-- ==============================================
CREATE TABLE IF NOT EXISTS logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  type VARCHAR(10) NOT NULL CHECK (type IN ('log', 'warn', 'error')),
  "userId" TEXT NOT NULL,
  message TEXT NOT NULL,
  "deviceId" TEXT NOT NULL,
  "timestamp" TIMESTAMP NOT NULL,
  "deviceName" TEXT NOT NULL
);

-- ==============================================
-- Table: Cryptos
-- ==============================================
CREATE TABLE IF NOT EXISTS cryptos (
  uid UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  id TEXT NOT NULL,
  amount TEXT NOT NULL,
  "firstPricePurchased" NUMERIC NOT NULL,
  "datePurchased" TIMESTAMP NOT NULL,
  currency TEXT NOT NULL,
  "userId" TEXT NOT NULL
);

-- ==============================================
-- Table: PushTokens
-- ==============================================
CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  token TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================
-- Table: UserNotificationsConfig
-- ==============================================
CREATE TABLE IF NOT EXISTS user_notifications_config (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  "userId" TEXT NOT NULL,
  reason TEXT NOT NULL,
  streamer TEXT DEFAULT '',
  paused BOOLEAN DEFAULT FALSE,
  "pauseTime" INTEGER NOT NULL DEFAULT -1,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  interval INTEGER NOT NULL DEFAULT -1,
  "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================
-- Table: UserConfig
-- ==============================================
CREATE TABLE IF NOT EXISTS user_config (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  theme VARCHAR(10) NOT NULL CHECK (theme IN ('light', 'dark', 'auto')),
  "userId" TEXT NOT NULL,
  "API_URL" TEXT,
  language TEXT NOT NULL DEFAULT 'en',
  "hasAdmin" BOOLEAN NOT NULL DEFAULT FALSE,
  "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "webSocketURL" TEXT
);

-- ==============================================
-- Table: ClipboardSync
-- ==============================================
CREATE TABLE IF NOT EXISTS clipboard_sync (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  "userId" TEXT NOT NULL,
  content TEXT NOT NULL,
  deleted BOOLEAN DEFAULT FALSE,
  "deviceId" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================
-- Table: Streamer
-- ==============================================
CREATE TABLE IF NOT EXISTS streamer (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "linkImage" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================
-- Table: UserSessions
-- ==============================================
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  token TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "deviceId" TEXT NOT NULL,
  "updatedAt" TIMESTAMPTZ NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================
-- Table: DownDetector
-- ==============================================
CREATE TABLE IF NOT EXISTS down_detector (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  url TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "sendNotification" BOOLEAN NOT NULL
);
