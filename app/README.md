# App Workspace (`app`)

Expo React Native application for Android and Web.

## Documentation Map

- Monorepo docs: `../README.md`
- App docs: `README.md`
- Server docs: `../server/README.md`
- Electron docs: `../UtilitiesForPC/README.md`

## Scope

This workspace contains the user-facing app UI, navigation, contexts, and native Android bridge integration.

Key areas:

- Entry point: `src/index.tsx`
- App shell: `src/app/App.tsx`
- Navigation: `src/app/AppNavigator.tsx`
- Features: `src/features/`
- Context providers: `src/context/`
- Native Android sources/templates: `native/`

## Supported Platforms

- Android (native)
- Web (used by Electron shell from `UtilitiesForPC`)
- iOS is explicitly not supported by scripts (`ios` script prints `Not Supported`)

## Features In Navigation

Current stack includes screens/modules such as:

- Auth (`Login`, `SignUp`, `forgotPassword`, `ScanQRCode`)
- Home
- Vault
- Notes (native-focused)
- Recorder (native-only)
- PDF
- Clipboard
- Calculator
- Network
- Cryptos
- Translator
- SocialMedia
- DownDetector
- Games + Minesweeper
- Images
- Markdown viewer
- Device information
- Computer control and terminal tools (platform-aware)

## Configuration

Main Expo config: `app.config.ts`

Important behavior:

- Build profile is required (`BUILD_PROFILE` must exist)
- Platforms are configured as `android` and `web`
- Runtime version changes by profile
- App version currently based on `0.3.0-beta`
- `extra` includes values derived from root `.env` (WS/API URLs, admin password)

Babel behavior (`babel.config.ts`) depends on:

- `PLATFORM`
- `BUILD_PROFILE`

Use root scripts when possible, because they inject these environment values.

## Scripts (From `app/package.json`)

Run from this folder:

```bash
yarn run before-commit
yarn run lint:fix
yarn run type-check
yarn run android
```

## Recommended Commands (From Repository Root)

These are the most reliable commands for this workspace:

```bash
yarn run app                     # expo start -c
yarn run app-prebuild-android    # regenerate + patch android native tree
yarn run app-build-dev-android   # dev build helper flow
yarn expo run:android            # native Android run
```

## Native Android Integration

Native templates and modules live in `native/`.

The prebuild script (`yarn run app-prebuild-android` from root) performs actions such as:

- Copies native Kotlin modules into generated Android package paths
- Updates `MainApplication.kt` package registration
- Applies manifest service/permission updates
- Injects additional Gradle dependencies and packaging rules
- Syncs localized native strings

If native files changed, rerun prebuild before compiling Android.

## Environment Inputs

This workspace reads values from root `.env` via Expo config/scripts.

Commonly required:

- `BUILD_PROFILE`
- `PLATFORM` (set by scripts)
- `WS_URL`
- `API_URL`
- `ADMIN_PASSWORD`

## Quality Gate

Workspace-local:

```bash
yarn run before-commit
```

Repository-level canonical gate:

```bash
yarn run before-commit
```

## Troubleshooting

### `BUILD_PROFILE environment variable is not set`

Run through root scripts (`yarn run app` or `yarn run app-prebuild-android`) or export `BUILD_PROFILE` before direct commands.

### Android compile or native module errors

Re-run:

```bash
yarn run app-prebuild-android
```

Then compile again.

### Web build behaves differently than Android

Some screens are platform-gated in navigation (`REPLACERS.isWeb` / `REPLACERS.isNative`). Validate behavior on both platforms.
