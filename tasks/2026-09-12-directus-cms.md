# Directus CMS — self-hosted admin for portfolio projects

- **Status:** Implementing
- **Branch:** task/directus-cms
- **Goal:** Add a self-hosted Directus CMS (Docker + Traefik on the shared host, SQLite) at `cms.rafaelferro.dev` so the owner can log in and edit the 11 portfolio projects; the Astro site (unchanged design) fetches project data from the Directus REST API at build time, with a committed JSON snapshot fallback. Editing flow: owner edits in the Directus admin, clicks "Publish" → Directus Flow calls a GitHub Actions `workflow_dispatch` → build + `wrangler deploy`.
- **Context:** Portfolio is Astro 5.16 static (console premium design, shipped on main). Projects live in `src/data/projects.json` (11 entries). Worker deploys manually today (no `CLOUDFLARE_API_TOKEN` in env). Shared Traefik at `/root/hosting/traefik` (compose-traefik conventions: external `traefik_proxy` network, websecure/letsencrypt, no published ports, project-prefixed names). User decisions: subdomain `cms.rafaelferro.dev` (user adds DNS record pointing to host); deploy via CI + Publish button (workflow + Directus Flow; fails until `CLOUDFLARE_API_TOKEN` secret exists — manual deploy remains fallback); `/admin` protected by Traefik BasicAuth (API `/items` stays open, content is public); local backup of SQLite + uploads with 7-day retention cron. Reuse string PK ids ("libft" etc.) for zero frontend churn; add `sort` field for project order; images stay null (Directus Assets deferred); schema/seed idempotent via committed snapshot + REST upsert loop.

## Checklist
- [ ] **Compose + env** — `deploy/directus/docker-compose.yml`: top-level `name: portfolio-directus`; image pinned `directus/directus:12.0.2`; `restart: unless-stopped`; healthcheck (`wget --spider -q http://localhost:8055/server/ping`); volumes `./database`, `./uploads`, `./extensions`; env via `.env` + tracked `.env.example` (SECRET random, ADMIN_EMAIL/PASSWORD, DB_CLIENT=sqlite3, DB_FILENAME=/directus/database/data.db, PUBLIC_URL=https://cms.rafaelferro.dev/, CORS_ORIGIN=* ). Traefik labels: enable, router `cms.rafaelferro.dev`, entrypoints websecure, certresolver letsencrypt, server.port 8055, docker.network traefik_proxy; **admin router** `PathPrefix(\`/admin\`)` with BasicAuth middleware (users from `.env` BASIC_AUTH_USER + BCRYPT_HASH via htpasswd); main router stays open. No published ports.
- [ ] **Schema + seed** — committed Directus schema snapshot (`directus schema snapshot` output, e.g. `deploy/directus/schema.yaml`) + idempotent seed script (REST with admin token: GET by pk, POST if missing / PATCH if exists) migrating the 11 entries from `src/data/projects.json`. Collection `projects`: string PK id reused; fields name, type, start (JSON {month,year}), completion (JSON nullable), status dropdown (active|completed), colorKey dropdown (branch-1…branch-11), description, details, stack (JSON array), highlights (JSON array), liveUrl (string null), repoUrl (string null), image (string null), convergesInto (many-to-one self-relation, nullable), sort (integer). Permissions: public role read-only on projects; admin full CRUD.
- [ ] **Frontend data source swap** — new `src/data/projects.ts` exporting async `getProjects()`: fetch `import.meta.env.DIRECTUS_URL + /items/projects?fields=*,convergesInto.*` at build (public read, no token); map Directus fields to the exact current Project shape (index.astro untouched); on fetch error → log warning + return committed snapshot `src/data/projects.snapshot.json` (current JSON renamed, `references.convergesInto` shape preserved). `src/pages/index.astro` imports `await getProjects()` instead of JSON import. `.env.example` gains DIRECTUS_URL. Sort by `sort` field if present, else preserve current order.
- [ ] **GitHub Actions Publish workflow** — `.github/workflows/publish.yml`: `workflow_dispatch` → checkout, setup-node 22, npm ci, npm run build, `wrangler deploy` with `CLOUDFLARE_API_TOKEN` from repo secret; fails cleanly with message if secret unset. This is the target of the Directus Flow webhook.
- [ ] **Directus Flow "Publish"** — Directus Flow (created at setup via admin token, idempotent): manual trigger button in admin → HTTP request webhook to `https://api.github.com/repos/rapha4lx/portifolio-worker/actions/workflows/publish.yml/dispatches` (ref main, Accept header, auth via repo secret — directus env GITHUB_WORKFLOW_TOKEN or header input in flow). Includes admin button so the owner clicks once after edits.
- [ ] **Backup cron** — host cron (documented in README/ops note): daily `sqlite3 data.db ".backup"` → gzip to `./backups/data-YYYY-MM-DD.db.gz` + tar tags uploads; retention 7 days pruning.
- [ ] **DNS + TLS validation** — user adds DNS record `cms.rafaelferro.dev` → host IP (instruction in plan/README). After record propagates: `docker compose up -d` on host, validate HTTPS externally (curl/openssl handshake, cert via letsencrypt), `/server/ping` 200, `/items/projects` returns 11 records, `/admin` returns 401 without BasicAuth creds, 200 with.

## Subtasks
- **backend:** checklist 1, 2, 5, 6 (compose + schema + seed script + Flow creation helper + backup script) — new files under `deploy/`, scripts idempotent. Run `docker compose config` validation (needs directus image config check — do NOT `up` without DNS record: user must add DNS first).
- **frontend:** checklist 3 (`src/data/projects.ts` + snapshot + index import). Small, self-contained.
- **github:** checklist 4 — add `.github/workflows/publish.yml`, verify workflow file parses (`actionlint` if available). Sets up nothing requiring secrets; adds note to README about `CLOUDFLARE_API_TOKEN` secret.
- **qa:** `npm run check` + `npm run build` (with Directus unreachable → snapshot fallback path exercised; optionally with DIRECTUS_URL stubbed); `docker compose -f deploy/directus/docker-compose.yml config` parses; validate labels per compose-traefik skill (no ports, traefik_enable, certresolver, network, name); workflow YAML valid.
- **deployer:** after user confirms DNS record: bring Directus up on host, apply schema, seed data, create Flow, health/log watch, external HTTPS validation (https skill), backup cron install. Report DEPLOYED/DEPLOY_FAILED.
- **https:** included in deployer step (TLS for cms subdomain: certresolver labels + external curl/openssl validation). Only runnable after user's DNS record exists.

## Validation
(npm run check)
(npm run build)
(docker compose -f deploy/directus/docker-compose.yml config)
(workflow YAML: actionlint / parse)
(curl -sIo /dev/null https://cms.rafaelferro.dev/server/ping → 200 after DNS+up)
(curl -s https://cms.rafaelferro.dev/items/projects → 11 items)
(curl -sI https://cms.rafaelferro.dev/admin → 401 before/401 wrong creds/200 with creds)

## Why not continued
(empty)

## Validation Log
- pending