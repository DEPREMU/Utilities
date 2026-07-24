# App Workspace (`app`)

Expo React Native application for Android and Web.

## Documentation Map

- Monorepo docs: [../README.md](../README.md)
- App docs: [README.md](README.md)
- Server docs: [../server/README.md](../server/README.md)
- Electron docs: [../UtilitiesForPC/README.md](../UtilitiesForPC/README.md)

## Scope

This workspace contains the user-facing app UI, navigation, contexts, PDF deep-link handling, and native Android bridge integration.

Key areas:

- Entry point: [src/index.tsx](src/index.tsx)
- App shell: [src/app/App.tsx](src/app/App.tsx)
- Navigation: [src/app/AppNavigator.tsx](src/app/AppNavigator.tsx)
- Features: [src/features/](src/features/)
- Context providers: [src/context/](src/context/)
- Native Android sources and templates: [native/](native/)

## Supported Platforms

- Android
- Web, used by the Electron shell from [UtilitiesForPC/](../UtilitiesForPC/)
- iOS is not supported by the current scripts; the `ios` script prints `Not Supported`

## Navigation

The current stack in [src/app/AppNavigator.tsx](src/app/AppNavigator.tsx) includes:

- Auth: `Login`, `SignUp`, `forgotPassword`, `ScanQRCode`
- Core: `Home`, `Settings`, `Clipboard`, `Vault`, `DeviceInformation`, `MarkdownViewer`, `QR`, `PDF`
- Productivity: `Network`, `Cryptos`, `Translator`, `Calculator`, `Images`, `SocialMedia`, `DownDetector`
- Games: `Games` and `Minesweeper`
- Platform-aware tools: `Recorder`, `ComputerControl`, `TerminalCommands`, `Notes`
- Development-only screen: `Test`

Platform gating currently works like this:

- Web redirects away from `Recorder`, `ScanQRCode`, `ComputerControl`, and `Notes`
- Native redirects away from `TerminalCommands`
- `Test` only resolves to the test screen in development builds

## Configuration

Main Expo config: [app.config.ts](app.config.ts)

Important behavior:

- `BUILD_PROFILE` is required
- Supported platforms are `android` and `web`
- The app version is based on `0.4.0-beta`
- Runtime version changes by profile
- `extra` includes `version`, `WS_URL_BASE`, `API_URL_BASE`, and the EAS project id
- The Android package name changes by build profile when the build is not production

Babel behavior in [babel.config.ts](babel.config.ts) depends on:

- `PLATFORM`
- `BUILD_PROFILE`

Use the root scripts when possible, because they set these values for common flows.

## Scripts From `app/package.json`

Run from this folder:

```bash
yarn run before-commit
yarn run lint:fix
yarn run type-check
yarn run android
yarn run ios
```

`before-commit` runs `lint:fix` and `type-check`. `ios` is intentionally unsupported.

## Recommended Root Commands

These are the most reliable commands for this workspace:

```bash
yarn run app
yarn run app-prebuild-android
yarn run app-build-dev-android
yarn expo run:android
```

`yarn run app` starts Expo with a cleared cache. `yarn run app-prebuild-android` regenerates the native Android tree before compilation.

## Native Android Integration

Native templates and modules live in [native/](native/).

The root prebuild script [scripts/app/app-prebuild.ts](../scripts/app/app-prebuild.ts) performs the current Android sync flow:

- Deletes the existing generated Android folder before prebuilding
- Requires `google-services.json` in the app root
- Runs `expo prebuild --platform android --clean`
- Generates native modules from [native/modules.json](native/modules.json)
- Updates `AndroidManifest.xml` with required permissions, service entries, and the PDF view intent filter
- Updates `MainApplication.kt` with native package registration
- Adds Gradle dependencies and packaging rules
- Syncs localized native strings into Android resources
- Updates `gradle.properties` memory settings when needed

The plugin in [plugins/handleCreateFiles.js](plugins/handleCreateFiles.js) creates `android/app/google-services.json` from `GOOGLE_SERVICES_JSON` during EAS Android builds.

If native files change, rerun `yarn run app-prebuild-android` before compiling Android.

## Environment Inputs

This workspace reads values from the root `.env` through Expo config and scripts.

Commonly required inputs are:

- `BUILD_PROFILE`
- `PLATFORM`
- `WS_URL`
- `API_URL`

For EAS Android builds, `GOOGLE_SERVICES_JSON` is also required so the plugin can write the native Google services file.

## Quality Gate

Workspace-local and repository-level canonical gate:

```bash
yarn run before-commit
```

## Troubleshooting

### `BUILD_PROFILE environment variable is not set`

Run through the root scripts (`yarn run app` or `yarn run app-prebuild-android`) or export `BUILD_PROFILE` before direct commands.

### Android compile or native module errors

Re-run:

```bash
yarn run app-prebuild-android
```

Then compile again.

### Web build behaves differently than Android

Some screens are platform-gated in navigation. Validate behavior on both platforms when changing those flows.
