// build-projects.mjs
// Read src/projects/*.md (frontmatter + markdown body), render body to HTML with
// `marked`, reconcile best-effort against the GitHub repo list (or the committed
// snapshot fallback), and emit a deterministic src/generated/projects.json.
//
// Rules:
// - MUST NOT fail on network errors — warn + md-only (or snapshot fallback).
// - Exit 0 always, unless a markdown file fails to parse.
// - Deterministic output: sorted by (order ?? 9999) then name.

import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROJECTS_DIR = path.join(ROOT, "src", "projects");
const GENERATED_DIR = path.join(ROOT, "src", "generated");
const OUTPUT = path.join(GENERATED_DIR, "projects.json");
const SNAPSHOT = path.join(ROOT, "snapshot", "projects.snapshot.json");

const GITHUB_API = "https://api.github.com/users/rapha4lx/repos?per_page=100&sort=updated";

function parseFrontmatter(raw) {
	const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
	if (!match) {
		throw new Error(`missing frontmatter (expected leading --- block)`);
	}
	const [, fm, body] = match;
	const meta = {};
	for (const line of fm.split(/\r?\n/)) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;
		const idx = trimmed.indexOf(":");
		if (idx === -1) continue;
		const key = trimmed.slice(0, idx).trim();
		let value = trimmed.slice(idx + 1).trim();
		if (/^"(.*)"$/.test(value) || /^'(.*)'$/.test(value)) {
			value = value.slice(1, -1);
		} else if (value === "true" || value === "false") {
			value = value === "true";
		} else if (/^-?\d+(\.\d+)?$/.test(value)) {
			value = Number(value);
		}
		meta[key] = value;
	}
	return { meta, body: body.trim() };
}

async function readMarkdownProjects() {
	let files;
	try {
		files = (await readdir(PROJECTS_DIR)).filter((f) => f.endsWith(".md"));
	} catch (err) {
		if (err.code === "ENOENT") {
			await mkdir(PROJECTS_DIR, { recursive: true });
			files = [];
		} else {
			throw err;
		}
	}

	const projects = [];
	for (const file of files.sort()) {
		const raw = await readFile(path.join(PROJECTS_DIR, file), "utf8");
		const { meta, body } = parseFrontmatter(raw);
		if (!meta.slug || !meta.title || !meta.repo) {
			throw new Error(`[build-projects] ${file}: frontmatter needs slug, title, repo`);
		}
		const html = marked.parse(body);
		projects.push({
			slug: String(meta.slug),
			title: String(meta.title),
			repo: String(meta.repo),
			visible: meta.visible === false ? false : true,
			blurb: meta.blurb != null ? String(meta.blurb) : "",
			order: meta.order != null ? Number(meta.order) : 9999,
			html: typeof html === "string" ? html : String(html),
		});
	}
	return projects;
}

async function fetchGitHubRepos() {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), 2000);
	try {
		const res = await fetch(GITHUB_API, {
			headers: { "User-Agent": "portfolio-build", Accept: "application/vnd.github+json" },
			signal: controller.signal,
		});
		if (!res.ok) throw new Error(`GitHub API ${res.status}`);
		const raw = await res.json();
		const repos = Array.isArray(raw) ? raw : [];
		return repos
			.filter((r) => !r.fork && !r.archived)
			.map((r) => ({
				name: r.name,
				description: r.description,
				language: r.language,
				stargazers_count: r.stargazers_count,
				topics: r.topics ?? [],
				homepage: r.homepage,
				html_url: r.html_url,
				updated_at: r.updated_at,
			}));
	} catch (err) {
		console.warn(
			`[build-projects] GitHub fetch failed (${err instanceof Error ? err.message : err}) — trying snapshot fallback`
		);
		return loadSnapshotRepos();
	} finally {
		clearTimeout(timer);
	}
}

async function loadSnapshotRepos() {
	try {
		const raw = JSON.parse(await readFile(SNAPSHOT, "utf8"));
		const entries = Array.isArray(raw) ? raw : raw.projects;
		if (!Array.isArray(entries)) throw new Error("snapshot has no projects array");
		return entries
			.filter((p) => p && p.repoUrl)
			.map((p) => ({ name: p.repoUrl.split("/").pop(), repoUrl: p.repoUrl }));
	} catch (err) {
		if (err.code !== "ENOENT") {
			console.warn(`[build-projects] snapshot fallback unusable: ${err.message}`);
		}
		return [];
	}
}

function reconcile(projects, ghRepos) {
	const byName = new Map(ghRepos.map((r) => [r.name.toLowerCase(), r]));
	const output = [];

	for (const p of projects) {
		if (p.visible === false) continue;
		const gh = byName.get(p.repo.toLowerCase());
		if (!gh) {
			console.warn(`[build-projects] markdown repo missing from GitHub/snapshot: ${p.repo}`);
		}
		output.push({
			slug: p.slug,
			title: p.title,
			repo: p.repo,
			blurb: p.blurb,
			order: p.order,
			html: p.html,
			github: gh ?? null,
		});
	}

	output.sort(
		(a, b) => (Number(a.order) || 9999) - (Number(b.order) || 9999) || a.title.localeCompare(b.title) || 0
	);
	return output;
}

async function main() {
	const projects = await readMarkdownProjects();
	const ghRepos = await fetchGitHubRepos();
	const output = reconcile(projects, ghRepos);

	await mkdir(GENERATED_DIR, { recursive: true });
	await writeFile(OUTPUT, `${JSON.stringify(output, null, 2)}\n`, "utf8");
	console.log(`[build-projects] wrote ${OUTPUT} (${output.length} projects from ${projects.length} markdown files)`);
}

main().catch((err) => {
	console.error(`[build-projects] failed: ${err.message}`);
	process.exit(1);
});