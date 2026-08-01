---
trigger: always_on
---

# Gemini Instructions for Utilities Project

## Purpose

This file defines high-signal rules for working in this repository.
If two rules conflict, prioritize: correctness, type safety, resource cleanup, and existing repository patterns.

## Project Layout

- `app/`: React Native (Expo) app for Android + Web (Electron renderer).
- `server/`: Node.js Express + prisma (PostgreSQL) + WebSocket services.
- `UtilitiesForPC/`: Electron desktop shell for the web build.
- `types/`: Shared type declarations used by all workspaces.
- `common/`: Shared cross-workspace helpers, functions and variables.
- `scripts/`: Build, dev, formatting, and automation scripts.

## Import Rules

- In `app/`, use path aliases from `app/babel.config.ts` and `app/tsconfig.json`.
- Do not introduce relative imports when an alias exists.
- Keep shared contracts in `types/` and import them through `@types`.

Example:

```ts
import Screen from "@screens/MyScreen";
import { utility } from "@utils";
import { useModal } from "@context/ModalContext";
import { Something } from "@types";
```

## Platform-Aware Pattern

Use the Electron bridge on web/electron runtime and native modules on Android.

```ts
import { REPLACERS } from "@utils";
import { windowModule } from "@modules/WindowModule";
import { BackgroundModule } from "@modules/BackgroundModule";

if (REPLACERS.isWeb) {
  await windowModule.functionName();
} else if (REPLACERS.isNative) {
  await BackgroundModule.nativeFunction();
}
```

## Context And Lifecycle Rules

- `app/context/AppProviders.tsx` provider order matters; preserve dependency ordering.
- Always clear timers/intervals/subscriptions/sockets in `useEffect` cleanup.
- Before creating a new timer/interval, clear an existing ref-backed instance first.
- `WebSocketContext`: tear down sockets and ping timers on background/error.

## WebSocket Expectations

- Server maintains four channels: `ws` (general), `clipboard` (clipboard sync), `ws-cryptos` (crypto sync), and `ws-login-qr` (QR login).
- Client should use ping/pong keepalive (~29s), exponential reconnect, and deterministic teardown.
- General socket should close on app background where required.
- Clipboard socket should suspend/resume correctly on supported mobile lifecycle events.

## Type Safety Rules

- Add shared types in `types/` before feature implementation.
- Avoid `any`; use explicit types for API payloads, context values, and public function contracts.
- Keep backward compatibility when modifying shared type declarations.

## i18n Rules

- Use `t` translation keys with full typed paths (example: `common.notAvailable`).
- Do not use raw user-visible string literals in JSX when a translation key is expected.
- For new keys, update all three files: `common/both/translations/English.ts`, `common/both/translations/Spanish.ts`, and `types/typesTranslations.d.ts`.

## Database And API Rules

- Prefer typed database helpers in `server/database/functions.ts`.
- Validate table/shape usage through shared table/type maps.
- Keep request/response types aligned with `types/typesAPI.d.ts`.
- Handle errors close to source and avoid logging secrets or sensitive values.

## Build And Dev Commands

```bash
yarn install
yarn run server-dev
yarn run app
yarn run start-electron
yarn run type-check
yarn run format-all
```

Native Android workflow:

```bash
yarn run app-prebuild-android
yarn run app-build-dev-android
```

Pre-merge check:

```bash
yarn run before-commit
```

Validation source of truth:

- Use `yarn run before-commit` as the canonical quality gate for this repository.
- Do not block changes based only on external/unmanaged checks that are not part of project scripts.
- If an external tool reports an issue but `yarn run before-commit` passes, treat it as a likely false positive unless a real runtime/type failure is reproducible.

## Standard Work Protocol

Follow this sequence for every non-trivial change:

1. Read affected files and confirm existing patterns before editing.
2. Define or update shared types first when data contracts change.
3. Implement the smallest safe change that satisfies the requirement.
4. Validate platform impact (Android and Web/Electron where applicable).
5. Run quality checks (`yarn run before-commit` at minimum) before finalizing.
6. Document known caveats in `ProblemsDetected.md` when applicable.

When requirements are ambiguous, prefer preserving current behavior and extending it incrementally instead of broad refactors.

## Code Writing Conventions

- Keep functions small and focused on one responsibility.
- Prefer guard clauses and early exits over deep nesting.
- Keep side effects isolated near edges (I/O, storage, sockets, native modules).
- Avoid hidden mutations; prefer explicit immutable updates.
- Reuse existing utilities/hooks before creating new abstractions.
- Use descriptive names: `verbNoun` for functions, `is/has/can` prefixes for booleans.
- Co-locate types close to domain boundaries; promote to `types/` when shared.
- Write defensive null/undefined checks around runtime/platform bridges.
- Keep logs actionable and structured; never include secrets, tokens, or PII.

## Pull Request Readiness

Before considering a change complete, ensure:

1. Contracts and types are updated and backward-compatible.
2. New user-facing text uses translation keys and updated dictionaries.
3. Resource cleanup is deterministic (timers, intervals, sockets, listeners).
4. Platform-specific branches were reviewed for Android and Web/Electron.
5. Project checks pass using `yarn run before-commit` (authoritative gate for lint/type validation) or `yarn run app-compile-check` if any native code is involved.
6. Manual verification steps are clear and reproducible.

## Quality Checklist For Changes

When adding or modifying features:

1. Add or update shared types first.
2. Use alias imports and repository utilities.
3. Add/update translations and typed translation keys.
4. Ensure lifecycle cleanup for all resources.
5. Validate behavior on Android and Web/Electron when applicable.
6. Update `ProblemsDetected.md` if known caveats are introduced.

## Style And Implementation Rules

- Prefer early returns to reduce nesting.
- Prefer `async/await` over `.then()` chains.
- Use arrow functions consistently for new functions.
- Favor array methods (`map`, `filter`, `reduce`) over manual loops when clearer.
- Keep formatting and naming consistent with surrounding code in the same module.
- Avoid optional behavior hidden behind implicit defaults; make intent explicit.
- Follow project formatting/linting conventions.
- If adding explanatory comments, end each explanation comment with `//! DELETE`.
- Keep comments in English and avoid emoji in code comments.

## Documentation Scope

- Place feature/function walkthrough docs in `implementation-md/` when needed.