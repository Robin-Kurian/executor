# Executor data verification

Generated: 2026-09-30T22:26:58.673Z

Result: **PASS**

| Table | Source | Target | Checksum match |
| --- | ---: | ---: | --- |
| plans | 5 | 5 | yes |
| plan_items | 16 | 16 | yes |
| item_completions | 12 | 12 | yes |
| plan_notes | 1 | 1 | yes |

- Foreign-key orphans: {"items":0,"completions":0,"plan_notes":0,"item_notes":0}
- Duplicate item/date completions: 0
- Completion date range: 2026-09-18 to 2026-09-30
- Invalid plan ranges: 0
- Empty custom recurrences: 0
- Invalid quantity targets/steps: 0
- Quantity sample aggregate: 3 items, targets 3.78–15, all 3 with explicit step presets
- Plan boundary sample aggregate: 2 bounded plans, earliest start 2026-09-08, latest end 2026-11-21
- Better Auth bootstrap: 1 standalone owner

Deterministic SHA-256 checksums compare every explicitly exported column ordered by primary key. Today, Calendar, Inbox, plan history, and notes use the same migrated rows and preserved domain functions; authenticated HTTP fixture comparisons are recorded during smoke testing.

## Behavior and production smoke

- Legacy source `Today` for 2026-09-30 vs standalone `/api/v1/today`: exact JSON match
- Legacy source September Calendar vs standalone `/api/v1/calendar`: exact JSON match
- Legacy source Inbox vs standalone `/api/v1/inbox`: exact JSON match
- Production owner login/session/logout, 5-plan read, 9 actionable Today items, 30 calendar days, 1 Inbox item, health, readiness, CORS, and OpenAPI passed
- Legacy embedded Executor write methods return `409` and the standalone URL during the observation window

## PWA / Push verification

- Manifest contract tests cover root scope, standalone display, 192/512 PNG icons, and a maskable icon.
- Service-worker contract tests cover root registration, offline fallback, same-origin-only caching, network-only writes/API, and notification click routing.
- Push service tests cover authenticated ownership, same-device duplicate upsert, per-owner unsubscribe, fixed test payload generation, and automatic 404/410 cleanup.
- Production Brave/Chromium reported zero manifest errors and zero installability errors; the active worker controlled a fresh in-scope navigation.
- Production app-window launch reported `display-mode: standalone`.
- A real FCM-backed Brave subscription was stored, accepted three test deliveries (`delivered: 1`, no failures), and was then removed from both browser and Neon; the table returned to 0 test rows.
