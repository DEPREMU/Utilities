# UtilitiesForPC Workspace (`UtilitiesForPC`)

Electron desktop runtime for the Utilities web app build, with a preload bridge and native desktop integrations.

## Documentation Map

- Monorepo docs: `../README.md`
- App docs: `../app/README.md`
- Server docs: `../server/README.md`
- Electron docs: `README.md`

## Scope

This workspace provides:

- Electron main process (`src/main/`)
- Preload bridge (`src/preload.ts`)
- Desktop packaging (`electron-builder` config in `package.json`)
- IPC features used by the web renderer (clipboard, notifications, command execution, vault helpers, file/temp helpers, and more)

## Runtime Architecture

### Main process

Main entry: `build/index.cjs` (compiled from `src/main/index.ts`).

Main process responsibilities include:

- Browser window/tray lifecycle
- Startup and shutdown handling
- Auto-start setup (Windows/Linux packaged paths)
- Optional system dependency checks on Linux packaged runs
- Internal local server startup and update checks

In packaged mode, it loads built web assets from `dist/index.html`.
In dev mode, it loads Expo web from `http://localhost:8081`.

### Preload bridge

`src/preload.ts` exposes typed `window.UtilitiesForPC.*` APIs via IPC with `contextIsolation: true` and `nodeIntegration: false`.

Bridge includes operations such as:

- Clipboard read/write/history
- Native/system actions (shutdown/restart/auth)
- App storage load/save/remove
- Notifications
- Command execution
- PDF creation with progress callback
- Vault file actions and folder picking

## Scripts (From `UtilitiesForPC/package.json`)

Run from this folder:

```bash
yarn run type-check
yarn run before-commit
```

## Recommended Commands (From Repository Root)

Use root orchestration scripts for full flows:

```bash
yarn run start-electron              # starts Expo web + Electron
yarn run build-web-app-electron      # exports app web build and stages dist
yarn run build-resources-electron    # builds Electron main + preload outputs
yarn run build-app-electron          # packages app (linux/windows flow)
yarn run build-upload-electron       # upload helper flow
```

`start-electron` interactive controls:

- `r`: restart Electron (rebuild resources)
- `q`: quit all managed processes

## Packaging Configuration

Configured in `package.json` `build` field:

- `appId`: `com.utilities.depremu`
- `productName`: `UtilitiesForPC`
- Output directory: `dist-electron`
- Targets:
  - Windows: `nsis`
  - Linux: `deb`
- Extra resources copied: `dist/`, `assets/`

## Dependencies

Key runtime dependencies include:

- `electron`
- `electron-builder`
- `electron-store`
- `bonjour-service`
- `sharp`
- `pdfkit`
- `node-7z` + `7zip-bin`

## Development Notes

- In dev, Electron expects Expo web dev server to be available.
- In packaged runs on Linux, setup may perform additional dependency/autostart steps requiring elevated privileges.
- Renderer must not access Node directly; use preload IPC APIs.

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

### Electron window does not load in dev

Ensure Expo web is running and reachable at `http://localhost:8081`.

### IPC methods unavailable in renderer

Check preload build output (`build/preload.cjs`) and confirm context bridge is loaded.

### Linux package issues

Install required system libs and run packaging commands with proper permissions where needed.
