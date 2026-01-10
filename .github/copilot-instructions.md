# Copilot Instructions for Utilities Project

## Project Architecture

This is a **cross-platform utility app** with three interconnected workspaces:

- **`app/`** - React Native (Expo) app targeting Android, iOS, and Web (Electron)
- **`server/`** - Node.js Express server with PostgreSQL + WebSocket servers
- **`UtilitiesForPC/`** - Electron desktop app wrapper for the web build
- **`types/`** - Shared TypeScript definitions across all workspaces

## Path Aliases (Critical)

All imports use Babel/TypeScript path aliases defined in `app/babel.config.js` and `app/tsconfig.json`:

```typescript
import Screen from "@screens/MyScreen"; // app/screens/MyScreen
import Component from "@components/MyComp"; // app/components/MyComp
import { utility } from "@utils"; // app/utils/index.ts
import { Something } from "@types"; // ../types/index.d.ts
import { commonUtil } from "@common"; // common/both/index.ts
import { useContext } from "@context/MyCtx"; // app/context/MyCtx
```

**Never use relative imports** - always use these aliases.

## Platform-Specific Code Pattern

The app supports **web (Electron), Android, and native**. Platform detection:

```typescript
import { Platform } from "react-native";
import { windowModule } from "@/utils/modules/WindowModule"; // Electron bridge
import { BackgroundModule } from "@/utils/modules/BackgroundModule"; // Native module

if (Platform.OS === "web") {
  // Use windowModule for Electron bridge
  windowModule.functionName();
} else if (Platform.OS === "android") {
  // Use native modules
  BackgroundModule?.nativeFunction?.();
}
```

### Electron Bridge (`UtilitiesForPC/`)

- **`src/preload.ts`** - Exposes native functions to renderer via `contextBridge`
- **`app/utils/modules/WindowModule.ts`** - Type-safe wrapper to access Electron APIs
- Communication: `ipcRenderer.invoke()` for async, `.send()` for fire-and-forget

Example:

```typescript
// In renderer (app/)
const result = await windowModule.executeCommand("ls -la");

// In preload (UtilitiesForPC/src/preload.ts)
executeCommand: async (command) => {
  return await ipcRenderer.invoke("execute-command", command);
};
```

## React Context Pattern

**9 providers** wrap the app in `app/context/AppProviders.tsx` (order matters for dependencies):

```typescript
BackgroundProvider → SafeAreaProvider → ThemeProvider →
DeviceInformationProvider → LayoutProvider → UserProvider → LanguageProvider →
ModalProvider → NotificationsProvider → WebSocketProvider → AppNavigator → Screens
```

### Critical Memory Management Rules

**ALWAYS clean up resources in `useEffect` returns:**

```typescript
// 1. Store refs for cleanup
const intervalRef = useRef<number | null>(null);

useEffect(() => {
  // 2. Clear previous before creating new
  clearIntervalPolyfill(intervalRef);

  // 3. Create new resource
  intervalRef.current = setIntervalPolyfill(fn, delay);

  // 4. MANDATORY cleanup
  return () => {
    clearIntervalPolyfill(intervalRef);
  };
}, [deps]);
```

**Context-specific cleanup:**

- `WebSocketContext`: Close sockets + clear ping intervals on background/error
- `NotificationsContext`: Clear clipboard/location intervals before creating new
- `BackgroundTaskContext`: Limit pending tasks to MAX 100

## WebSocket Architecture

**Server** (`server/routes/WebSocket.ts`) runs TWO WebSocket servers:

1. **General WS** (`/ws`) - User config, notifications, crypto updates
2. **Clipboard WS** (`/clipboard`) - Cross-device clipboard sync

**Client** (`app/context/WebSocketContext.tsx`) manages both connections:

- Ping/pong every 29 seconds to keep alive
- Auto-reconnect with exponential backoff
- Closes connection of General WS when app enters background (mobile and electron)
- Closes connection of Clipboard WS on suspend, reconnects on resume (mobile)

## Database Patterns

PostgreSQL accessed via `server/database/functions.ts`:

```typescript
// Type-safe database operations
import {
  updateInTable,
  fetchFromTable,
  insertIntoTable,
} from "@/database/functions";

// TABLE_MAP auto-validates table names
const users = await fetchFromTable("Users", { email });
await insertIntoTable("ClipboardSync", { userId, content });
```

Table types in `types/database/typesDatabase.d.ts` enforce schema compliance.

## Build & Development Workflows

### Starting Development

```bash
# Root - install all workspaces
yarn install

# Terminal 1 - Server (required for app)
yarn run server-dev

# Terminal 2 - App
yarn run app          # Choose platform: Android/iOS/Web

# Terminal 3 - Electron (if testing desktop)
yarn run start-electron
```

### Platform-Specific Builds

```bash
# Android APK (local build)
yarn run build-android

# Web for Electron
yarn run start-electron    # Creates Electron dev build
yarn run build-app-electron    # Creates production Electron build
```

**CRITICAL**: Set `PLATFORM` env var before building - it's replaced at compile time via Babel:

```bash
# In babel.config.js
"Platform.OS": JSON.stringify(platform)  // Hardcoded during build
```

## Native Modules (Android)

Custom native modules in `app/native/modules/`:

- **BackgroundModule** - Foreground service, clipboard access
- **NotificationModule** - Advanced notification handling
- **NativeFunctionsModule** - Battery optimization, overlays, permissions

**Prebuild process** (`scripts/app/app-prebuild.ts`) auto-registers these in `MainApplication.kt`.

Run `yarn run app-prebuild-android` before `npx expo run:android`.

## Common Patterns

### Translation System

```typescript
import { useLanguage } from "@context/LanguageContext";

const { t, language } = useLanguage();
const text = t("keyFromTranslation"); // Auto-typed from types/typesTranslations.d.ts
```

### Background Tasks with Offline Support

```typescript
import { useBackgroundTask } from "@context/BackgroundTaskContext";

const { addTaskQueue } = useBackgroundTask();

// Execute when internet available
addTaskQueue(
  {
    requiresInternet: true, // Retry until online, if false, runs immediately
    func: async () => {
      /* task */
    },
  },
  {
    id: uniqueId,
    functionName: "registeredTaskName",
    args: [arg1, arg2],
  },
  uniqueId // If any task with same ID exists, it will be replaced by the new one
);
```

### Modal/SnackBar Pattern

```typescript
import { useModal } from "@context/ModalContext";

const { openModal, openSnackBar } = useModal();

openSnackBar("Message", 3000, { label: "Action", onPress: () => {} });
openModal("Title", "Body", <CustomButtons />);
```

## Type Safety

**All API requests/responses** typed via `types/typesAPI.d.ts`:

```typescript
import { RequestDatabaseFetch, ResponseDatabaseFetch } from "@types";

const req: RequestDatabaseFetch = { table: "Users", match: { id } };
const res: ResponseDatabaseFetch<"Users"> = await fetch(...);
```

## Environment Variables

- **App**: `.env` (loaded via `expo-constants`)
- **Server**: `.env` (validated in `server/env.ts`)
- **Electron**: Uses `.env` via build process

## Testing After Changes

```bash
# Type check and lint check all workspaces
yarn run before-commit

# Manual testing checklist
1. Test on Android (if mobile changes)
2. Test on Web/Electron (if desktop/web changes)
3. Verify WebSocket reconnection after suspend
4. Check memory usage doesn't exceed 500MB (use memory monitor)
```

## Performance Considerations

- **Limit background tasks**: Max 100 in queue (BackgroundTaskContext)
- **WebSocket lifecycle**: Close on background, reconnect on foreground
- **Clipboard sync**: 500ms interval on web only (refs prevent leaks)
- **Memory monitor**: Auto GC when >500MB (`UtilitiesForPC/src/main/utils/memoryMonitor.ts`)

## When Adding New Features

1. Add types to `types/` first (used by all workspaces)
2. Use path aliases (`@types`, `@utils`, etc.)
3. Add translations to `common/both/translations`
4. Clean up intervals/timeouts/sockets in useEffect returns
5. Test cross-platform (especially web vs native differences)
6. Update `ProblemsDetected.md` if introducing known issues

## Well Practices While Programming

- Follow the repository conventions first: add new shared types before implementation, use path aliases for all imports, and avoid relative imports entirely.
- Prioritize type safety: prefer explicit types on public APIs, DTOs, and context values. Add or update shared types in the types/ workspace when introducing new data shapes.
- Resource lifecycle discipline: always release timers, intervals, subscriptions, sockets, and background tasks in cleanup callbacks. Store handles in refs and clear/close them deterministically.
- Keep contexts minimal and deterministic: each provider should expose only the necessary API. Ensure providers that open resources also close them when unmounted or when the app background state changes.
- Platform-aware code: branch on runtime platform and call the appropriate bridge (Electron preload wrapper on web/electron; native modules on Android/iOS). Encapsulate platform logic behind small, testable modules.
- Background tasks and queues: enforce an upper bound on queued tasks and surface queue metrics for observability. Retry with backoff and avoid unbounded retries.
- WebSocket hygiene: implement ping/pong and exponential-reconnect; close connections on background/sleep and fully teardown timers on errors.
- Error handling and logging: handle and surface errors near the source; log contextual information (user id, operation, inputs) but never log secrets or PII. Use structured logs for easier analysis.
- Security and secrets: keep secrets out of source control; access them via env vars or platform secret stores. Validate inputs on both client and server.
- Performance and memory: prefer small, pure functions; avoid creating new closures on every render for stable callbacks; batch updates where possible. Monitor memory and add guards if usage grows unexpectedly.
- Tests and CI: add unit tests for new logic and integration tests for cross-workspace features. Ensure type-checking and lint run in CI before merge.
- Build & native workflows: follow prebuild steps for native modules and set PLATFORM appropriately for release builds. Document platform-specific build instructions in the feature PR.
- Code review and PR checklist: include changes to types, translations, and docs when adding features; run local type-check and lint; list manual test steps and platforms validated.
- Documentation: update translations and ProblemsDetected.md for known caveats. Add usage examples for public utilities and context hooks.
- Dependency management: keep dependencies up-to-date, audit for vulnerabilities, and prefer lightweight libraries for cross-platform compatibility.
- Use early returns to reduce nesting and improve readability.
- Documentation: while adding a new function or module, include JSDoc comments describing its purpose, parameters, and return values to aid future maintainers, only English.
- Commenting: when a comment is added, it should finish with "//! DELETE", only if a comment is added for explanation or clarification, p.g:

  ```typescript
  // This function does X, Y, Z //! DELETE
  const example = () => { ... }
  const exampleVar = ...; // This variable holds ... //! DELETE
  ```

  NOT:

  ```typescript
  // This function does X, Y, Z
  const example = () => { ... }
  const exampleVar = ...; //! DELETE
  ```

- Consistent formatting: adhere to the project's formatting rules (Prettier, ESLint) to maintain code consistency across the codebase.
- Always use `async/await` for asynchronous code instead of `.then()` for better readability and error handling.
- Avoid using `any` type; strive for precise typing to leverage TypeScript's strengths.
- When working with arrays or collections, prefer using array methods like `map`, `filter`, and `reduce` over traditional loops for cleaner and more functional code.
- When modifying shared types, ensure backward compatibility to prevent breaking changes in dependent workspaces.
- Always use arrow functions while making functions for consistent syntax and lexical `this` binding.
- If md files are added, make sure add it to folder implementation-md/ to avoid committing them.
- Avoid using emojis in code comments or documentation within the codebase to maintain professionalism and clarity.

---

---

---

# Utilities Documentation - app

## Index

### App Management

- **Format date, Date formatted** | [getFormattedDate](../app/utils/functions/appManagement.ts#L30)
- **Parse JSON data, safe parse** | [parseData](../app/utils/functions/appManagement.ts#L78)
- **Sort array, valid representation** | [sortArray](../app/utils/functions/appManagement.ts#L120)
- **Sort object keys** | [sortObject](../app/utils/functions/appManagement.ts#L131)
- **Stringify data, object to string** | [stringifyData](../app/utils/functions/appManagement.ts#L149)
- **Interpolate string, replace placeholders** | [interpolateMessage](../app/utils/functions/appManagement.ts#L186)
- **Capitalize string** | [capitalize](../app/utils/functions/appManagement.ts#L201)
- **Check falsy value** | [isFalsy](../app/utils/functions/appManagement.ts#L215)
- **Get future date, date add days** | [getDateWithDaysAhead](../app/utils/functions/appManagement.ts#L230)
- **Get notifications, initialize notifications** | [getNotifications](../app/utils/functions/appManagement.ts#L239)
- **Get cryptos from DB** | [getCryptosFromDatabase](../app/utils/functions/appManagement.ts#L249)
- **Check update available** | [isNewUpdateAvailable](../app/utils/functions/appManagement.ts#L289)
- **Fetch and apply update** | [fetchAndApplyUpdate](../app/utils/functions/appManagement.ts#L293)
- **Set timeout polyfill (Android/Web)** | [setTimeoutPolyfill](../app/utils/functions/appManagement.ts#L308)
- **Clear timeout polyfill** | [clearTimeoutPolyfill](../app/utils/functions/appManagement.ts#L316)
- **Clear React refs** | [clearRefs](../app/utils/functions/appManagement.ts#L337)
- **Set interval polyfill** | [setIntervalPolyfill](../app/utils/functions/appManagement.ts#L344)
- **Clear interval polyfill** | [clearIntervalPolyfill](../app/utils/functions/appManagement.ts#L352)
- **Check URL status** | [checkUrlStatus](../app/utils/functions/appManagement.ts#L369)
- **Check internet connection** | [hasInternetConnection](../app/utils/functions/appManagement.ts#L397)
- **Get random UUID** | [getRandomId](../app/utils/functions/appManagement.ts#L415)
- **Memoize component deep** | [memoDeep](../app/utils/functions/appManagement.ts#L437)
- **Compare values equality** | [areEqualValues](../app/utils/functions/appManagement.ts#L464)
- **Select image from gallery** | [selectImage](../app/utils/functions/appManagement.ts#L501)
- **Download base64 file** | [downloadBase64](../app/utils/functions/appManagement.ts#L764)

### API Management

- **Generate fetch options** | [fetchOptions](../app/utils/functions/APIManagement.ts#L29)
- **Get full API route** | [getRouteAPI](../app/utils/functions/APIManagement.ts#L60)
- **Get image URL** | [getRouteImage](../app/utils/functions/APIManagement.ts#L111)
- **Fetch to server** | [fetchToServer](../app/utils/functions/APIManagement.ts#L147)

### Authentication

- **Save storage values** | [saveStorageData](../app/utils/functions/auth.ts#L60)
- **Sign in with email** | [signInWithEmail](../app/utils/functions/auth.ts#L100)
- **Sign up with email** | [signUpWithEmail](../app/utils/functions/auth.ts#L140)
- **Forgot password** | [forgotPasswordWithEmail](../app/utils/functions/auth.ts#L170)
- **Sign out** | [signOut](../app/utils/functions/auth.ts#L196)

### Background & Permissions

- **Check location enabled** | [isLocationEnabled](../app/utils/functions/background.ts#L23)
- **Request location permission** | [askLocationPermission](../app/utils/functions/background.ts#L44)
- **Request overlay permission** | [askDisplayOverOtherAppsPermission](../app/utils/functions/background.ts#L117)
- **Request battery optimization ignore** | [askBatteryOptimizationPermission](../app/utils/functions/background.ts#L172)

### Debugging

- **Log message** | [log](../app/utils/functions/debug.ts#L56)
- **Log warning** | [logWarn](../app/utils/functions/debug.ts#L114)
- **Log error** | [logError](../app/utils/functions/debug.ts#L162)

### Notifications

- **Check notifications initialized** | [isNotificationsAlreadyInitialized](../app/utils/functions/notifications.ts#L28)
- **Initialize notifications storage** | [initializeNotificationsStorage](../app/utils/functions/notifications.ts#L47)
- **Check push permission** | [hasPushNotifications](../app/utils/functions/notifications.ts#L105)
- **Setup notification handlers** | [setupNotificationHandlers](../app/utils/functions/notifications.ts#L129)
- **Configure channels (Android)** | [configureNotificationChannel](../app/utils/functions/notifications.ts#L168)

### Storage Management

- **Save data to storage (Secure/Unsecure)** | [saveDataStorage](../app/utils/functions/storageManagement.ts#L86)
- **Load data from storage** | [loadDataStorage](../app/utils/functions/storageManagement.ts#L163)

### Screens Utils

- **Get Public IP** | [getIP](../app/utils/functions/screens/IP.ts#L5)
- **Get IP Query Data** | [getDataIPQuery](../app/utils/functions/screens/IP.ts#L10)
- **Get IP-API Data** | [getDataIP_api](../app/utils/functions/screens/IP.ts#L19)
- **Open URL** | [openURL](../app/utils/functions/screens/SocialMedia.ts#L10)
- **Translate text** | [translate](../app/utils/functions/screens/Translator.ts#L5)

### Task Registry

- **Update database record** | [taskRegistry.updateFromDatabase](../app/utils/taskRegistry.ts#L23)
- **Insert database record** | [taskRegistry.insertIntoDatabase](../app/utils/taskRegistry.ts#L50)
- **Delete database record** | [taskRegistry.deleteFromDatabase](../app/utils/taskRegistry.ts#L75)

### Common Validation & Error Handling

- **Validate Email** | [isValidEmail](../common/both/validations.ts#L7)
- **Validate Password** | [isValidPassword](../common/both/validations.ts#L23)
- **Clean Float String** | [cleanFloat](../common/both/validations.ts#L34)
- **Wrap function with error handling** | [wrapFunctionWithError](../common/both/errorHandling.ts#L35)
- **Is Secure Storage Key** | [isSecureKey](../common/both/keysStorage.ts#L123)

---

## App Management Functions

### `getFormattedDate`

Formats a date object into a localized string.

- **File**: [../app/utils/functions/appManagement.ts](../app/utils/functions/appManagement.ts)

```typescript
const dateStr = getFormattedDate(new Date(), "es-MX", { dateStyle: "short" });
```

### `parseData`

Safely parses a JSON string, handling defined Symbols/Functions placeholders.

- **File**: [../app/utils/functions/appManagement.ts](../app/utils/functions/appManagement.ts)

```typescript
// 1. Basic parsing
const obj = parseData<MyType>(jsonString);

// 2. Parsing failing JSON returns null/original value
const safe = parseData(null); // returns null
```

### `stringifyData`

Stringifies data safely, handling dates and sorting object keys.

- **File**: [../app/utils/functions/appManagement.ts](../app/utils/functions/appManagement.ts)

```typescript
// 1. Standard stringify
const json = stringifyData(myObject);

// 2. Handling Dates and sorting keys
const sortedJson = stringifyData({ b: 2, a: 1, date: new Date() });
```

### `interpolateMessage`

Replaces `{0}`, `{1}` placeholders in strings.

- **File**: [../app/utils/functions/appManagement.ts](../app/utils/functions/appManagement.ts)

```typescript
const msg = interpolateMessage("Hello {0}", ["World"]);
```

### `isFalsy`

Checks if value is null, undefined, false or empty string.

- **File**: [../app/utils/functions/appManagement.ts](../app/utils/functions/appManagement.ts)

```typescript
if (isFalsy(value)) {
  /* handle falsy */
}
```

### `setTimeoutPolyfill` / `setIntervalPolyfill`

Platform-aware timer functions (uses BackgroundTimer on Android, standard on others).

- **File**: [../app/utils/functions/appManagement.ts](../app/utils/functions/appManagement.ts)

```typescript
// 1. Standard timeout
const id = setTimeoutPolyfill(() => console.log("hi"), 1000);

// 2. Clear timeout
clearTimeoutPolyfill(id);
// Also accepts ref objects: clearTimeoutPolyfill(timerRef);
```

### `areEqualValues`

Compares multiple values for deep equality.

- **File**: [../app/utils/functions/appManagement.ts](../app/utils/functions/appManagement.ts)

```typescript
// 1. Check with deep equality (isEqual)
const isEqual = areEqualValues(false, obj1, obj2);

// 2. Check using JSON stringification (faster for simple objects)
const isStringEqual = areEqualValues(true, obj1, obj2);

// 3. Compare multiple values at once
const allEqual = areEqualValues(false, val1, val2, val3);
```

### `selectImage`

Opens document picker to select an image.

- **File**: [../app/utils/functions/appManagement.ts](../app/utils/functions/appManagement.ts)

```typescript
// 1. Select single image with base64
const result = await selectImage({ multiple: false, base64: true });

// 2. Select multiple images
const results = await selectImage({ multiple: true });
```

### `downloadBase64`

Downloads a base64 string as a file (Web/Native compatible).

- **File**: [../app/utils/functions/appManagement.ts](../app/utils/functions/appManagement.ts)

```typescript
await downloadBase64({
  uri: base64String,
  fileName: "image.png",
  typeFile: "image/png",
  directory: "images",
  // Optional: albumName: "MyAlbum" (native)
  // Optional: deleteAfterDownload: true
});
```

---

## API Management Functions

### `fetchToServer`

Generic wrapper for making API requests to the server with token/auth handling.

- **File**: [../app/utils/functions/APIManagement.ts](../app/utils/functions/APIManagement.ts)

```typescript
// 1. POST Request with Body
const res = await fetchToServer("/database/fetch", { table: "Users" }, token);

// 2. GET Request (no body)
const resGet = await fetchToServer("/health");

// 3. Request without token
const resAuth = await fetchToServer("/auth/login", { email, password });
```

### `fetchOptions`

Generates headers and stringified body for fetch requests.

- **File**: [../app/utils/functions/APIManagement.ts](../app/utils/functions/APIManagement.ts)

```typescript
// 1. Options with Body and Token
const opts = fetchOptions({ some: "data" }, token);

// 2. Options without Body
const optsGet = fetchOptions(undefined, token);
```

---

## Authentication Functions

### `signInWithEmail`

Authenticates a user and saves session data.

- **File**: [../app/utils/functions/auth.ts](../app/utils/functions/auth.ts)

```typescript
const result = await signInWithEmail("user@example.com", "password123");
if (result.success) {
  /* user logged in */
}
```

### `saveStorageData`

Saves multiple storage key-values at once (e.g. from login response).

- **File**: [../app/utils/functions/auth.ts](../app/utils/functions/auth.ts)

```typescript
await saveStorageData(response.storageValues);
```

---

## Background & Permissions Functions

### `askLocationPermission`

Requests foreground and background location permissions.

- **File**: [../app/utils/functions/background.ts](../app/utils/functions/background.ts)

```typescript
const granted = await askLocationPermission();
```

### `askDisplayOverOtherAppsPermission`

Requests overlay permission (Android).

- **File**: [../app/utils/functions/background.ts](../app/utils/functions/background.ts)

```typescript
const granted = await askDisplayOverOtherAppsPermission();
```

---

## Debug Functions

### `log` / `logWarn` / `logError`

Logs to console in Dev, sends to server in Preview, ignores in Production.

- **File**: [../app/utils/functions/debug.ts](../app/utils/functions/debug.ts)

```typescript
// 1. Standard Log
log("Message");

// 2. Log with data
log("User Info", { id: 1, name: "Test" });

// 3. Log Error
logError("Critical Failure", errorObj);
```

---

## Storage Management Functions

### `saveDataStorage`

Saves a value to storage (SecureStore for sensitive keys, AsyncStorage for others).

- **File**: [../app/utils/functions/storageManagement.ts](../app/utils/functions/storageManagement.ts)

```typescript
// 1. Save Unsecure Data
await saveDataStorage("THEME", "dark");

// 2. Save Secure Data
await saveDataStorage("USER_DATA", userData);

// 3. Save with Error Callback
await saveDataStorage("API_URL", "http://...", (err, msg) => {
  console.error("Save failed", msg);
});
```

### `loadDataStorage`

Loads and parses a value from storage.

- **File**: [../app/utils/functions/storageManagement.ts](../app/utils/functions/storageManagement.ts)

```typescript
// 1. Basic Load
const theme = await loadDataStorage("THEME");

// 2. Load with Fallback Value
const lang = await loadDataStorage("LANGUAGE", "en");

// 3. Load with Callback
await loadDataStorage("USER_DATA", (value, err) => {
  if (err) handleErr(err);
  else setUser(value);
});
```

---

## Task Registry

### `taskRegistry` methods

Methods to perform database operations via the server.

- **File**: [../app/utils/taskRegistry.ts](../app/utils/taskRegistry.ts)

```typescript
await taskRegistry.updateFromDatabase(
  "Users",
  { name: "New Name" },
  { id: "123" }
);
await taskRegistry.insertIntoDatabase("Logs", { message: "Test" });
await taskRegistry.deleteFromDatabase("Temp", { id: "456" });
```

---

## Common Validations

### `isValidEmail`

Validates email format.

- **File**: [../common/both/validations.ts](../common/both/validations.ts)

```typescript
if (isValidEmail("test@test.com")) { ... }
```

### `wrapFunctionWithError`

Wraps a function to catch errors and optionally execute a callback.

- **File**: [../common/both/errorHandling.ts](../common/both/errorHandling.ts)

```typescript
// 1. Execute immediately with error handler
const result = await wrapFunctionWithError(
  async () => {
    return await riskyOperation();
  },
  (err) => console.log(err)
);

// 2. Return a wrapped function
const safeFn = wrapFunctionWithError(
  async (arg) => {
    return await doWork(arg);
  },
  true,
  (err) => null
);

// 3. Default error handling (returns undefined on error)
const simpleSafe = wrapFunctionWithError(async () => {
  // ...
});
```
