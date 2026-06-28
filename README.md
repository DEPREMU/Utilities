# Utilities

Utilities is a Yarn workspaces monorepo that currently ships:

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

The current app navigation includes:

- Auth flows: Login, SignUp, forgotPassword, and ScanQRCode
- Home, Settings, Clipboard, Vault, DeviceInformation, MarkdownViewer, QR, and PDF screens
- Network, Cryptos, Translator, Calculator, Images, SocialMedia, and DownDetector tools
- Games navigation plus Minesweeper
- Recorder, ComputerControl, and TerminalCommands for native or web-aware control flows
- Notes, which is native-only because the web build does not load the same storage stack
- Test, which is only available in dev builds

Feature screens live under `app/src/features/` and are wired through `app/src/app/AppNavigator.tsx`.

### Server capabilities

The API server currently provides route groups for:

- Auth and session flows
- Info and health checks
- Logs read/write/delete operations
- Image format conversion
- Cryptos lookup and price endpoints
- Translation requests
- Streamer lookup and registration helpers
- Encryption and decryption helpers
- Update availability, download, and upload endpoints
- Development-only database query helpers

The server also runs WebSocket channels:

- `/ws` (general channel)
- `/clipboard` (clipboard sync channel)
- `/ws-cryptos` (crypto feed channel)
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
```

## Tech Stack

- Runtime: Node.js, Yarn workspaces
- Mobile/Web app: Expo 56, React 19.2.3, React Native 0.85.3, React Navigation
- Backend: Express 5, PostgreSQL, ws, Firebase Admin, Prisma 7.8.0, Pino
- Desktop: Electron 42.5.0 with preload bridge IPC
- Build tooling: TypeScript, esbuild, ESLint, Prettier

## Requirements

### Core

- Node.js (modern LTS recommended)
- Yarn classic (the repo uses `yarn.lock` and workspaces)
- PostgreSQL (default port `5432`)

### Android development

- Android SDK + platform tools
- Java/JDK compatible with the Expo and Gradle setup
- Device or emulator for `expo run:android`

### Electron development/build

- Windows or Linux for the current packaging flow
- On Linux, packaging scripts may install system packages and may require `sudo`

## Environment Setup

1. Create `.env` in the repository root.
2. Populate the values used by the app, server, and desktop build from the current config files.

### Variables consumed by the current configuration

```env
__DEV__=false
USE_HTTPS=false
BUILD_PROFILE=development|production|preview
PLATFORM=android|web|electron
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
ADMIN_EMAIL=...
ADMIN_PASSWORD=... application password for admin user
SECRET_KEY_TO_ENCRYPTION=...
IV=0123456789abcdef
```

The app config also reads `WS_URL`, `API_URL`, and `ADMIN_PASSWORD` into Expo `extra`, and the app Babel config requires `BUILD_PROFILE` and `PLATFORM` when the root scripts do not set them for you.

The server environment validation currently checks values such as `ADMIN_EMAIL` and `SECRET_KEY_TO_ENCRYPTION` in addition to the database, auth, encryption, Firebase, and push-notification keys above.

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
yarn run update-assets
yarn run build-autocomplete-dict
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

- Auth: `POST /auth/login`, `POST /auth/signup`, `POST /auth/signout`, `POST /auth/refreshSession`
- Info: `GET /info/health`, `GET /info/generate204`, `GET /info/appAlive/:deviceId/:pushToken`
- Logs: `GET /logs`, `GET /logs/page`, `GET /logs/page/:page`, `POST /logs/add`, `DELETE /logs/:logId`
- Images: `POST /images/change-format`
- Cryptos: `GET /cryptos`, `GET /cryptos/:symbol`, `GET /cryptos/price/:symbol`
- Languages: `POST /languages/translate`
- Streamers: `GET /streamers`, `GET /streamers/page`, `GET /streamers/:userId`, `GET /streamers/streamer/:streamerId`, `GET /streamers/add/:userId/:streamerName`
- Encryption: `POST /encryption/decrypt`, `POST /encryption/encrypt`
- Dev-only: `POST /dev/executeQuery`
- Updates: `GET /updates/is-update-available/:version/:buildType`, `GET /updates/is-update-available/:version/:buildType/:platform`, `GET /updates/download/:id`, `POST /updates/upload`

## WebSocket Contracts

Upgrade handling in `server/index.ts` maps pathnames to dedicated websocket servers:

- `/ws` for general app events (including ping/pong)
- `/clipboard` for clipboard synchronization
- `/ws-cryptos` for crypto price feeds
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

- Main process: `UtilitiesForPC/src/main/app.ts`
- Preload bridge: `UtilitiesForPC/src/preload/index.ts`

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
