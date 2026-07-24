# Server Workspace (`server`)

Node.js Express backend with PostgreSQL, WebSocket channels, update delivery endpoints, and Firebase integration.

## Documentation Map

- Monorepo docs: [../README.md](../README.md)
- App docs: [../app/README.md](../app/README.md)
- Server docs: [README.md](README.md)
- Electron docs: [../UtilitiesForPC/README.md](../UtilitiesForPC/README.md)

## Scope

This workspace is responsible for:

- REST API under `/api`
- Update service endpoints under `/updates`
- WebSocket services on `/ws`, `/clipboard`, `/ws-cryptos`, and `/ws-login-qr`
- Database initialization and access
- Auth/session, admin, encryption, clipboard, config, and notification-related server flows

Primary entry: [index.ts](index.ts)

## Runtime Overview

At startup, [index.ts](index.ts):

- Starts memory monitoring
- Validates the server environment in [env.ts](env.ts)
- Initializes Firebase Admin SDK
- Configures security middleware (`helmet`) outside development
- Mounts the API router and the static updates path
- Creates the HTTP server
- Attaches WebSocket upgrade handling by pathname
- Initializes PostgreSQL connectivity
- Runs any queued post-init functions after the server is listening

The default host is `localhost` outside development and `0.0.0.0` in development. The port is `3000`.

## Scripts From `server/package.json`

Run from this folder:

```bash
yarn run db-update
yarn run db-migrate
yarn run db-generate
yarn run start
yarn run start-dev
yarn run format-all
yarn run before-commit
yarn run type-check
yarn run lint
yarn run lint:fix
yarn run lint:check
```

Behavior:

- `db-update` runs `prisma migrate dev` and `prisma generate`
- `start` runs `db-update`, then `build.ts`, then `build/index.cjs`
- `start-dev` uses `nodemon` to restart through the normal start flow

## Default Network Endpoints

Based on current config/runtime:

- API base: `http://localhost:3000/api`
- Updates base: `http://localhost:3000/updates`
- WS: `ws://localhost:3000/ws`
- Clipboard WS: `ws://localhost:3000/clipboard`
- Crypto WS: `ws://localhost:3000/ws-cryptos`
- QR login WS: `ws://localhost:3000/ws-login-qr`

## API Routes

Registered in [routes/index.ts](routes/index.ts):

- Auth: `POST /auth/login`, `POST /auth/signup`, `POST /auth/signout`, `POST /auth/refreshSession`
- Info: `GET /info/health`, `GET /info/generate204`, `GET /info/appAlive/:deviceId/:pushToken`
- Logs: `GET /logs`, `GET /logs/page`, `GET /logs/page/:page`, `POST /logs/add`, `DELETE /logs/:logId`
- Admin: admin routes under `/admin`
- Images: `POST /images/change-format`
- Cryptos: `GET /cryptos`, `GET /cryptos/:symbol`, `GET /cryptos/price/:symbol`
- Languages: `POST /languages/translate`
- Streamers: `GET /streamers`, `GET /streamers/page`, `GET /streamers/:userId`, `GET /streamers/streamer/:streamerId`, `GET /streamers/add/:userId/:streamerName`
- Clipboard: clipboard sync routes under `/clipboard`
- Encryption: `POST /encryption/decrypt`, `POST /encryption/encrypt`
- User config: routes under `/user-config`
- Down detector: routes under `/down-detector`
- User notifications config: routes under `/user-notifications-config`
- Dev-only: `POST /dev/executeQuery` when `__DEV__` is enabled
- Updates: `GET /updates/is-update-available/:version/:buildType`, `GET /updates/is-update-available/:version/:buildType/:platform`, `GET /updates/download/:id`, `POST /updates/upload`

## Route Modules

The top-level router currently mounts these modules:

- `/auth`
- `/info`
- `/logs`
- `/admin`
- `/images`
- `/cryptos`
- `/updates`
- `/languages`
- `/streamers`
- `/clipboard`
- `/encryption`
- `/user-config`
- `/down-detector`
- `/user-notifications-config`
- `/dev` in development only

## Environment

Environment is loaded from the root `.env` and validated in [env.ts](env.ts).

Expected keys include:

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

Missing values can emit warnings and some defaults are used, but production should provide explicit secure values.

## Build Notes

[build.ts](build.ts) bundles the server code with `esbuild` into [build/index.cjs](build/index.cjs).

## Quality Gate

Workspace-local and repository-level canonical gate:

```bash
yarn run before-commit
```

## Troubleshooting

### Server starts but Firebase features fail

Verify `FIREBASE_SERVICE_ACCOUNT` JSON is valid and complete.

### Auth or encryption issues

Verify `JWT_SECRET`, `IV`, and `SECRET_KEY_TO_ENCRYPTION` are set correctly.

### Database connection errors

Check `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, and database availability.

### WebSocket upgrade path rejected

Only `/ws`, `/clipboard`, `/ws-cryptos`, and `/ws-login-qr` are accepted in the current upgrade switch logic.
