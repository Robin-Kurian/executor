# Executor agent notes

- This repository is the standalone source of truth for Executor.
- Preserve civil dates as `YYYY-MM-DD` strings across web/API boundaries.
- Keep domain behavior in `packages/domain`, API schemas in `packages/contracts`, and runtime/database adapters in `apps/api`.
- Never commit `.dev.vars`, database URLs, auth secrets, exported production data, or backups.
- Before changing Next.js code, read the relevant guide in `node_modules/next/dist/docs/`.
- Before changing Worker configuration or deployment code, validate against the installed Wrangler schema and current Cloudflare documentation.
