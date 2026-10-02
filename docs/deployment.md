# Deployment

## Deploy your own instance

Run these commands from the repository root unless a step says otherwise. An AI following this guide should use only its operator's accounts, domains, and credentials; never reuse values from another Executor instance.

1. Install Node 20.9+ and run `npm install`.
2. Create an empty PostgreSQL database (the current adapter is Neon-compatible) and save its HTTPS/PostgreSQL connection URL.
3. Copy `apps/api/.dev.vars.example` to `apps/api/.dev.vars`. Set `DATABASE_URL`, `ALLOWED_ADMIN_EMAIL`, and 32+-character `BETTER_AUTH_SECRET` and `ADMIN_BOOTSTRAP_TOKEN` values. Generate VAPID keys with `npx web-push generate-vapid-keys`, fill all three `VAPID_*` values, and use `mailto:operator@example.com` for `VAPID_SUBJECT`.
4. Run `npm run db:migrate`. This creates the schema in the database named by local `.dev.vars`.
5. Copy both production examples to their ignored private counterparts:

   ```bash
   cp apps/api/wrangler.production.example.jsonc apps/api/wrangler.production.private.jsonc
   cp apps/web/wrangler.production.example.jsonc apps/web/wrangler.production.private.jsonc
   ```

6. In the API private config, set a unique Worker `name`, `WEB_ORIGIN`, `BETTER_AUTH_URL`, `ALLOWED_ADMIN_EMAIL`, and a domain route the operator controls. In the web private config, set its unique Worker `name`, domain route, service name, and `NEXT_PUBLIC_API_URL` to the API's exact HTTPS URL. Configure the corresponding custom domains/DNS in Cloudflare before deploying. The web origin and `WEB_ORIGIN` must match exactly.
7. From `apps/api`, sign in with `npx wrangler whoami`, set the six Worker secrets below, then return to the repository root and run `npm run api:deploy` followed by `npm run web:deploy`.

The values belong in these places only: local database and API settings in `apps/api/.dev.vars`; local browser API URL in `apps/web/.env.local`; production API secrets in Wrangler secrets; deployable public origins/routes in the ignored production-private config files. Do not put secrets in tracked files, command arguments, or Git.

## Local development

The API and web app are separate processes. Start both with `npm run dev`, or run `npm run dev:api` and `npm run dev:web` in separate terminals. Confirm the API is ready before signing in:

```bash
curl http://localhost:8787/health
```

If login reports that the API is unavailable, check that the API process is still running, that `NEXT_PUBLIC_API_URL` points to the API origin, and that `WEB_ORIGIN` exactly matches the web origin. A login request should never be redirected to a production API while testing a local instance unless that is intentional.

Use the ignored `apps/api/.dev.vars` file for every local API setting. The minimum security-related values are:

| Setting | Purpose | Where it belongs |
| --- | --- | --- |
| `ALLOWED_ADMIN_EMAIL` | The only email permitted to access protected data. | Local `.dev.vars`; ignored production Worker config. |
| `ADMIN_BOOTSTRAP_TOKEN` | A unique random value required to create the first account. | Local `.dev.vars`; Cloudflare Worker secret. |
| `BETTER_AUTH_SECRET` | Signs authentication state. | Local `.dev.vars`; Cloudflare Worker secret. |

Generate secret values with a password manager or a cryptographically secure generator. Never copy sample values into a real instance.

## Configure your instance

The tracked `wrangler.jsonc` files are safe local/template configs named `executor-*-template`; they cannot target a production Executor Worker. Production deploys require a full, ignored private config, so a public clone is usable without containing another operator’s account, domains, routes, or public origins.

For each app, copy its `wrangler.production.example.jsonc` to `wrangler.production.private.jsonc` and replace every example value. The private file is ignored by Git. Set your Cloudflare account there or through `CLOUDFLARE_ACCOUNT_ID` in the deployment environment.

The web origin and API origin must use HTTPS in production. `WEB_ORIGIN` must exactly match the web origin because authenticated API requests use credentialed CORS.

## Access-control setup

This application is intentionally configured as a single-admin deployment. An AI or operator must treat the following values as security-sensitive configuration:

- `ALLOWED_ADMIN_EMAIL` is a non-secret Worker variable and belongs only in ignored local/private configuration. Never place a real address in a tracked example, documentation, test fixture intended for deployment, or source file.
- `ADMIN_BOOTSTRAP_TOKEN` is a high-entropy secret. Keep it in local `.dev.vars` during setup and as a Cloudflare Worker secret in production. Never commit it, expose it in CI logs, or pass it as a command-line argument.
- `BETTER_AUTH_SECRET` is also a secret; rotating it invalidates sessions and needs a deliberate sign-out plan.

Apply database migrations before deploying authorization code. For an already-created allowlisted account, run `npm run auth:grant-admin -w @executor/api` after migration to assign the `admin` role. For a new instance, use the protected bootstrap command below; it creates the account and assigns the role. Do not create an account through a browser or direct API call.

An AI working on a deployment must not infer, print, commit, or reuse an operator’s email address, domains, secrets, database URL, Cloudflare account ID, or private configuration. Use the operator’s ignored configuration files and secret prompts only.

## API / Cloudflare Workers

From `apps/api`, first create the private config and configure required Worker Secrets:

```bash
npx wrangler whoami
npm run update-connection
npx wrangler secret put BETTER_AUTH_SECRET --config wrangler.production.private.jsonc
npx wrangler secret put VAPID_PUBLIC_KEY --config wrangler.production.private.jsonc
npx wrangler secret put VAPID_PRIVATE_KEY --config wrangler.production.private.jsonc
npx wrangler secret put VAPID_SUBJECT --config wrangler.production.private.jsonc
npx wrangler secret put ADMIN_BOOTSTRAP_TOKEN --config wrangler.production.private.jsonc
```

Then run `npm run api:deploy`. The command refuses to run without `wrangler.production.private.jsonc` and deploys using that file. Never pass secret values as command arguments or commit them. Verify `/health`, `/ready`, authentication, and a read/write flow after deployment.

The current adapter uses Neon’s serverless HTTP driver. It is isolated from domain behavior, so another PostgreSQL provider can be adopted by changing the adapter and validating repository behavior.

After deployment, create the only permitted account by pointing the local bootstrap command at the production API and web origin, then verify login. `OWNER_EMAIL` must match `ALLOWED_ADMIN_EMAIL`; keep the password and bootstrap token out of source control and shell history where possible:

```bash
OWNER_EMAIL=admin@example.com OWNER_PASSWORD='choose-a-strong-password' OWNER_NAME='Your Name' BETTER_AUTH_URL=https://your-api.example.com WEB_ORIGIN=https://your-web.example.com npm run auth:bootstrap-owner -w @executor/api
```

Verify the deployed API after every authorization change: `/health` must return `200`; a sign-up attempt without `x-executor-bootstrap-token` must return `403`; and the configured administrator must be able to sign in and use a read/write API flow. Do not test by attempting a real unauthorized account creation.

## Web

Set `NEXT_PUBLIC_API_URL` in `apps/web/wrangler.production.private.jsonc` to your API’s HTTPS origin, then run `npm run web:deploy`. The command reads the value before building, so it is embedded in the client bundle, and deploys using the same private config. It refuses to run when the private config is missing.

## Continuous deployment

A push does not deploy this repository by itself. If you add GitHub Actions or another CI system, store `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as encrypted CI secrets. Materialize each `wrangler.production.private.jsonc` from an encrypted CI secret immediately before the corresponding deploy command, then remove it when the job finishes. Do not use the tracked template config to deploy a real production Worker.

## PWA and Web Push

- Manifest: `apps/web/src/app/manifest.ts`
- Service worker: `apps/web/public/sw.js`
- Icons: `apps/web/public/icons/`
- Device controls: the bell button in the signed-in Executor header

Generate VAPID keys once with `npx web-push generate-vapid-keys`. Keep the private key out of Git, place the three `VAPID_*` values in `apps/api/.dev.vars` locally, and use Wrangler secrets in production. Apply `npm run db:migrate` before deploying the push API. A signed-in user can enable or disable the current device and invoke `/api/v1/push/test` from the notification settings UI.

Item reminders run every 10 minutes (`*/10 * * * *`) so a quiet Neon database can scale to zero. A timed reminder can therefore arrive up to about 10 minutes late. The Worker sends an agenda at **08:00 Asia/Kolkata** (`30 2 * * *` UTC) and an evening check-in at **19:00 Asia/Kolkata** (`30 13 * * *` UTC). Each per-user reminder or daily run is claimed in `push_notification_runs` before delivery so Cloudflare’s at-least-once cron execution cannot duplicate a notification. Reminder timestamps are stored in UTC after the browser converts the user’s local `datetime-local` value.

If a browser retains an outdated service worker after an upgrade, clear the site’s stored data and service workers once, then reload and install again. Normally the versioned cache and `updateViaCache: "none"` update automatically.

Brave on desktop and Android may require **Settings → Privacy and security → Use Google services for push messaging** to be enabled; fully close and reopen Brave after changing it.

## Native Expo app

`apps/mobile` is the native Executor shell. It renders the deployed PWA, so the mobile layout, colors, spacing, and interactions remain identical to the web app while notifications are delivered through Expo's native push service.

1. Copy `apps/mobile/.env.example` to the ignored `apps/mobile/.env` and set the deployed web and API HTTPS origins.
2. Apply the API migration with `npm run db:migrate`; it adds the `expo_push_tokens` table used by native reminders.
3. Run `npm run android -w @executor/mobile` to open the connected Android device. A physical device needs a development build for reliable remote notifications; Expo Go is not a notification test target.

The Expo project ID is already linked in `apps/mobile/app.json`. The native app registers its Expo token after the user signs in to the existing PWA, and all existing morning, evening, timed, and test notifications are sent to both web and native registrations. Notification taps open the route included with the reminder.

## Backups and secret rotation

Use your PostgreSQL provider’s backup and restore facilities and keep exports outside the repository. To rotate a database credential, update the local `DATABASE_URL`, then run `npm run update-connection` from the repository root and paste the new value only at the prompt. The command updates the production Worker secret; it does not read or upload `.dev.vars`. Deploy with `npm run api:deploy` afterward if you also changed code or configuration. Rotate `BETTER_AUTH_SECRET` only with an intentional session invalidation plan. Rotate `ADMIN_BOOTSTRAP_TOKEN` after initial provisioning or whenever its confidentiality is uncertain, then update both the local secret and Cloudflare Worker secret before the next bootstrap attempt. Remove temporary bootstrap credentials from shell history and secret stores.
