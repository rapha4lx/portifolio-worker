# Astro Starter Kit: Blog

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/cloudflare/templates/tree/main/astro-blog-starter-template)

![Astro Template Preview](https://github.com/withastro/astro/assets/2244813/ff10799f-a816-4703-b967-c78997e8323d)

<!-- dash-content-start -->

Create a blog with Astro and deploy it on Cloudflare Workers as a [static website](https://developers.cloudflare.com/workers/static-assets/).

Features:

- ✅ Minimal styling (make it your own!)
- ✅ 100/100 Lighthouse performance
- ✅ SEO-friendly with canonical URLs and OpenGraph data
- ✅ Sitemap support
- ✅ RSS Feed support
- ✅ Markdown & MDX support
- ✅ Built-in Observability logging

<!-- dash-content-end -->

## Getting Started

Outside of this repo, you can start a new project with this template using [C3](https://developers.cloudflare.com/pages/get-started/c3/) (the `create-cloudflare` CLI):

```bash
npm create cloudflare@latest -- --template=cloudflare/templates/astro-blog-starter-template
```

A live public deployment of this template is available at [https://astro-blog-starter-template.templates.workers.dev](https://astro-blog-starter-template.templates.workers.dev)

## 🚀 Project Structure

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

The `src/content/` directory contains "collections" of related Markdown and MDX documents. Use `getCollection()` to retrieve posts from `src/content/blog/`, and type-check your frontmatter using an optional schema. See [Astro's Content Collections docs](https://docs.astro.build/en/guides/content-collections/) to learn more.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                           | Action                                           |
| :-------------------------------- | :----------------------------------------------- |
| `npm install`                     | Installs dependencies                            |
| `npm run dev`                     | Starts local dev server at `localhost:4321`      |
| `npm run build`                   | Build your production site to `./dist/`          |
| `npm run preview`                 | Preview your build locally, before deploying     |
| `npm run astro ...`               | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help`         | Get help using the Astro CLI                     |
| `npm run build && npm run deploy` | Deploy your production site to Cloudflare        |
| `npm wrangler tail`               | View real-time logs for all Workers              |

> **Publish workflow:** `.github/workflows/publish.yml` (`workflow_dispatch`) requires repo secrets `CLOUDFLARE_API_TOKEN` (required) and `CLOUDFLARE_ACCOUNT_ID` (optional; needed for multi-account tokens) — GitHub → Settings → Secrets → Actions. Without the token the workflow aborts with a readable error; manual `npm run deploy` remains the fallback.

## 👀 Want to learn more?

Check out [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).

## Credit

This theme is based off of the lovely [Bear Blog](https://github.com/HermanMartinus/bearblog/).

---

## CMS ops (Directus)

Self-hosted Directus 12 CMS at `cms.rafaelferro.dev` (Docker + Traefik on shared
host, SQLite). Admin SPA routes are behind Traefik BasicAuth; the API
(`/items`, `/server`, `/assets`) is public read via a Directus public policy.

### 1. DNS (user action — prerequisite)

Add a DNS record so the host can issue the TLS cert:

```
cms.rafaelferro.dev  A  <host IP>
```

Everything below runs after the record resolves. Do **not** start the stack
before DNS exists (Traefik/cert issuance will fail).

### 2. Bring up + apply schema + seed

From the repo root on the host:

```bash
cd deploy/directus
cp .env.example .env          # fill SECRET, ADMIN_*, BASIC_AUTH_*, DIRECTUS_URL, GITHUB_WORKFLOW_TOKEN
docker compose up -d          # external traefik_proxy network; no published ports
# wait for healthcheck:  docker compose ps
npx directus schema apply --yes deploy/directus/schema.yaml   # from repo root (env from .env)
node deploy/directus/permissions.mjs                          # public read-only policy + admin CRUD
node deploy/directus/seed.mjs                                 # upsert 11 projects from snapshot/projects.snapshot.json
node deploy/directus/create-flow.mjs                          # manual "Publish" flow -> GitHub Actions dispatch
```

The scripts are idempotent — safe to re-run. `schema apply` reports
"No changes to apply" when already in sync; `permissions.mjs` / `seed.mjs` /
`create-flow.mjs` skip or upsert instead of duplicating.

### 3. Publish button (repo secrets)

The Directus Flow "Publish" dispatches `.github/workflows/publish.yml`
(`workflow_dispatch`). The workflow needs repo secrets (GitHub → Settings →
Secrets → Actions):

- `CLOUDFLARE_API_TOKEN` — **required**; the workflow aborts with a readable
  error when missing.
- `CLOUDFLARE_ACCOUNT_ID` — optional, needed for multi-account tokens.

Manual fallback (also usable with the same secrets exported):

```bash
npm run build && npx wrangler deploy
```

### 4. Daily backup (cron)

`deploy/directus/backup.sh` snapshots `database/data.db` via the
`nouchka/sqlite3` Docker image (host has no sqlite3), gzips it, tars `uploads/`,
and prunes backups older than 7 days. Install as a host cron job:

```bash
crontab -e
# add:
0 3 * * * /root/hosting/portifolio-worker/deploy/directus/backup.sh >> /root/hosting/portifolio-worker/deploy/directus/backups/backup.log 2>&1
```

Backups land in `deploy/directus/backups/` (`data-YYYY-MM-DD.db.gz`,
`uploads-YYYY-MM-DD.tar.gz`).
