# Executor

Standalone Executor application extracted from `itsrobin-web`.

Production:

- Web/PWA: https://executor.itsrobin.dev
- API: https://api.executor.itsrobin.dev
- API health: https://api.executor.itsrobin.dev/health

## Architecture

- `apps/web`: Next.js 16 App Router frontend on port 3000.
- `apps/api`: portable Hono application with a thin Cloudflare Workers entrypoint on port 8787.
- `packages/domain`: pure civil-date, recurrence, quantity, and visibility behavior.
- `packages/contracts`: shared Zod request schemas.
- PostgreSQL/Neon access is isolated in the API database adapter and repositories.
- Better Auth is hosted by the API and stores users/sessions in PostgreSQL.
- The frontend is an installable PWA; standards-based Web Push subscriptions are owned by authenticated users and stored in Neon.

## Local setup

1. Run `npm install`.
2. Copy `apps/api/.dev.vars.example` to `apps/api/.dev.vars` and set the target `DATABASE_URL` and a random `BETTER_AUTH_SECRET` of at least 32 characters.
3. Copy `apps/web/.env.example` to `apps/web/.env.local` if the API is not at `http://localhost:8787`.
4. Run `npm run db:migrate`.
5. Run `npm run dev`.
6. Create the owner once with `OWNER_EMAIL=... OWNER_PASSWORD=... npm run auth:bootstrap-owner -w @executor/api` while the API is running.

Local URLs:

- Web: http://localhost:3000
- API: http://localhost:8787
- Health: http://localhost:8787/health
- Readiness: http://localhost:8787/ready
- OpenAPI: http://localhost:8787/api/openapi.json
- Reference link: http://localhost:8787/api/docs

## Root commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Run web and API |
| `npm run dev:web` / `npm run dev:api` | Run one application |
| `npm run test` | Run all tests |
| `npm run typecheck` | Type-check all workspaces |
| `npm run build` | Build web and dry-run bundle API |
| `npm run db:generate` | Generate committed Drizzle migrations |
| `npm run db:migrate` | Apply migrations using `apps/api/.dev.vars` |
| `npm run api:deploy` | Deploy the Worker |
| `npm run web:deploy` | Build and deploy the OpenNext PWA Worker |
| `npm run migration:audit` | Audit explicit source DB |
| `npm run migration:export` | Export the four Executor tables |
| `npm run migration:import` | Import into explicit target DB |
| `npm run migration:verify` | Compare full ordered rows/checksums |

Migration commands require both `SOURCE_DATABASE_URL` and `TARGET_DATABASE_URL` where applicable. Never use a generic URL for source/target selection.

See [architecture](docs/architecture.md), [deployment](docs/deployment.md), [migration report](docs/migration-report.md), and [data verification](docs/data-verification.md).
