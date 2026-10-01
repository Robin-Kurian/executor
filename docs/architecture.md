# Architecture

Executor is an npm-workspaces monorepo. The browser talks only to the Hono API; it never receives database credentials.

The dependency direction is:

`apps/web → packages/domain + HTTP contract`

`Cloudflare entrypoint → Hono app → services → repository → Drizzle → Neon adapter`

`packages/contracts → packages/domain`

`packages/domain` has no runtime, database, or Cloudflare imports. `src/app.ts` owns Web Standard routing. `src/index.ts` only exports the Hono application to the Worker runtime. Neon construction exists only in `src/db/client.ts`; replacing Neon should require a new Drizzle connection adapter and repository verification, not route/domain changes.

## Dates

Activity dates remain civil `YYYY-MM-DD` strings. Arithmetic uses noon UTC. PostgreSQL columns use `DATE` with Drizzle string mode to prevent timezone shifts.

## Authentication

Better Auth is mounted at `/api/auth/*`, with PostgreSQL-backed `user`, `session`, `account`, and `verification` tables. Protected `/api/v1/*` requests require a valid session. CORS allows one exact `WEB_ORIGIN` with credentials. Production cookies are secure, HTTP-only, and SameSite Lax. Use a shared parent domain or same-origin proxy for Safari if web/API are placed on unrelated registrable domains.

## PWA and Web Push

`apps/web/src/app/manifest.ts` defines the root-scoped standalone app and `apps/web/public/sw.js` owns the offline shell, static asset cache, push display, and safe same-origin notification deep links. The service worker never intercepts cross-origin API calls and never queues or fakes mutations.

The browser sends its standards-based `PushSubscription` to authenticated `/api/v1/push/*` routes. `PushSubscriptionService` enforces ownership, `PushRepository` isolates Neon persistence, and `WebPushTransport` isolates VAPID delivery. The private VAPID key exists only in API runtime secrets. One user can retain multiple device/browser subscriptions; 404/410 push endpoints are removed after delivery attempts.

## Preserved behavior

The extraction preserves plan visibility, inclusive bounds, all recurrence kinds, Inbox/waiting behavior, over-target quantities, task status synchronization, and the existing non-recurring `done` hydration behavior.
