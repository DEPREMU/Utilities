<!--
Sync Impact Report:
- Version change: 1.1.0 → 1.1.1
- Modified principles:
  - Quality Gate (updated to mandate running before-commit and fixing all errors/warnings before finishing a feature)
- Added sections: None
- Removed sections: None
- Follow-up TODOs: None
-->

# Utilities Constitution

## Core Principles

### I. Strict Import & Type Safety
All shared type declarations MUST reside in `types/` before feature implementation. You MUST NOT use `any` under any circumstances. Always strictly type every single value. For getters/setters, use generics mapped to the type definition (e.g., `type Values = { v1: T1, v2: T2 };` with `getValue<T extends keyof Values>(key: T): Values[T]`). In `app/`, always use path aliases instead of relative imports.

### II. Deterministic Resource Management
Always clear timers, intervals, subscriptions, and WebSocket connections in `useEffect` cleanup. Before creating a new timer/interval, clear the existing ref-backed instance. Context providers dependency ordering must be preserved.

### III. Platform-Aware Architecture
Code MUST account for multiple runtimes (Android, Web/Electron). Use the Electron bridge on web runtimes and native modules on Android. Write defensive null/undefined checks around runtime/platform bridges.

### IV. Robust WebSocket Communication
Maintain specific channels (`ws`, `clipboard`, `ws-cryptos`, `ws-login-qr`). Implement ping/pong keepalive (~29s), exponential reconnect, and deterministic teardown on app background or error.

### V. Internationalization (i18n) by Default
New user-visible text MUST use `t()` with fully typed paths. Never use raw string literals in JSX for user-visible text. Always update `English.ts`, `Spanish.ts`, and `typesTranslations.d.ts` simultaneously.

### VI. Code Placement & Dependencies
If a piece of code does not require any external dependency, you MUST create the file in `common/both`. If the code has a dependency that cannot be used across all platforms (e.g., unavailable on Web/React Native), create the file in `common/serverOrElectron` or directly within the respective workspace.

### VII. DRY (Don't Repeat Yourself)
Do not repeat yourself. If a function, variable, or class already exists that performs the expected functionality, you MUST reuse it rather than creating a new duplicate function.

### VIII. Build-Time Replacers
Use `REPLACERS` (e.g., `REPLACERS.isWeb`, `REPLACERS.isNative`) when conditional logic is needed for platforms or environments. These variables are replaced during the build process, ensuring unused code is safely deleted.

### IX. Documentation & Comments
Do NOT add inline comments to the code. The only permitted documentation format is JSDoc blocks placed strictly on functions.

## Standard Work Protocol & Quality Gates

- **Pre-requisites**: Read affected files to confirm existing patterns before editing. Define or update shared types first.
- **Implementation**: Implement the smallest safe change. Validate behavior on both Android and Web/Electron. 
- **Quality Gate**: `yarn run before-commit` is the canonical quality gate for the repository. Before finishing a feature or an addition, you MUST run `yarn run before-commit` and fix any errors or linting warnings it returns. The task is not considered finished until `before-commit` passes without errors or warnings. External tools' reports are considered false positives if `before-commit` passes unless a real failure is reproducible. For native code, use `yarn run app-compile-check`.
- **Documentation**: Document any known caveats introduced in `ProblemsDetected.md`. For new features, add walkthrough docs in `implementation-md/` if needed.

## Coding Style & Pull Request Readiness

- **Conventions**: Keep functions small and focused. Prefer guard clauses, `async/await`, array methods, explicit immutable updates, and early returns over deep nesting. Co-locate types close to domain boundaries. Keep side effects isolated near edges.
- **Review Readiness**: Before considering a change complete, ensure: contracts/types updated, new strings localized, deterministic cleanup confirmed, platform specific branches tested, and manual verification steps are clear.

## Governance

The Constitution supersedes all other practices. All work must align with the defined standard work protocol. Changes to shared contracts, resources teardown, and cross-platform logic MUST be rigorously tested and comply with `yarn run before-commit`. Amendments require documentation and compliance with the core principles.

**Version**: 1.1.1 | **Ratified**: 2026-08-08 | **Last Amended**: 2026-08-09
