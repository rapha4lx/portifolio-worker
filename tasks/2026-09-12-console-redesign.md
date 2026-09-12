# Console Redesign — Premium Portfolio

- **Status:** Done — merged ae4d54e; deploy still MANUAL (user merged without deploy); live rafaelferro.dev NOT updated until manual `npm run build && npx wrangler deploy`
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
- 2026-09-12 QA PASS (`8088a83`): `npm run build` ok; `npm run check` (astro build + tsc + wrangler --dry-run) ok. dist/index.html: inline theme script BEFORE stylesheet, `data-theme` set, lang=en. sitemap-index.xml → https://rafaelferro.dev. Deleted assets absent from dist. Playwright e2e SKIPPED (no dev server in QA env) → deferred to live test after deploy.
- 2026-09-12 Earlier run FAILED on `@fontsource-variable/inter` unresolved import — fixed in `8088a83` (import removed).

- 2026-09-12 DEPLOYER: DEPLOY_FAILED — `CLOUDFLARE_API_TOKEN` unset, wrangler unauthenticated in non-interactive env. Build + dist valid. Live rafaelferro.dev still old template. User chose manual deploy: `npm run build && npx wrangler deploy` locally (env CLOUDFLARE_API_TOKEN=… or `wrangler login`), verify sitemap shows rafaelferro.dev after. Merge via `gh pr merge 13` when confirmed on live.

- 2026-09-12 MERGED: PR #13 merged by user request → main `ae4d54e`; remote+local branch task/console-redesign deleted; main == origin/main. All 9 checklist items DONE. Deploy: manual pending (user decision).
