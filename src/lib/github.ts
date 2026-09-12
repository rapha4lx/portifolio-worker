import type { Context } from "hono";

export interface GitHubRepo {
	name: string;
	description: string | null;
	language: string | null;
	stargazers_count: number;
	topics: string[];
	homepage: string | null;
	html_url: string;
	updated_at: string;
	fork: boolean;
	archived: boolean;
}

interface RawRepo {
	name: string;
	description: string | null;
	language: string | null;
	stargazers_count: number;
	topics: string[];
	homepage: string | null;
	html_url: string;
	updated_at: string;
	fork: boolean;
	archived: boolean;
}

const API_URL = "https://api.github.com/users/rapha4lx/repos?per_page=100&sort=updated";
const CACHE_MAX_AGE_MS = 60 * 60 * 1000; // 1 hour

// In-flight dedupe per isolate: shared so concurrent requests collapse into one fetch.
const inflight = new Map<string, Promise<GitHubRepo[]>>();

/**
 * Fetch non-fork, non-archived repos for rapha4lx, newest-updated first.
 * Fresh cache -> serve. Stale cache -> serve stale + revalidate in background.
 * Miss -> fetch, cache, serve. Cache misses all throw -> [] (markdown-only cards).
 * NEVER throws: callers render md-only on any failure.
 */
export async function getRepos(c: Context, ctx: ExecutionContext): Promise<GitHubRepo[]> {
	const cache = caches.default;

	// 1. Cache read — fresh hit or stale-serve + background revalidate.
	let cached: Response | undefined;
	try {
		cached = await cache.match(API_URL);
	} catch {
		cached = undefined; // cache unavailable — fall through to fetch
	}

	if (cached) {
		try {
			const fetchedAtMs = Number(cached.headers.get("x-cache-fetched-at") ?? 0) * 1000;
			const fresh = fetchedAtMs > 0 && Date.now() - fetchedAtMs < CACHE_MAX_AGE_MS;
			if (!fresh) ctx.waitUntil(revalidate(cache, c));
			return (await cached.json()) as GitHubRepo[];
		} catch {
			// Corrupt cached body — treat as miss.
		}
	}

	// 2. Miss (or corrupt cache) — deduped fetch + cache write.
	try {
		const repos = await dedupedFetch(c);
		ctx.waitUntil(writeCache(cache, repos));
		return repos;
	} catch (err) {
		if (err instanceof Error) console.error("[github] fetch failed:", err.message);
		return [];
	}
}

async function dedupedFetch(c: Context): Promise<GitHubRepo[]> {
	const existing = inflight.get(API_URL);
	if (existing) return existing;

	const promise = fetchRepos(c).finally(() => inflight.delete(API_URL));
	inflight.set(API_URL, promise);
	return promise;
}

async function fetchRepos(c: Context): Promise<GitHubRepo[]> {
	const token = (c.env as Record<string, unknown>).GITHUB_TOKEN;
	const ghaToken = typeof token === "string" && token.length > 0 ? token : undefined;
	const res = await fetch(API_URL, {
		headers: {
			"User-Agent": "rafaelferro-worker",
			Accept: "application/vnd.github+json",
			...(ghaToken ? { Authorization: `Bearer ${ghaToken}` } : {}),
		},
	});
	if (!res.ok) throw new Error(`GitHub API ${res.status} ${res.statusText}`);
	const raw = (await res.json()) as RawRepo[];
	return raw
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
			fork: r.fork,
			archived: r.archived,
		}))
		.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

async function writeCache(cache: Cache, repos: GitHubRepo[]): Promise<void> {
	try {
		const body = JSON.stringify(repos);
		const response = new Response(body, {
			headers: {
				"content-type": "application/json; charset=utf-8",
				"cache-control": "public, max-age=3600",
				"x-cache-fetched-at": String(Math.floor(Date.now() / 1000)),
			},
		});
		await cache.put(API_URL, response);
	} catch (err) {
		if (err instanceof Error) console.warn("[github] cache write failed:", err.message);
	}
}

async function revalidate(cache: Cache, c: Context): Promise<void> {
	try {
		const repos = await dedupedFetch(c);
		await writeCache(cache, repos);
	} catch {
		// Background revalidation — swallow; stale already served.
	}
}