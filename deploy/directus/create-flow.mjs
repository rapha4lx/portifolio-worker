#!/usr/bin/env node
/**
 * Create the Directus manual Flow "Publish" (idempotent).
 *
 * The Flow exposes a "Run" button in the admin app that dispatches
 * .github/workflows/publish.yml on GitHub (workflow_dispatch) via the webhook
 * request operation. The GitHub token is read from GITHUB_WORKFLOW_TOKEN at
 * creation time (compose .env) and baked into the operation headers.
 *
 * Env: DIRECTUS_URL, ADMIN_EMAIL, ADMIN_PASSWORD, GITHUB_WORKFLOW_TOKEN.
 * Usage:  node deploy/directus/create-flow.mjs
 */

const BASE_URL = (process.env.DIRECTUS_URL ?? '').replace(/\/+$/, '');
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? '';
const GITHUB_WORKFLOW_TOKEN = process.env.GITHUB_WORKFLOW_TOKEN ?? '';

const FLOW_NAME = 'Publish';
const DISPATCH_URL =
	'https://api.github.com/repos/rapha4lx/portifolio-worker/actions/workflows/publish.yml/dispatches';

if (!BASE_URL || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
	console.error('create-flow.mjs: missing DIRECTUS_URL / ADMIN_EMAIL / ADMIN_PASSWORD');
	process.exit(1);
}
if (!GITHUB_WORKFLOW_TOKEN) {
	console.error(
		'create-flow.mjs: GITHUB_WORKFLOW_TOKEN not set — refusing to create a Publish flow without a working token',
	);
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
		throw new Error(`create-flow.mjs: ${method} ${path} -> ${res.status} ${text}`);
	}

	return data;
}

async function main() {
	const login = await request('/auth/login', {
		method: 'POST',
		body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
	});
	const token = login.data.access_token;
	if (!token) throw new Error('create-flow.mjs: login succeeded but no access_token returned');

	const existing = await request(`/flows?limit=-1&filter[name][_eq]=${encodeURIComponent(FLOW_NAME)}`, { token });
	if (existing.data?.length) {
		console.log(`create-flow.mjs: flow "${FLOW_NAME}" already exists (id ${existing.data[0].id}) — skipped`);
		return;
	}

	await request('/flows', {
		method: 'POST',
		token,
		body: {
			name: FLOW_NAME,
			icon: 'rocket_launch',
			trigger: 'manual',
			status: 'active',
			operations: [
				{
					key: 'dispatch_publish',
					name: 'Dispatch GitHub Actions publish workflow',
					type: 'request',
					position_x: 100,
					position_y: 100,
					options: {
						method: 'POST',
						url: DISPATCH_URL,
						headers: [
							{ header: 'Accept', value: 'application/vnd.github+json' },
							{ header: 'X-GitHub-Api-Version', value: '2022-11-28' },
							{ header: 'Authorization', value: `Bearer ${GITHUB_WORKFLOW_TOKEN}` },
						],
						body: JSON.stringify({ ref: 'main' }),
					},
				},
			],
		},
	});

	console.log(`create-flow.mjs: flow "${FLOW_NAME}" created (manual trigger -> ${DISPATCH_URL})`);
}

main().catch((err) => {
	console.error(err.message);
	process.exit(1);
});