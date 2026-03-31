# Utilities

Utilities is a Yarn workspaces monorepo that ships:

- An Expo React Native app for Android and Web (`app/`)
- A Node.js + Express + PostgreSQL + WebSocket backend (`server/`)
- An Electron desktop wrapper for the web build (`UtilitiesForPC/`)
- Shared contracts and helpers (`types/`, `common/`)
- Build and automation scripts (`scripts/`)

Repository: `https://github.com/DEPREMU/Utilities`

## Documentation Map

- Monorepo overview: `README.md`
- App workspace docs: `app/README.md`
- Server workspace docs: `server/README.md`
- Electron workspace docs: `UtilitiesForPC/README.md`

## What The Project Includes

### Main app capabilities

The app navigator currently includes features such as:

- Auth: login, sign up, forgot password, QR login
- Clipboard sync
- Cryptos and market checks
- Translator
- PDF tools and PDF deep-link opening
- Vault
- Notes (native-focused)
- Recorder (native-focused)
- Device information
- Calculator
- Network tools
- Social media integrations
- Down detector
- Games (including Minesweeper)
- Images and markdown viewer
- Phone/computer control tools

Feature screens live under `app/src/features/`.

### Server capabilities

The API server provides:

- Auth and session routes
- Typed database read/write routes
- Crypto, translation, and social routes
- Image conversion route
- Health and debug routes
- Update upload/download routes

The server also runs WebSocket channels:

- `/ws` (general channel)
- `/clipboard` (clipboard sync channel)
- `/ws-login-qr` (QR login channel)

## Monorepo Structure

```text
.
|- app/              Expo app (Android + Web)
|- server/           Express API + PostgreSQL + WebSockets
|- UtilitiesForPC/   Electron shell and desktop runtime
|- common/           Shared cross-workspace helpers/translations
|- types/            Shared TypeScript declarations/contracts
|- scripts/          Root automation/build pipelines
|- implementation-md/ implementation notes/prompts
```

## Tech Stack

- Runtime: Node.js, Yarn workspaces
- Mobile/Web app: Expo 55, React 19, React Native 0.83, React Navigation
- Backend: Express 5, PostgreSQL, `ws`, Firebase Admin, Pino
- Desktop: Electron 40 + preload bridge IPC
- Build tooling: TypeScript, esbuild, ESLint, Prettier

## Requirements

### Core

- Node.js (modern LTS recommended)
- Yarn classic (the repo uses `yarn.lock` and workspaces)
- PostgreSQL (default port `5432`)

### Android development

- Android SDK + platform tools
- Java/JDK compatible with Expo/Gradle setup
- Device/emulator for `expo run:android`

### Electron development/build

- Linux or Windows supported by current scripts
- On Linux, packaging scripts may install system packages and may require `sudo`

## Environment Setup

1. Create `.env` in the repository root.
2. Start from `.env.example` and fill real secrets/URLs.

### Variables present in `.env.example`

```env
__DEV__=false
USE_HTTPS=false
JWT_SECRET=...
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
DEEPL_TRANSLATOR_API=...
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account",...}'
DB_USER=Utilities
DB_PORT=5432
DB_PASS=...
DB_NAME=UtilitiesDB
DB_HOST=localhost
DB_ENCRYPTION_PASS=...
WS_URL=ws://localhost:3000/ws
API_URL=http://localhost:3000/api
FCM_SERVER_KEY=...
ADMIN_PASSWORD=...
IV=0123456789abcdef
```

### Also expected by server env validation

`server/env.ts` additionally validates keys such as:

- `ADMIN_EMAIL`
- `SECRET_KEY_TO_ENCRYPTION`

If missing, defaults/warnings can apply for some values, but secure production configuration should always provide explicit values.

## Install Dependencies

From repo root:

```bash
yarn install
```

## Development Commands (Root)

All commands below are executed from repository root.

### Core workflows

```bash
yarn run app          # Starts Expo app (cache cleared)
yarn run server       # Builds + starts server
yarn run server-dev   # Starts server in dev mode (nodemon)
yarn run start-electron  # Starts Expo web + Electron runtime
yarn run before-commit   # Canonical quality gate across workspaces
```

### Maintenance

```bash
yarn run install-all
yarn run clean
yarn run clean:all
yarn run format-all
yarn run type-check
yarn run app-compile-check   # Kotlin compile check after prebuild
```

### Build and distribution helpers

```bash
yarn run build-web
yarn run app-prebuild-android
yarn run app-build-dev-android
yarn run build-android
yarn run build-upload-android

yarn run build-web-app-electron
yarn run build-resources-electron
yarn run build-app-electron
yarn run build-upload-electron
```

## Typical Local Development

### 1) Start backend

```bash
yarn run server-dev
```

Server defaults:

- API: `http://localhost:3000/api`
- Updates: `http://localhost:3000/updates`
- WebSocket: `ws://localhost:3000/ws`
- Clipboard WS: `ws://localhost:3000/clipboard`

### 2) Start mobile app (Android)

```bash
yarn run app
```

For native Android run:

```bash
yarn run app-prebuild-android
yarn expo run:android
```

### 3) Start desktop app (Electron + Web)

```bash
yarn run start-electron
```

This script runs Expo Web and launches Electron, with keyboard controls in terminal:

- `r`: restart Electron
- `q`: stop processes

## API Surface (Current)

The server registers routes in `server/routes/index.ts` and `server/updates/index.ts`.

### API routes (`/api`)

- `POST /cryptoPrice`
- `POST /cryptos`
- `POST /translate`
- `POST /encrypt`
- `POST /decrypt`
- `GET /health`
- `POST /addStreamer`
- `POST /getIsLiveStreamer`
- `POST /auth/login`
- `POST /auth/signup`
- `POST /auth/refreshSession` (auth middleware)
- `POST /auth/signOut` (auth middleware)
- `POST /database/fetch` (auth middleware)
- `POST /database/insert` (auth middleware)
- `PUT /database/update` (auth middleware)
- `POST /database/delete` (auth middleware)
- `POST /doQueryDB`
- `POST /log`
- `POST /images/changeImageFormat`
- `POST /debug/appAlive`

### Update routes (`/updates`)

- `POST /is-update-available`
- `GET /download/:buildType/:version/:platformOS/:id`
- `POST /upload-update`
- `GET /web-page`

## WebSocket Contracts

Upgrade handling in `server/index.ts` maps pathnames to dedicated websocket servers:

- `/ws` for general app events (including ping/pong)
- `/clipboard` for clipboard synchronization
- `/ws-login-qr` for QR login flow

Client lifecycle and reconnect behavior is implemented in app context providers (for example `app/src/context/WebSocketContext.tsx`).

## Android Native Integration

Native Android sources are under `app/native/` and include modules/packages such as:

- `NativeFunctionsModule`
- `BackgroundServiceModule`
- `NotificationModule`
- Keyboard-related native components

`yarn run app-prebuild-android` injects/copies these native modules into the generated Android project and updates manifest/dependencies.

## Electron Integration

Electron code lives in `UtilitiesForPC/src/`:

- Main process: `UtilitiesForPC/src/main/index.ts`
- Preload bridge: `UtilitiesForPC/src/preload.ts`

Renderer communication is done through typed IPC channels exposed by preload (`contextIsolation: true`, `nodeIntegration: false` in window settings).

## Shared Packages

### `types/`

Shared TS declarations for API payloads, websocket contracts, storage, navigation, translations, and feature domains.

### `common/`

Shared helpers used by app/server/electron, including fetch/error utilities and typed translation dictionaries.

Current translation dictionaries include:

- English
- Spanish

## Quality Gate

Canonical validation command for this repository:

```bash
yarn run before-commit
```

This runs lint/type checks across workspaces (app, server, UtilitiesForPC, types, scripts).

## Troubleshooting

### Build profile/platform errors in app build

The app Babel config requires environment variables:

- `BUILD_PROFILE`
- `PLATFORM`

Use root scripts where possible because they set these values for common flows.

### Android folder issues after native changes

Regenerate and patch Android project:

```bash
yarn run app-prebuild-android
```

### Server starts but some features fail

Check `.env` completeness, especially:

- database credentials
- JWT and encryption keys
- Firebase service account JSON
- translation and push keys

### Electron packaging on Linux

Packaging scripts may request/install system dependencies and need elevated privileges (`sudo`).

## Security Notes

- Do not commit real secrets to `.env`.
- Use strong random values for `JWT_SECRET`, encryption keys, and `IV` requirements.
- Review production `USE_HTTPS`, host exposure, and firewall/network policy before deployment.

## Recommended Pre-Merge Checklist

```bash
yarn install
yarn run server-dev
yarn run app
# (optional) yarn run start-electron
yarn run before-commit
```
