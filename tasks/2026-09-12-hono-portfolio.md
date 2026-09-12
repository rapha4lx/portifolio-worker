# Hono Portfolio — replace Astro site with GitHub-synced Hono worker

- **Status:** Validated
- **Branch:** task/hono-portfolio
- **Goal:** Replace the Astro static portfolio (repo /root/hosting/portifolio-worker) with a **Hono app on Cloudflare Workers** that becomes the live `rafaelferro.dev`: SSR pages (Hono JSX), clean professional light-first design with subtle terminal accent, grid of project cards + detail pages, projects auto-synced from the GitHub API (48 non-fork repos of rapha4lx) with edge caching, and per-project markdown narrative files the owner edits alongside Rafael (the user) to tell each project's story better.
- **Context:** Current site = Astro 5.16 static (console dark premium design) → dist/_worker.js, deployed via `npx wrangler deploy` (user-managed). User decisions: replaces portifolio (new site IS rafaelferro.dev); stack = Hono Worker + cache layer; display = grid cards + detail pages; details = markdown per project in repo (GitHub-editible); identity = clean pro light-first + subtle terminal; GitHub = all non-fork repos (repos without md still get auto-cards); Directus stays running (cms.rafaelferro.dev) but unused by this site. Researcher verdict: no Vite (SSR-only, plain wrangler + esbuild), caches.default + stale-while-revalidate for GitHub API, marked at build → src/generated/projects.json, drop nodejs_compat, pin wrangler 4.56.0. Defaults (no user question needed): drop rss.xml; GitHub anon + SWR (add GH_TOKEN env only if 429s in logs); keep dash-created prod route (no wrangler routes change); clean removal of old Astro src/ (git history preserves it) while KEEPING deploy/directus (Directus live + backup); filters = server-side query params (?lang=) shareable URLs; language = colored dot + text (no icon lib); single page grid (no pagination); no analytics.

## Checklist
- [ ] **Scaffold Hono worker** — replace Astro deps in `package.json` (remove astro/@astrojs/*, add hono, esbuild, marked, typescript, wrangler pinned exactly 4.56.0); scripts: `dev` (wrangler dev), `build` (node scripts/build-projects.mjs && esbuild src/index.tsx --bundle --format=esm --outfile=dist/index.js --jsx=automatic **--jsx-import-source=hono/jsx**), `check` (tsc --noEmit && npm run build && wrangler deploy --dry-run), `cf-typegen` (wrangler types), `deploy` (wrangler deploy). `tsconfig.json`: **`"jsx": "react-jsx"` + `"jsxImportSource": "hono/jsx"`** (required — Hono JSX runtime, NOT React), moduleResolution bundler, types worker-configuration. `wrangler.json`: main ./dist/index.js, assets {directory ./public, binding ASSETS, run_worker_first true, not_found_handling none, html_handling auto-trailing-slash}, DROP nodejs_compat, keep observability.enabled + upload_source_maps. Delete astro.config.mjs + old Astro src/ EXCEPT: relocate `src/data/projects.snapshot.json` → `deploy/directus/snapshot/projects.snapshot.json` and update `deploy/directus/seed.mjs` path (Directus re-seed must keep working); keep `deploy/directus/`, `.github/`, `tasks/`, README refactored. Delete stale `public/.assetsignore`; `.env.example` DIRECTUS_URL entry updated/removed (Directus env still has its own .env — repo example now for the site, drop DIRECTUS_URL). **ASSETS passthrough routes** (run_worker_first means worker runs before assets; static files only served via explicit `c.env.ASSETS.fetch(c.req.raw)` routes): favicon.svg, profile assets, /global.css, og image + catch-all fallback to ASSETS before styled 404.
- [ ] **Build pipeline + markdown** — `src/projects/*.md` (frontmatter: slug, title, repo (GitHub key), visible (default true), blurb, order; body = narrative). `scripts/build-projects.mjs` (node): parse frontmatter (marked → html string), reconcile with GitHub repo list **BEST-EFFORT — network/rate-limit failure MUST NOT fail the build** (warn + md-only; optionally reconcile against `deploy/directus/snapshot/projects.snapshot.json` fallback), emit `src/generated/projects.json` deterministic + COMMIT it (cold checkout builds without GitHub). Commit example markdown for flagship projects (minishell, cloudflare-ddns, sessiondb-mcp, BayHub) with real narrative; rest auto-cards.
- [ ] **GitHub service + cache** — `src/lib/github.ts`: fetch `GET /users/rapha4lx/repos?per_page=100&sort=updated`; filter `!fork && !archived`; fields name/description/language/stargazers_count/topics/homepage/html_url/updated_at. Cache via `caches.default` (full-URL key): fresh → serve; stale → serve + `ctx.waitUntil(revalidate)`; miss → fetch + cache; in-flight `Map<url, Promise>` dedupe (isolate-local). maxAge 1h. Fallback: fetch error/timeout → serve stale, degrade markdown-only cards, NEVER 500.
- [ ] **Routes SSR** — `src/index.tsx` + `src/renderer.tsx` (jsxRenderer layout: meta/OG/canonical, fonts, assets links, skip-link, footer). Routes: `/` home (hero + grid + filter pills), `/projects` grid + landing (`/projects/` trailing slash → redirect to `/projects`), `/projects/[slug]` detail (md narrative + repo meta + edit link to GitHub blob), `/about`, `/sitemap.xml` (XML-escape repo descriptions; og image absolute URL), `/robots.txt`, redirects (`/index.html`→`/`, old astro paths), ASSETS passthrough (`/favicon.svg`, `/global.css`, `/profile-*`, `/og.*` via `env.ASSETS.fetch`) + catch-all ASSETS attempt then styled 404. JSON-LD (WebSite+Person) on home only. Per-page title/description/og:image (1 generic OG image served from public/).
- [ ] **Design system** — `public/global.css` plain CSS custom props, light-first tokens (bg #FAFAFA, fg #09090B, card #FFF, border #E4E4E7, accent #2563EB, muted #71717A), terminal accent (mono meta/language chips, `$`-prefixed eyebrow or code-ish hero line), typography Space Grotesk (display) + Archivo (body) + JetBrains Mono (meta) via Google Fonts font-display swap + preload. A11y: skip-link, focus-visible rings, AA contrast (language color variants darkened for white bg), prefers-reduced-motion, grid auto-fill minmax(280px,1fr) → 1fr <640px.
- [ ] **GitHub Actions workflow update** — `.github/workflows/publish.yml`: replace `npm run build` (was astro build) with new build (tsc/esbuild + projects.json gen) — same trigger workflow_dispatch, CI_TOKEN abort + CLOUDFLARE_ACCOUNT_ID env kept.
- [ ] **Validation + deploy** — local `wrangler dev` smoke (routes, filter ?lang=, detail, trailing-slash redirects, 404, sitemap, static assets served), `npm run check` green, GitHub API cache path (cold + stale), then deploy to prod (replaces live rafaelferro.dev — user approval at deploy). Post-deploy curl matrix: /, /projects, /projects/ (→301/308), /projects/<slug> (md one AND auto-card one), /about, /sitemap.xml, /robots.txt, /global.css (200), /favicon.svg (200), /index.html→301, unknown→404 styled, headers/cache hit.

## Subtasks
- **backend:** checklist 1 (scaffold/wrangler/package), 3 (github.ts cache service), part of 2 (build-projects.mjs). Files: package.json, wrangler.json, tsconfig, src/lib/github.ts, scripts/build-projects.mjs, src/generated/ (generated, gitignored? NO — commit it? decide: commit generated json so cold checkout builds without GH; keep committed).
- **frontend:** checklist 4 (routes JSX pages + renderer), 5 (design system css + layout), part of 2 (example markdown narratives). design-taste-frontend/impeccable quality bar.
- **github:** checklist 6 — update publish.yml to new build command.
- **qa:** npm run check; local wrangler dev smoke matrix; cache path test (curl -I cache headers); workflow yaml parse; no secrets.
- **deployer:** prod deploy (wrangler), post-deploy curl matrix, rate-limit/cache observation, report DEPLOYED/DEPLOY_FAILED. DIRECTUS UNTOUCHED.
- **apidocs:** N/A (site, not API).

## Validation
(npm run check)
(npm run build)
(wrangler dev local smoke: / /projects /about /projects/minishell /sitemap.xml /robots.txt /index.html→301 unknown→404)
(post-deploy curl matrix on rafaelferro.dev)
(workflow yaml parse)

## Why not continued
(empty)

## Validation Log
### 2026-09-12T22:53:06.976Z

- `npm run check` → exit 0
```
> check
> astro build && tsc && wrangler deploy --dry-run

00:53:16 [@astrojs/cloudflare] Enabling sessions with Cloudflare KV with the "SESSION" KV binding.
00:53:16 [@astrojs/cloudflare] If you see the error "Invalid binding `SESSION`" in your build output, you need to add the binding to your wrangler config file.
00:53:16 [WARN] [adapter] Cloudflare does not support sharp at runtime. However, you can configure `imageService: "compile"` to optimize images with sharp on prerendered pages during build time.
00:53:17 [content] Syncing content
00:53:17 [content] Synced content
00:53:17 [types] Generated 1.02s
00:53:17 [build] output: "static"
00:53:17 [build] mode: "server"
00:53:17 [build] directory: /root/hosting/portifolio-worker/dist/
00:53:17 [build] adapter: @astrojs/cloudflare
00:53:17 [build] Collecting build info...
00:53:17 [build] ✓ Completed in 1.21s.
00:53:17 [build] Building server entrypoints...
00:53:22 [vite] ✓ built in 4.57s
00:53:22 [build] ✓ Completed in 4.69s.

 building client (vite) 
00:53:22 [vite] transforming...
00:53:22 [vite] ✓ 2 modules transformed.
00:53:22 [vite] rendering chunks...
00:53:22 [vite] ✓ built in 71ms

 prerendering static routes 
00:53:22 ▶ src/pages/about.astro
00:53:22   └─ /about/index.html (+58ms) 
00:53:22 ▶ src/pages/index.astro
00:53:22   └─ /index.html (+58ms) 
00:53:22 ✓ Completed in 204ms.

00:53:22 [build] Rearranging server assets...
00:53:22 [@astrojs/sitemap] `sitemap-index.xml` created at `dist`
00:53:22 [build] Server built in 6.54s
00:53:22 [build] Complete!

 ⛅️ wrangler 4.56.0 (update available 4.131.1)
──────────────────────────────────────────────
Total Upload: 498.14 KiB / gzip: 111.11 KiB
Your Worker has access to the following bindings:
Binding            Resource      
env.ASSETS         Assets        

--dry-run: exiting now.
[projects] DIRECTUS_URL not set — using snapshot
```

- `npm run build` → exit 0
```
> build
> astro build

00:53:49 [@astrojs/cloudflare] Enabling sessions with Cloudflare KV with the "SESSION" KV binding.
00:53:49 [@astrojs/cloudflare] If you see the error "Invalid binding `SESSION`" in your build output, you need to add the binding to your wrangler config file.
00:53:49 [WARN] [adapter] Cloudflare does not support sharp at runtime. However, you can configure `imageService: "compile"` to optimize images with sharp on prerendered pages during build time.
00:53:50 [content] Syncing content
00:53:50 [content] Synced content
00:53:50 [types] Generated 597ms
00:53:50 [build] output: "static"
00:53:50 [build] mode: "server"
00:53:50 [build] directory: /root/hosting/portifolio-worker/dist/
00:53:50 [build] adapter: @astrojs/cloudflare
00:53:50 [build] Collecting build info...
00:53:50 [build] ✓ Completed in 922ms.
00:53:50 [build] Building server entrypoints...
00:53:54 [vite] ✓ built in 3.84s
00:53:54 [build] ✓ Completed in 3.96s.

 building client (vite) 
00:53:54 [vite] transforming...
00:53:54 [vite] ✓ 2 modules transformed.
00:53:54 [vite] rendering chunks...
00:53:54 [vite] ✓ built in 168ms

 prerendering static routes 
00:53:54 ▶ src/pages/about.astro
00:53:54   └─ /about/index.html (+40ms) 
00:53:54 ▶ src/pages/index.astro
00:53:54   └─ /index.html (+33ms) 
00:53:54 ✓ Completed in 178ms.

00:53:54 [build] Rearranging server assets...
00:53:55 [@astrojs/sitemap] `sitemap-index.xml` created at `dist`
00:53:55 [build] Server built in 5.40s
00:53:55 [build] Complete!
[projects] DIRECTUS_URL not set — using snapshot
```

- `wrangler dev local smoke: / /projects /about /projects/minishell /sitemap.xml /robots.txt /index.html→301 unknown→404` → SKIPPED (not in allowlist)

- `post-deploy curl matrix on rafaelferro.dev` → SKIPPED (not in allowlist)

- `workflow yaml parse` → SKIPPED (not in allowlist)

- `pending` → SKIPPED (not in allowlist)

- pending