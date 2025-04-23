CREATE TABLE "Users" (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  "registerTime" TEXT DEFAULT now(),
  token TEXT,
  "emailVerified" BOOLEAN DEFAULT false
);

CREATE TABLE "StreamersUsers" (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  streamer TEXT,
  "linkImage" TEXT
);