# Security Policy

Executor is designed as a self-hosted, single-administrator application. Each operator is responsible for their own database, Cloudflare, Expo, Firebase, email, and push credentials.

## Reporting a vulnerability

Use GitHub's private vulnerability reporting for this repository when available. Do not place credentials, database contents, private configuration, exploit details, or personal data in a public issue. If private reporting is unavailable, open a minimal issue asking the maintainer to establish a private contact channel without including sensitive details.

## Secret-handling rules

Never commit or attach any of the following:

- `.dev.vars`, non-example `.env*`, or `wrangler*.private.*` files.
- Database URLs, dumps, exports, auth/bootstrap secrets, provider tokens, or private keys.
- Firebase service files, mobile signing material, provisioning profiles, or store credentials.
- Production data, session/cookie values, push subscriptions, or authentication tables.

The repository's example configuration files must contain placeholders only. Public origins, `NEXT_PUBLIC_*` values, VAPID public keys, Expo/Firebase project IDs, mobile app IDs, and package/bundle identifiers are not authentication secrets, but forks should replace them because they identify another operator's infrastructure.

For private remote access, prefer a tailnet-only reverse proxy such as Tailscale Serve and keep the application processes on loopback. Tailscale Funnel is public internet exposure and must not be presented as a private-hosting option. Network restrictions supplement rather than replace Executor authentication.

Before pushing, review `git status --short` and use `git check-ignore -v <path>` for every local configuration or generated credential file. Remember that `.gitignore` does not untrack a file that is already committed.

## If a secret is exposed

1. Revoke or rotate it at the issuing provider immediately. Do not wait for a code cleanup.
2. Replace it in every legitimate runtime and verify the old value no longer works.
3. Remove the material from the current tree.
4. Review all Git history, CI artifacts, logs, releases, caches, forks, and backups that may contain it.
5. Coordinate a history rewrite and force-push when appropriate. A later deletion commit does not remove an earlier public object.
6. Enable GitHub secret scanning and push protection, and resolve the resulting security alert only after rotation.

For database or backup exposure, assume all application data and authentication records in that database were disclosed and respond accordingly.
