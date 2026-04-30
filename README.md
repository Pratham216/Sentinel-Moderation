# Nebula Community Moderation Platform

Full-stack TypeScript app: **React (Vite)** dashboard, **Node.js (Express)** API, **PostgreSQL** (Prisma), **OpenRouter** for text+vision moderation, **Socket.io** for live updates, **JWT + OAuth (Google/GitHub)**, and **HMAC webhooks** for external ingestion.

## Monorepo layout

- `packages/shared` – shared Zod schemas and types
- `packages/api` – Express API, Prisma, moderation pipeline, realtime
- `packages/web` – moderator/admin UI (Tailwind, Recharts, `@dnd-kit` rules editor)

## Prerequisites

- Node.js 20+
- pnpm 9 (`corepack enable`)
- PostgreSQL 16+ (local or Docker)

## Quick start (development)

1. **Environment**

   Copy `.env.example` to `packages/api/.env` and fill values (minimum):

   ```bash
   DATABASE_URL=postgresql://nebula:nebula@localhost:5432/nebula?schema=public
   JWT_SECRET=<32+ chars>
   JWT_REFRESH_SECRET=<32+ chars>
   WEB_ORIGIN=http://localhost:5173
   OPENROUTER_API_KEY=<optional; omit uses mock moderation>
   ```

2. **Database**

   ```bash
   cd packages/api
   pnpm exec prisma migrate deploy
   pnpm run db:seed
   ```

3. **Run**

   From repository root:

   ```bash
   pnpm install
   pnpm dev
   ```

   - API: `http://localhost:4000` (health: `GET /healthz`, `GET /readyz`)
   - Web: `http://localhost:5173` (Vite proxies `/auth`, `/communities`, `/posts`, `/audit`, `/socket.io`)

4. **Seed logins**

   - `admin@nebula.test` / `adminadmin` (global admin + community admin)
   - `mod@nebula.test` / `modmodmod1`
   - `user@nebula.test` / `useruser1`

## OpenRouter

Set `OPENROUTER_MODEL` (e.g. `anthropic/claude-3.5-sonnet`, `openai/gpt-4o`). Per-community override in **Settings** (`openRouterModel` in community settings JSON).

Without `OPENROUTER_API_KEY`, the API returns a **mock** moderation result so the UI stays usable.

## Webhook ingestion

`POST /webhooks/:communityId/ingest`

- Body: JSON `{ author: { email, name? }, text, mediaUrls?, externalId? }`
- Header `X-Signature`: hex-encoded **HMAC-SHA256** of the **raw** JSON body using the community `webhookSecret` (visible to community admins in Settings).

## Docker

```bash
docker compose up --build
```

- Postgres on `5432`, API on `4000`, static web on `8080`
- Run migrations inside API container once DB is up:

  ```bash
  docker compose exec api sh -c "cd /app/packages/api && pnpm exec prisma migrate deploy && pnpm run db:seed"
  ```

Adjust `VITE_API_URL` when building `Dockerfile.web` so the browser can reach the API (e.g. `http://localhost:4000` when exposing ports on the host).

## Scripts

| Command            | Description                      |
| ------------------ | -------------------------------- |
| `pnpm dev`         | API + web in parallel            |
| `pnpm build`       | Build all packages               |
| `pnpm test`        | Vitest (api + web unit tests)    |
| `pnpm test:e2e`    | Playwright (install CLI locally) |

## API surface (summary)

- Auth: `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`, OAuth `/auth/oauth/google`, `/auth/oauth/github`
- Communities: `GET/POST /communities`, `GET/PATCH /communities/:communityId`, rules/settings/members as in plan
- Posts: `GET/POST /communities/:communityId/posts`, `GET /posts/:postId`, `POST /posts/:postId/actions`, `POST /posts/:postId/reanalyze`
- Analytics: `GET /communities/:communityId/analytics`
- Trust: `GET /communities/:communityId/trust`
- Audit: `GET /audit?communityId=`

## License

MIT (adapt as needed for your course/project).
