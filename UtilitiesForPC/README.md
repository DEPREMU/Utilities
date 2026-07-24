# UtilitiesForPC Workspace (`UtilitiesForPC`)

Electron desktop runtime for the Utilities web app build, with a preload bridge and native desktop integrations.

## Documentation Map

- Monorepo docs: [../README.md](../README.md)
- App docs: [../app/README.md](../app/README.md)
- Server docs: [../server/README.md](../server/README.md)
- Electron docs: [README.md](README.md)

## Scope

This workspace provides:

- Electron main-process code in [src/main/app.ts](src/main/app.ts)
- Preload bridge code in [src/preload/index.ts](src/preload/index.ts)
- Desktop packaging through the `build` field in [package.json](package.json)
- IPC features used by the web renderer for clipboard, notifications, command execution, vault helpers, file and temp helpers, PDF creation, zip handling, and native data access

## Runtime Architecture

### Main process

Main entry: [build/index.cjs](build/index.cjs), compiled from [src/main/app.ts](src/main/app.ts).

Main process responsibilities include:

- Browser window and tray lifecycle
- Startup and shutdown handling
- Auto-start setup for Windows and Linux packaged runs
- Optional system dependency checks on Linux packaged runs
- Internal local server startup, update checks, memory monitoring, and clipboard window setup

In packaged mode, it loads built web assets from [dist/index.html](dist/index.html).
In development mode, it loads Expo web from `http://localhost:8081`.

### Preload bridge

[src/preload/index.ts](src/preload/index.ts) exposes typed `window.UtilitiesForPC.*` APIs through IPC with `contextIsolation: true` and `nodeIntegration: false`.

The bridge currently covers:

- Clipboard read/write/history
- Native and system power actions
- App storage load/save/remove
- Notifications
- Command execution
- PDF creation with progress callbacks
- Vault file actions and folder picking
- Safe-folder, file-info, zip, and encrypted vault helpers
- Electron build detection and native data access

## Scripts From `UtilitiesForPC/package.json`

Run from this folder:

```bash
yarn run type-check
yarn run before-commit
```

The full build and packaging flows are driven from the repository root scripts.

## Recommended Root Commands

Use root orchestration scripts for full flows:

```bash
yarn run start-electron
yarn run build-web-app-electron
yarn run build-resources-electron
yarn run build-app-electron
yarn run build-upload-electron
```

`start-electron` interactive controls:

- `r` restarts Electron after rebuilding resources
- `q` quits the managed processes

## Packaging Configuration

Configured in the `build` field of [package.json](package.json):

- `appId`: `com.utilities.depremu`
- `productName`: `UtilitiesForPC`
- Output directory: `dist-electron`
- Targets: Windows `nsis`, Linux `deb`
- Extra resources copied: `dist/` and `assets/`
- Windows packaging requests administrator privileges

## Dependencies

Key runtime dependencies include:

- `electron`
- `electron-builder`
- `electron-store`
- `bonjour-service`
- `sharp`
- `pdfkit`
- `node-7z` and `7zip-bin`

## Development Notes

- In development, Electron expects the Expo web dev server at `http://localhost:8081`.
- In packaged runs, the main process loads `dist/index.html` and starts the internal server/update flow.
- In packaged runs on Linux, setup may perform additional dependency and autostart steps that require elevated privileges.
- The renderer must not access Node directly; use the preload IPC APIs.

## Quality Gate

Workspace-local and repository-level canonical gate:

```bash
yarn run before-commit
```

## Troubleshooting

### Electron window does not load in development

Ensure Expo web is running and reachable at `http://localhost:8081`.

### IPC methods unavailable in the renderer

Check the preload build output and confirm the context bridge is loaded.

### Linux package issues

Install the required system libraries and run packaging commands with proper permissions when needed.
