![Executor](https://res.cloudinary.com/itsrobin/image/upload/v1790838489/Executor_Productivity_App_Hero_Medium_djoxok.jpg)

# Executor

A self-hostable personal planning app for habits, tasks, schedules, and reminders.

## What is included

- Daily, recurring, one-time, waiting, and quantity-based items.
- Calendar, inbox, plan management, missed-item recovery, and occurrence moves.
- Thirty-day analytics. Completions count finished item occurrences; failures count incomplete scheduled habits, metrics, and tasks on finished days. A streak day requires every scheduled habit, metric, and task to be complete.
- Single-administrator authentication with PostgreSQL-backed sessions.
- Installable PWA with Web Push plus an optional Expo native shell and native push.
- Cloudflare Worker deployment scripts, PostgreSQL migrations, and local backup/restore tools.

## Architecture

- `apps/web`: Next.js 16 App Router frontend on port 3000.
- `apps/api`: portable Hono application with a thin Cloudflare Workers entrypoint on port 8787.
- `packages/domain`: pure civil-date, recurrence, quantity, and visibility behavior.
- `packages/contracts`: shared Zod request schemas.
- PostgreSQL access is isolated in the API database adapter and repositories.
- Better Auth is hosted by the API and stores users/sessions in PostgreSQL.
- API access is restricted to the configured administrator email and `admin` role; protected account provisioning uses a separate bootstrap secret.
- The frontend is an installable PWA; standards-based Web Push subscriptions are owned by authenticated users and stored in PostgreSQL.

## Local setup

1. Install Node 20.9+, PostgreSQL access, and the npm dependencies with `npm install`.
2. Copy `apps/api/.dev.vars.example` to `apps/api/.dev.vars`. Replace every placeholder. Set the database URLs, administrator email, and unique 32+-character auth/bootstrap secrets. Generate VAPID values with `npx web-push generate-vapid-keys`. Do not use sample values in a real instance.
3. Copy `apps/web/.env.example` to `apps/web/.env.local` if the API is not at `http://localhost:8787`.
4. Run `npm run db:migrate`.
5. Run `npm run dev`.
6. Create the allowlisted administrator once with the secure prompt-based procedure in [deployment](docs/deployment.md#access-control-setup). `OWNER_EMAIL` must exactly match `ALLOWED_ADMIN_EMAIL`.

If the API is not reachable while signing in, run `npm run dev:api` in a separate terminal and confirm `curl http://localhost:8787/health` returns `200`. See [deployment](docs/deployment.md) for the full local and production security setup.

Local credentials belong only in `apps/api/.dev.vars`; the frontend’s local public API origin belongs in `apps/web/.env.local`. Both are ignored by Git.

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
| `npm run lint` | Lint workspaces that define a lint command |
| `npm run build` | Build web and dry-run bundle API |
| `npm run db:generate` | Generate committed Drizzle migrations |
| `npm run db:migrate` | Apply migrations using `apps/api/.dev.vars` |
| `npm run db:backup` | Dump `DATABASE_URL` to a timestamped file in `backups/` |
| `npm run db:restore:fallback` | Restore the newest dump to `FALLBACK_DATABASE_URL` after confirmation |
| `npm run update-connection` | Prompt for and update the production API `DATABASE_URL` secret |
| `npm run api:deploy` | Deploy the API Worker |
| `npm run web:deploy` | Build and deploy the OpenNext PWA Worker |
| `npm run deploy` | Deploy API first, then web |

## Before publishing a fork

- Replace the database, auth/bootstrap secrets, VAPID keys, administrator email, Cloudflare account, Worker names, domains, and routes with values owned by the new operator.
- Replace the Expo project ID, Android package, iOS bundle identifier, Firebase project, company/branding, and app-store signing setup before building the native app.
- Keep `.dev.vars`, non-example `.env*`, `wrangler*.private.*`, Firebase files, signing material, and database backups untracked. Files already committed remain in Git history even after deletion.
- Review [deployment](docs/deployment.md) and [security policy](SECURITY.md) before the first production deploy.

See [architecture](docs/architecture.md) and [deployment](docs/deployment.md).
