# Utilities

Utilities is a Yarn workspaces monorepo. It currently contains:

- An Expo React Native app for Android and Web in [app/](app/)
- A Node.js + Express + PostgreSQL + WebSocket backend in [server/](server/)
- An Electron desktop wrapper for the web build in [UtilitiesForPC/](UtilitiesForPC/)
- Shared contracts and helpers in [types/](types/) and [common/](common/)
- Root orchestration scripts in [scripts/](scripts/)

Repository: https://github.com/DEPREMU/Utilities

## Documentation Map

- Monorepo overview: [README.md](README.md)
- App workspace docs: [app/README.md](app/README.md)
- Server workspace docs: [server/README.md](server/README.md)
- Electron workspace docs: [UtilitiesForPC/README.md](UtilitiesForPC/README.md)

## Current Surface Area

### App

The navigation stack in [app/src/app/AppNavigator.tsx](app/src/app/AppNavigator.tsx) currently includes:

- Auth screens: `Login`, `SignUp`, `forgotPassword`, `ScanQRCode`
- Core screens: `Home`, `Settings`, `Clipboard`, `Vault`, `DeviceInformation`, `MarkdownViewer`, `QR`, `PDF`
- Utility screens: `Network`, `Cryptos`, `Translator`, `Calculator`, `Images`, `SocialMedia`, `DownDetector`
- Game screens: `Games`, `Minesweeper`
- Platform-aware screens: `Recorder`, `ComputerControl`, `TerminalCommands`, `Notes`
- Development-only screen: `Test`

The app targets Android and Web only. The iOS script in [app/package.json](app/package.json) prints `Not Supported` and exits.

### Server

The backend routes in [server/routes/index.ts](server/routes/index.ts) currently expose:

- Auth, info, logs, admin, images, cryptos, updates, languages, streamers, clipboard, encryption, user config, down detector, and user notifications config
- Dev-only routes under `/dev` when `REPLACERS.isDev` is true

The server accepts WebSocket upgrades on these paths:

- `/ws`
- `/clipboard`
- `/ws-cryptos`
- `/ws-login-qr`

### Electron

Electron main-process code lives in [UtilitiesForPC/src/main/app.ts](UtilitiesForPC/src/main/app.ts) and the preload bridge lives in [UtilitiesForPC/src/preload/index.ts](UtilitiesForPC/src/preload/index.ts). The preload bridge exposes typed `window.UtilitiesForPC` APIs for clipboard, notifications, system power actions, command execution, PDF creation, vault/file helpers, temp-file helpers, zip helpers, and stored native data access.

## Repository Layout

```text
.
|- app/              Expo app (Android + Web)
|- server/           Express API + PostgreSQL + WebSockets
|- UtilitiesForPC/   Electron shell and desktop runtime
|- common/           Shared helpers and translations
|- types/            Shared TypeScript declarations and contracts
|- scripts/          Root orchestration and build scripts
```

## Tech Stack

- Runtime: Node.js and Yarn workspaces
- App: Expo, React 19.2.3, React Native 0.86.0, React Navigation
- Backend: Express 5, PostgreSQL, ws, Firebase Admin, Prisma 7.8.0
- Desktop: Electron 42.5.0 with a typed preload bridge
- Tooling: TypeScript, esbuild, ESLint, Prettier

## Requirements

- Node.js (modern LTS recommended)
- Yarn classic
- PostgreSQL on the default local port `5432`
- Android SDK, platform tools, and a compatible JDK for native Android work
- Windows or Linux for the Electron packaging flow

Linux packaging may install system packages and can require `sudo`.

## Environment Setup

Create a root `.env` file and populate the values used by the app and server config.

### App config inputs

The Expo config in [app/app.config.ts](app/app.config.ts) and Babel setup in [app/babel.config.ts](app/babel.config.ts) rely on:

- `BUILD_PROFILE`
- `PLATFORM`
- `WS_URL`
- `API_URL`

When building Android on EAS, [app/plugins/handleCreateFiles.js](app/plugins/handleCreateFiles.js) also expects `GOOGLE_SERVICES_JSON` so it can write `android/app/google-services.json`.

### Server env validation

The server validates these values in [server/env.ts](server/env.ts):

- `IV`
- `WS_URL`
- `__DEV__`
- `DB_PORT`
- `DB_USER`
- `DB_PASS`
- `DB_NAME`
- `DB_HOST`
- `API_URL`
- `USE_HTTPS`
- `JWT_SECRET`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `DB_ENCRYPTION_PASS`
- `DEEPL_TRANSLATOR_API`
- `FIREBASE_SERVICE_ACCOUNT`
- `SECRET_KEY_TO_ENCRYPTION`

## Root Commands

Run these from the repository root:

```bash
yarn install
yarn run app
yarn run server
yarn run server-dev
yarn run type-check
yarn run before-commit
yarn run build-web
yarn run app-compile-check
yarn run app-prebuild-android
yarn run app-build-dev-android
yarn run build-web-app-electron
yarn run build-resources-electron
yarn run build-app-electron
yarn run build-upload-electron
yarn run build-android
yarn run build-upload-android
yarn run update-assets
yarn run build-autocomplete-dict
yarn run clean
yarn run clean:all
yarn run format-all
```

The root orchestrator in [scripts/run.ts](scripts/run.ts) maps these commands to workspace-specific flows. Notable ones are `app` for Expo, `server` and `server-dev` for the backend, `build-web` for the web export, and `start-electron` for the Expo Web + Electron runtime.

## Typical Local Workflows

### Backend

```bash
yarn run server-dev
```

This starts the backend in a restart-on-change loop and exposes the API under `/api` plus the WebSocket endpoints listed above.

### Android app

```bash
yarn run app
```

For native Android work, run the Android prebuild first:

```bash
yarn run app-prebuild-android
yarn expo run:android
```

### Electron desktop app

```bash
yarn run start-electron
```

This starts the Expo web build and launches Electron. The runtime accepts terminal controls such as `r` to restart Electron and `q` to stop the managed processes.

## Quality Gate

The canonical validation command for the repo is:

```bash
yarn run before-commit
```

## Troubleshooting

- If the app build complains that `BUILD_PROFILE` or `PLATFORM` is missing, use the root scripts instead of running workspace commands directly.
- If Android native changes are not reflected, rerun [app-prebuild-android](app/README.md) from the root.
- If server features fail at startup, verify the database, auth, encryption, Firebase, and notification env values in [server/env.ts](server/env.ts).
- If Electron packaging on Linux fails, check system dependencies and permissions first.
