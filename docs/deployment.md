# Deployment

## API / Cloudflare Workers

From `apps/api`:

```bash
npx wrangler whoami
npx wrangler secret put DATABASE_URL --env production
npx wrangler secret put BETTER_AUTH_SECRET --env production
npx wrangler secret put VAPID_PUBLIC_KEY --env production
npx wrangler secret put VAPID_PRIVATE_KEY --env production
npx wrangler secret put VAPID_SUBJECT --env production
npx wrangler deploy --env production
```

Never pass secret values as command arguments. Confirm the non-secret production values in `wrangler.jsonc` (`WEB_ORIGIN`, `BETTER_AUTH_URL`) match the real domains before deploy. Run `npx wrangler deploy --dry-run --env production` first, then verify `/health`, `/ready`, auth, and one read/write flow.

The current adapter uses the plan-locked Neon serverless HTTP driver. Cloudflare currently recommends Hyperdrive for external PostgreSQL; adopting it later is an adapter change and must not alter the domain contract.

## Web

Set `NEXT_PUBLIC_API_URL` to the production Worker/custom-domain origin at build time, then run `npm run web:deploy`. This public value is baked into the client bundle. The current custom domains are `executor.itsrobin.dev` and `api.executor.itsrobin.dev`.

## PWA / Web Push

- Manifest: `apps/web/src/app/manifest.ts`
- Service worker: `apps/web/public/sw.js`
- Icons: `apps/web/public/icons/`
- Push migration: `apps/api/drizzle/0002_tranquil_korvac.sql`
- Device controls: the bell button in the signed-in Executor header

Generate VAPID keys once with `npx web-push generate-vapid-keys`. Keep the private key out of Git, place the three `VAPID_*` values in `apps/api/.dev.vars` locally, and use Wrangler secrets in production. Apply `npm run db:migrate` before deploying the push API. A signed-in user can enable/disable the current device and invoke `/api/v1/push/test` from the notification settings UI.

To add scheduled summaries later, call the existing notification service from a thin Cloudflare `scheduled()` adapter and declare its UTC cron under the production environment. Do not move subscription or payload logic into the adapter.

After upgrading an installation that cached an older manifest, close all Executor tabs, open the browser's site settings for `executor.itsrobin.dev`, clear stored data/service workers once, then reload and install again. Normally the worker's versioned cache and `updateViaCache: "none"` update automatically.

Desktop Brave additionally requires **Settings → Privacy and security → Use Google services for push messaging** to be enabled; Brave documents that this toggle allows Web Push delivery. Chrome/Chromium and Android use their platform push service without an Executor-specific setting.

## Backup / restore

Before migration, run the audit and export against the explicitly labeled source. The ignored export contains every Executor row and a deterministic checksum. Restore to an empty database by applying committed Drizzle migrations, importing the export, and running verification. Keep provider snapshots and exports until after the 14-day observation window.

## Rollback

Stop standalone writes, preserve Worker logs and snapshot the target. If no valid standalone writes occurred, re-enable the embedded app. If they did, export/reconcile them first. Never discard valid new writes.

## Rotation after cutover

- Rotate the bootstrap target database password.
- Replace `DATABASE_URL` in local `.dev.vars` and the Worker secret.
- Rotate `BETTER_AUTH_SECRET` only with an intentional session invalidation/secret-rotation plan.
- Remove temporary owner bootstrap credentials from shell history/secret stores.
