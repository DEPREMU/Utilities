-- ==============================================
-- Version: 1.2.0
-- Script of PostgreSQL table creation
-- Based on the provided TypeScript types
-- ==============================================

-- Enable UUID extension (for unique IDs if desired)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- Enable pg_trgm extension (for trigram indexing)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

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
  message TEXT NOT NULL,
  "userId" UUID,
  "deviceId" TEXT NOT NULL,
  "timestamp" TIMESTAMPTZ NOT NULL,
  "deviceName" TEXT NOT NULL
);


-- ==============================================
-- Table: CryptosSettings
-- ==============================================
CREATE TABLE IF NOT EXISTS cryptos_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  "userId" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
  "autoRefresh" JSONB DEFAULT '{"enabled": true, "valueMs": 60000}',
  "defaultCurrency" TEXT DEFAULT 'USDT',
  "notifications" JSONB DEFAULT '{"enabled": true, "valueMs": 3600000}'
);


-- ==============================================
-- Table: Cryptos
-- ==============================================
CREATE TABLE IF NOT EXISTS cryptos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  amount TEXT NOT NULL,
  symbol TEXT NOT NULL,
  "userId" UUID NOT NULL,
  "baseCoin" TEXT NOT NULL,
  "quoteCoin" TEXT NOT NULL,
  "datePurchased" TIMESTAMPTZ NOT NULL,
  "firstPricePurchased" NUMERIC NOT NULL
);

-- ==============================================
-- Table: PushTokens
-- ==============================================
CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  token TEXT NOT NULL,
  "userId" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================
-- Table: UserNotificationsConfig
-- ==============================================
CREATE TABLE IF NOT EXISTS user_notifications_config (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  reason TEXT NOT NULL,
  paused BOOLEAN DEFAULT FALSE,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  streamer TEXT DEFAULT '',
  "userId" UUID NOT NULL,
  "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "pauseTime" INTEGER NOT NULL DEFAULT -1
);

-- ==============================================
-- Table: UserConfig
-- ==============================================
CREATE TABLE IF NOT EXISTS user_config (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  theme VARCHAR(10) NOT NULL CHECK (theme IN ('light', 'dark', 'auto')),
  language TEXT NOT NULL DEFAULT 'en',
  "userId" UUID NOT NULL,
  "API_URL" TEXT,
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
  content TEXT NOT NULL,
  deleted BOOLEAN DEFAULT FALSE,
  "userId" UUID NOT NULL,
  "deviceId" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================
-- Table: Streamer
-- ==============================================
CREATE TABLE IF NOT EXISTS streamer (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  "userId" UUID NOT NULL,
  "linkImage" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================
-- Table: UserSessions
-- ==============================================
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  token TEXT NOT NULL,
  "userId" UUID NOT NULL,
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
  "userId" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "sendNotification" BOOLEAN NOT NULL
);


-- ==============================================
-- Table: Notes
-- ==============================================
CREATE TABLE IF NOT EXISTS notes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  sources JSONB DEFAULT '[]',
  "userId" UUID NOT NULL,
  "folderId" TEXT DEFAULT NULL,
  "isPinned" BOOLEAN DEFAULT FALSE,
  "isHidden" BOOLEAN DEFAULT FALSE,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
  "richTextRuns" JSONB DEFAULT '[]'
);


-- ==============================================
-- Indexes
-- ==============================================
CREATE INDEX IF NOT EXISTS idx_clipboard_content_trgm
ON clipboard_sync
USING gin (content gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_clipboard_userid
ON clipboard_sync ("userId");

-- ==============================================
-- Foreign Key Constraints
-- ==============================================

DO $$
BEGIN

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_logs_user'
      AND table_name = 'logs'
  ) THEN
    ALTER TABLE logs
    ADD CONSTRAINT fk_logs_user
    FOREIGN KEY ("userId") REFERENCES users("userId")
    ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_cryptos_user'
      AND table_name = 'cryptos'
  ) THEN
    ALTER TABLE cryptos
    ADD CONSTRAINT fk_cryptos_user
    FOREIGN KEY ("userId") REFERENCES users("userId")
    ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_push_tokens_user'
      AND table_name = 'push_tokens'
  ) THEN
    ALTER TABLE push_tokens
    ADD CONSTRAINT fk_push_tokens_user
    FOREIGN KEY ("userId") REFERENCES users("userId")
    ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_notifications_user'
      AND table_name = 'user_notifications_config'
  ) THEN
    ALTER TABLE user_notifications_config
    ADD CONSTRAINT fk_notifications_user
    FOREIGN KEY ("userId") REFERENCES users("userId")
    ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_user_config_user'
      AND table_name = 'user_config'
  ) THEN
    ALTER TABLE user_config
    ADD CONSTRAINT fk_user_config_user
    FOREIGN KEY ("userId") REFERENCES users("userId")
    ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_clipboard_user'
      AND table_name = 'clipboard_sync'
  ) THEN
    ALTER TABLE clipboard_sync
    ADD CONSTRAINT fk_clipboard_user
    FOREIGN KEY ("userId") REFERENCES users("userId")
    ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_streamer_user'
      AND table_name = 'streamer'
  ) THEN
    ALTER TABLE streamer
    ADD CONSTRAINT fk_streamer_user
    FOREIGN KEY ("userId") REFERENCES users("userId")
    ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_sessions_user'
      AND table_name = 'user_sessions'
  ) THEN
    ALTER TABLE user_sessions
    ADD CONSTRAINT fk_sessions_user
    FOREIGN KEY ("userId") REFERENCES users("userId")
    ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_downdetector_user'
      AND table_name = 'down_detector'
  ) THEN
    ALTER TABLE down_detector
    ADD CONSTRAINT fk_downdetector_user
    FOREIGN KEY ("userId") REFERENCES users("userId")
    ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_notes_user'
      AND table_name = 'notes'
  ) THEN
    ALTER TABLE notes
    ADD CONSTRAINT fk_notes_user
    FOREIGN KEY ("userId") REFERENCES users("userId")
    ON DELETE CASCADE;
  END IF;

END $$;
