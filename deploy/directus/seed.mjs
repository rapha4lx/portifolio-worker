#!/usr/bin/env node
/**
 * Seed Directus `projects` from snapshot (idempotent).
 *
 * Idempotency: GET existing keys by pk first, then POST missing / PATCH existing.
 * `sort` = array index; `convergesInto` mapped from references.convergesInto
 * (null when the target id is not part of the seeded set or absent).
 *
 * Env: DIRECTUS_URL, ADMIN_EMAIL, ADMIN_PASSWORD (see deploy/directus/.env.example).
 * Usage:  node deploy/directus/seed.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const BASE_URL = (process.env.DIRECTUS_URL ?? '').replace(/\/+$/, '');
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? '';

if (!BASE_URL || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
	console.error('seed.mjs: missing DIRECTUS_URL / ADMIN_EMAIL / ADMIN_PASSWORD');
	process.exit(1);
}

const SNAPSHOT_PATH = fileURLToPath(new URL('../../snapshot/projects.snapshot.json', import.meta.url));
const snapshot = JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf8'));
const entries = snapshot.projects;
if (!Array.isArray(entries)) {
	console.error('seed.mjs: snapshot missing "projects" array');
	process.exit(1);
}

async function request(path, { method = 'GET', token = '', body } = {}) {
	const res = await fetch(`${BASE_URL}${path}`, {
		method,
		headers: {
			'Content-Type': 'application/json',
			...(token ? { Authorization: `Bearer ${token}` } : {}),
		},
		...(body !== undefined ? { body: JSON.stringify(body) } : {}),
	});

	const text = await res.text();
	let data = null;
	try {
		data = text ? JSON.parse(text) : null;
	} catch {
		data = text;
	}

	if (!res.ok) {
		throw new Error(`seed.mjs: ${method} ${path} -> ${res.status} ${text}`);
	}

	return data;
}

async function main() {
	const login = await request('/auth/login', {
		method: 'POST',
		body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
	});
	const token = login.data.access_token;
	if (!token) throw new Error('seed.mjs: login succeeded but no access_token returned');

	const existing = await request('/items/projects?fields=id&limit=-1', { token });
	const existingIds = new Set((existing.data ?? []).map((row) => row.id));
	const knownIds = new Set(entries.map((entry) => entry.id));

	let created = 0;
	let updated = 0;

	for (const [index, entry] of entries.entries()) {
		const id = entry.id;
		const convergesInto = knownIds.has(entry.references?.convergesInto)
			? entry.references.convergesInto
			: null;

		const payload = {
			name: entry.name,
			type: entry.type,
			start: entry.start,
			completion: entry.completion,
			status: entry.status,
			colorKey: entry.colorKey,
			description: entry.description,
			details: entry.details,
			stack: entry.stack,
			highlights: entry.highlights,
			liveUrl: entry.liveUrl,
			repoUrl: entry.repoUrl,
			image: entry.image,
			convergesInto,
			sort: index,
		};

		if (existingIds.has(id)) {
			await request(`/items/projects/${encodeURIComponent(id)}`, { method: 'PATCH', token, body: payload });
			updated += 1;
			console.log(`updated ${id}`);
		} else {
			await request('/items/projects', { method: 'POST', token, body: { id, ...payload } });
			created += 1;
			console.log(`created ${id}`);
		}
	}

	console.log(`seed complete: ${created} created, ${updated} updated, ${entries.length} total`);
}

main().catch((err) => {
	console.error(err.message);
	process.exit(1);
});