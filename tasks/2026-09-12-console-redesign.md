# Console Redesign — Premium Portfolio

- **Status:** Needs Fixes
- **Branch:** task/console-redesign
- **Goal:** Redesign the portfolio with a "refined console" identity — sober, premium, professional — while keeping the git-graph project timeline as the core idea. Add dark/light theme toggle, fix responsive/a11y/SEO/content/assets.
- **Context:** Astro 5.16 static site on Cloudflare Workers. Current identity = "operator console" (hero `systemctl status`, horizontal git-graph SVG timeline of 11 projects with merge points, click → `<dialog>` modal). User decisions: console identity kept but premium-polished; dark + light toggle (first visit follows system); all fixes in scope (SEO/sitemap domain `rafaelferro.dev`, mobile responsive, a11y, dead assets, PT→EN consistency, enriched project data); contact = email + GitHub only; no per-project images (structure ready), no analytics, no contact form, no View Transitions (2 pages only, not worth it).

## Checklist
^- [x] **Theme system** — DONE 1385638 — semantic CSS tokens on `:root` (dark) + `[data-theme="light"]` override in `src/styles/global.css`; branch colors move from JSON to CSS tokens (`--branch-1`…`--branch-11` dark + light values, reference via `colorKey`). Theme script MUST be `<script is:inline>` and ordered BEFORE CSS emission in `BaseHead` (global CSS is imported in BaseHead frontmatter — inline script must precede it, e.g. import order / separate head partial), reads `localStorage.theme` → else `prefers-color-scheme` → sets `document.documentElement.dataset.theme` (no FOUC). Header toggle button (`aria-label`), click → flip `data-theme` + `localStorage.setItem`; `storage` event syncs across tabs. `color-scheme` property set per theme.
^- [x] **Typography + palette refinement** — DONE 1385638 — Space Grotesk weights 300/400/600 (add 300), Inter Variable + IBM Plex Mono kept; drop unused Atkinson fonts; unify container to single `--container: 960px` token (kill 920/1080/760 drift); 4/8/12/16/24/32/48 spacing scale; reduce glow to axis only (drop per-branch glow), tune `box-shadow` (0 12px 32px rgba(0,0,0,.35) dark / softer light); clean legacy tokens (`--accent/--border/--surface/--text-*/--bg/--black/--gray*`).
^- [x] **Hero refinado** — DONE 3fba3b4 — keep `systemctl status` console card concept, restructure hierarchy: name/role clearer, description tighter, meta grid (`loaded/since/uptime/region`) restyled with new tokens; buttons aligned (primary + ghost), remove visual noise.
^- [x] **Timeline dual-layout** — DONE 3fba3b4 — keep lane-packing math + HEAD rescale script; render desktop SVG (existing) + mobile vertical list (`<ol>` with CSS connectors) toggled via `@media (max-width: 760px)`. Mobile list REPLACES the existing `sr-only` `<ol>` (index.astro ~line 273) — no double timeline for screen readers; mobile items carry `data-project-id` + button semantics so existing modal binding (~line 361) works. Timeline accessible in both; branch colors from CSS tokens via `colorKey`; `HEAD · hoje` → "HEAD · today".
^- [x] **Modal a11y** — DONE 3fba3b4 — rely on NATIVE `<dialog>.showModal()` as primary (native focus trap, Escape close, background inertness + top-layer); NO homegrown double-trapping/`aria-hidden` background. Manual focus-restore to trigger only as fallback where needed; keyboard roving/navigation on timeline nodes; `prefers-reduced-motion` respected (caret, pulse, modal transitions). QA must verify Safari 18.x top-layer behavior.
^- [x] **SEO/meta + sitemap** — DONE 1385638 — `astro.config.mjs` `site: "https://rafaelferro.dev"`; per-page meta (title/description/og/canonical) via `src/consts.ts` + `BaseHead`; `@astrojs/sitemap` emitting real URLs; fix bad canonical on Workers.
^- [x] **Content EN (full)** — DONE 3fba3b4 + 9aefc5f — translate `index.astro` + `about.astro` + `Header`/`Footer` + `consts.ts` (`SITE_TITLE`, `SITE_DESCRIPTION`) to English; project data `name/description/details` normalized to EN where mixed; keep personal names/product names as-is.
^- [x] **Data enrichment** — DONE 3fba3b4 — `src/data/projects.json`: normalize `status` to lowercase `active`/`completed` AND update all `status === 'Active'` checks in index.astro frontmatter (lines ~31, ~32, ~69: isLive, exit label, lane-packing/HEAD-carry) to match; add `colorKey` (branch-N); add `liveUrl`, `repoUrl` per project; REPLACE existing `backgroundImage` field with `image` (null) — no duplicate dead field; modal shows live/repo links or "no demo" badge; keep `references.convergesInto` for graph.
^- [x] **Dead assets cleanup** — DONE 9aefc5f — delete `public/fonts/atkinson-*.woff`, `public/blog-placeholder-*.jpg` + `public/blog-placeholder-about.jpg`; remove unused imports/references; `.assetsignore` review; favicon kept. Contact surface stays email + GitHub only (footer already correct) — NO new socials.

## Subtasks
- **frontend:** all checklist items 1–9 (single module = this static site; one subagent with design-taste-frontend/impeccable skill guidance). Keep `src/` organized: token system in `global.css`, theme script inline in `BaseHead`, per-component styles scoped.
- **backend:** none — static site, no API/DB/services.
- **qa:** `npm run check` (astro build + tsc + wrangler dry-run) + Playwright e2e: theme toggle persists + no-FOUC (no theme flash on reload), mobile ≤760px shows vertical timeline, desktop shows SVG, modal opens/esc/keyboard, reduced-motion honored, EN copy spot-check, contrast AA snapshot on both themes.
- **github:** create parent + sub-issues from Checklist, confirm branch pushed, open DRAFT PR (base main) linked to issues; on finish mark READY.
- **deployer:** build + deploy (wrangler) after QA PASS + user approval, verify live site on rafaelferro.dev.
- **apidocs:** not needed — no API surface.

## Validation
(npm run check)
(npm run build)
(Playwright e2e: theme toggle/no-FOUC, mobile timeline switch, modal a11y, reduced-motion)
(visual: browser screenshots desktop + mobile, both themes, index + about)

## Why not continued
Frontend subagent hit repeated `STREAM_EARLY_EOF` (3x) before producing output — infrastructure/model endpoint failure, not a plan issue. Branch `task/console-redesign` is live on origin with init commit. Issues #3–12 + draft PR #13 exist. Plan validated PASS. Implementation split into Part A (foundation: tokens + SEO + cleanup + theme script in Header/BaseHead) → Part B (pages: index.astro hero/timeline/modal/a11y/data + about.astro + Header/Footer restyle + content EN). Resume: retry Part A, then Part B, then QA, then @github marks READY, then @deployer.

## Validation Log
### 2026-09-12T16:29:02.807Z

- `npm run check` → exit 1
```
> check
> astro build && tsc && wrangler deploy --dry-run

▶ Astro collects anonymous usage data.
  This information helps us improve Astro.
  Run "astro telemetry disable" to opt-out.
  https://astro.build/telemetry

18:29:11 [@astrojs/cloudflare] Enabling sessions with Cloudflare KV with the "SESSION" KV binding.
18:29:11 [@astrojs/cloudflare] If you see the error "Invalid binding `SESSION`" in your build output, you need to add the binding to your wrangler config file.
18:29:11 [WARN] [adapter] Cloudflare does not support sharp at runtime. However, you can configure `imageService: "compile"` to optimize images with sharp on prerendered pages during build time.
18:29:12 [content] Syncing content
18:29:12 [content] Synced content
18:29:12 [types] Generated 1.28s
18:29:12 [build] output: "static"
18:29:12 [build] mode: "server"
18:29:12 [build] directory: /root/hosting/portifolio-worker/dist/
18:29:12 [build] adapter: @astrojs/cloudflare
18:29:12 [build] Collecting build info...
18:29:12 [build] ✓ Completed in 1.39s.
18:29:12 [build] Building server entrypoints...
18:29:16 [ERROR] [vite] ✗ Build failed in 3.07s
[vite]: Rollup failed to resolve import "@fontsource-variable/inter" from "/root/hosting/portifolio-worker/src/components/BaseHead.astro".
This is most likely unintended because it can break your application at runtime.
If you do want to externalize this module explicitly add it to
`build.rollupOptions.external`
  Stack trace:
    at viteLog (file:///root/hosting/portifolio-worker/node_modules/vite/dist/node/chunks/dep-D4NMHUTW.js:46374:15)
    at onLog (file:///root/hosting/portifolio-worker/node_modules/vite/dist/node/chunks/dep-D4NMHUTW.js:46072:7)
    at Object.logger [as onLog] (file:///root/hosting/portifolio-worker/node_modules/rollup/dist/es/shared/node-entry.js:22968:9)
    at file:///root/hosting/portifolio-worker/node_modules/rollup/dist/es/shared/node-entry.js:21670:26
```

- `npm run build` → exit 1
```
> build
> astro build

18:29:24 [@astrojs/cloudflare] Enabling sessions with Cloudflare KV with the "SESSION" KV binding.
18:29:24 [@astrojs/cloudflare] If you see the error "Invalid binding `SESSION`" in your build output, you need to add the binding to your wrangler config file.
18:29:24 [WARN] [adapter] Cloudflare does not support sharp at runtime. However, you can configure `imageService: "compile"` to optimize images with sharp on prerendered pages during build time.
18:29:24 [content] Syncing content
18:29:24 [content] Synced content
18:29:24 [types] Generated 393ms
18:29:24 [build] output: "static"
18:29:24 [build] mode: "server"
18:29:24 [build] directory: /root/hosting/portifolio-worker/dist/
18:29:24 [build] adapter: @astrojs/cloudflare
18:29:24 [build] Collecting build info...
18:29:24 [build] ✓ Completed in 516ms.
18:29:24 [build] Building server entrypoints...
18:29:26 [ERROR] [vite] ✗ Build failed in 2.30s
[vite]: Rollup failed to resolve import "@fontsource-variable/inter" from "/root/hosting/portifolio-worker/src/components/BaseHead.astro".
This is most likely unintended because it can break your application at runtime.
If you do want to externalize this module explicitly add it to
`build.rollupOptions.external`
  Stack trace:
    at viteLog (file:///root/hosting/portifolio-worker/node_modules/vite/dist/node/chunks/dep-D4NMHUTW.js:46374:15)
    at onLog (file:///root/hosting/portifolio-worker/node_modules/vite/dist/node/chunks/dep-D4NMHUTW.js:46072:7)
    at Object.logger [as onLog] (file:///root/hosting/portifolio-worker/node_modules/rollup/dist/es/shared/node-entry.js:22968:9)
    at file:///root/hosting/portifolio-worker/node_modules/rollup/dist/es/shared/node-entry.js:21670:26
```

- `npm run check` → exit 127` → exit 2
```
/bin/sh: 1: Syntax error: EOF in backquote substitution
```

- `npm run build` → exit 127` → exit 2
```
/bin/sh: 1: Syntax error: EOF in backquote substitution
```

- `Playwright e2e: theme toggle/no-FOUC, mobile timeline switch, modal a11y, reduced-motion` → SKIPPED (not in allowlist)

- `visual: browser screenshots desktop + mobile, both themes, index + about` → SKIPPED (not in allowlist)

- `check` → SKIPPED (not in allowlist)

- `astro build && tsc && wrangler deploy --dry-run` → SKIPPED (not in allowlist)

- `sh: 1: astro: not found` → SKIPPED (not in allowlist)

- `build` → SKIPPED (not in allowlist)

- `astro build` → SKIPPED (not in allowlist)

- `sh: 1: astro: not found` → SKIPPED (not in allowlist)

- `Playwright e2e: theme toggle/no-FOUC, mobile timeline switch, modal a11y, reduced-motion` → SKIPPED (not in allowlist` → SKIPPED (not in allowlist)

- `visual: browser screenshots desktop + mobile, both themes, index + about` → SKIPPED (not in allowlist` → SKIPPED (not in allowlist)

- `pending` → SKIPPED (not in allowlist` → SKIPPED (not in allowlist)

- `pending` → SKIPPED (not in allowlist)

### 2026-09-12T15:34:08.564Z

- `npm run check` → exit 127
```
> check
> astro build && tsc && wrangler deploy --dry-run

sh: 1: astro: not found
```

- `npm run build` → exit 127
```
> build
> astro build

sh: 1: astro: not found
```

- `Playwright e2e: theme toggle/no-FOUC, mobile timeline switch, modal a11y, reduced-motion` → SKIPPED (not in allowlist)

- `visual: browser screenshots desktop + mobile, both themes, index + about` → SKIPPED (not in allowlist)

- `pending` → SKIPPED (not in allowlist)

- pending