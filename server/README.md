# Server Workspace (`server`)

Node.js Express backend with PostgreSQL, WebSocket channels, update delivery endpoints, and Firebase integration.

## Documentation Map

- Monorepo docs: `../README.md`
- App docs: `../app/README.md`
- Server docs: `README.md`
- Electron docs: `../UtilitiesForPC/README.md`

## Scope

This workspace is responsible for:

- REST API under `/api`
- Update service endpoints under `/updates`
- WebSocket services (`/ws`, `/clipboard`, `/ws-cryptos`, `/ws-login-qr`)
- Database initialization and access
- Auth/session and encryption-related server flows

Primary entry: `index.ts`

## Runtime Overview

At startup (`index.ts`):

- Validates environment (`env.ts`)
- Initializes Firebase Admin SDK
- Configures security middleware (Helmet in non-dev)
- Mounts API and updates routers
- Creates HTTP server
- Attaches WebSocket upgrade handling by path (`/ws`, `/clipboard`, `/ws-cryptos`, `/ws-login-qr`)
- Initializes PostgreSQL connection flow

## Scripts (From `server/package.json`)

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

- `start`: builds via `build.ts` then runs `build/index.cjs`
- `start-dev`: nodemon-based dev loop that rebuilds and restarts

## Default Network Endpoints

Based on current config/runtime:

- API base: `http://localhost:3000/api`
- Updates base: `http://localhost:3000/updates`
- WS: `ws://localhost:3000/ws`
- Clipboard WS: `ws://localhost:3000/clipboard`
- Crypto WS: `ws://localhost:3000/ws-cryptos`
- QR login WS: `ws://localhost:3000/ws-login-qr`

Port default is `3000`.

## API Routes

Registered in `routes/index.ts`:

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

## Route Modules

The top-level router currently mounts these modules:

- `/auth`
- `/info`
- `/logs`
- `/images`
- `/cryptos`
- `/updates`
- `/languages`
- `/streamers`
- `/encryption`
- `/dev` in development only

## Environment

Environment is loaded from root `.env` and validated in `env.ts`.

Expected keys include:

- `IV`
- `WS_URL`
- `__DEV__`
- `USE_HTTPS`
- `JWT_SECRET`
- `DB_PORT`
- `DB_USER`
- `DB_PASS`
- `DB_NAME`
- `DB_HOST`
- `API_URL`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `DB_ENCRYPTION_PASS`
- `DEEPL_TRANSLATOR_API`
- `FIREBASE_SERVICE_ACCOUNT`
- `FCM_SERVER_KEY`
- `SECRET_KEY_TO_ENCRYPTION`

Note: missing values may trigger warnings/defaults, but production should provide explicit secure values.

## Build Notes

`build.ts` bundles server code with `esbuild` into `build/index.cjs`.

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

### Server starts but Firebase features fail

Verify `FIREBASE_SERVICE_ACCOUNT` JSON is valid and complete.

### Auth or encryption issues

Verify `JWT_SECRET`, `IV`, and `SECRET_KEY_TO_ENCRYPTION` are set correctly.

### Database connection errors

Check `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, and database availability.

### WebSocket upgrade path rejected

Only `/ws`, `/clipboard`, `/ws-cryptos`, and `/ws-login-qr` are accepted in current upgrade switch logic.
