#!/usr/bin/env node
/**
 * Ensure Directus access control for the `projects` collection (idempotent).
 *
 * - Public policy: built-in Directus 12 public policy (constant UUID) with a
 *   read-only permission on `projects` so the Astro build can fetch
 *   /items/projects without auth. Every create is guarded by a GET first.
 * - Admin: bootstrap already creates the Admin role + admin policy
 *   (admin_access: true -> full CRUD bypass). Script only verifies they exist
 *   and repairs them if a fresh instance ever lacks them.
 *
 * Env: DIRECTUS_URL, ADMIN_EMAIL, ADMIN_PASSWORD.
 * Usage:  node deploy/directus/permissions.mjs
 */

const BASE_URL = (process.env.DIRECTUS_URL ?? '').replace(/\/+$/, '');
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? '';

// Constant id of the built-in public policy (Directus >= 11, see
// api/src/database/migrations/20240806A-permissions-policies.ts).
const PUBLIC_POLICY_ID = 'abf8a154-5b1c-4a46-ac9c-7300570f4f17';

// Directus 12 Core tier rejects anything but a plain `*` fields read
// (403 custom_permission_rules_enabled) — field-level scoping needs a license.
const PUBLIC_READ_FIELDS = ['*'];

if (!BASE_URL || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
	console.error('permissions.mjs: missing DIRECTUS_URL / ADMIN_EMAIL / ADMIN_PASSWORD');
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
		throw new Error(`permissions.mjs: ${method} ${path} -> ${res.status} ${text}`);
	}

	return data;
}

async function findPolicy(token, { id = null, match } = {}) {
	const res = await request('/policies?limit=-1', { token });
	for (const policy of res.data ?? []) {
		if (id && String(policy.id) === String(id)) return policy;
		if (match && match(policy)) return policy;
	}
	return null;
}

async function ensurePublicPolicy(token) {
	let policy = await findPolicy(token, { id: PUBLIC_POLICY_ID });
	if (!policy) {
		policy = await findPolicy(token, { match: (p) => p.name === 'Public' || p.name === '$t:public_label' });
	}
	if (!policy) {
		const res = await request('/policies', {
			method: 'POST',
			token,
			body: { name: 'Public', icon: 'public', app_access: false, admin_access: false },
		});
		policy = res.data;
		console.log(`permissions.mjs: created public policy ${policy.id}`);
	} else {
		console.log(`permissions.mjs: public policy present (${policy.id})`);
	}

	return policy.id;
}

async function ensurePublicReadPermission(token, policyId) {
	const res = await request(
		`/permissions?limit=-1&filter[policy][_eq]=${encodeURIComponent(policyId)}&filter[collection][_eq]=projects`,
		{ token },
	);
	const existing = (res.data ?? []).find((row) => row.action === 'read');

	if (existing) {
		console.log(`permissions.mjs: public read permission present (id ${existing.id})`);
		return;
	}

	// NOTE: `fields: ['*']` is required on Directus 12 Core — narrower field
	// lists / permission rules are a restricted (licensed) resource and 403.
	await request('/permissions', {
		method: 'POST',
		token,
		body: {
			policy: policyId,
			collection: 'projects',
			action: 'read',
			fields: PUBLIC_READ_FIELDS,
		},
	});
	console.log('permissions.mjs: created public read permission on projects');
}

async function ensureAdminRole(token) {
	// v12 directus_roles only carries id/name/icon/description/parent —
	// admin access lives in the admin policy (app_access + admin_access).
	const res = await request('/roles?limit=-1', { token });
	if (res.data?.length) {
		console.log(`permissions.mjs: roles present (${res.data.length}) — admin role assumed`);
		return;
	}

	await request('/roles', { method: 'POST', token, body: { name: 'Admin', icon: 'supervised_user_circle' } });
	console.log('permissions.mjs: created admin role');
}

async function ensureAdminPolicy(token) {
	let policy = await findPolicy(token, { match: (p) => p.admin_access === true && p.app_access === true });
	if (policy) {
		console.log(`permissions.mjs: admin policy present (${policy.id})`);
		return;
	}

	policy = await findPolicy(token, { match: (p) => p.name === 'Admin Policy' || p.name === '$t:admin_policy_name' });
	if (policy) {
		await request(`/policies/${policy.id}`, {
			method: 'PATCH',
			token,
			body: { app_access: true, admin_access: true },
		});
		console.log(`permissions.mjs: upgraded policy ${policy.id} to admin access`);
		return;
	}

	const res = await request('/policies', {
		method: 'POST',
		token,
		body: { name: 'Admin Policy', icon: 'supervised_user_circle', app_access: true, admin_access: true },
	});
	console.log(`permissions.mjs: created admin policy (${res.data.id})`);
}

async function main() {
	const login = await request('/auth/login', {
		method: 'POST',
		body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
	});
	const token = login.data.access_token;
	if (!token) throw new Error('permissions.mjs: login succeeded but no access_token returned');

	const publicPolicyId = await ensurePublicPolicy(token);
	await ensurePublicReadPermission(token, publicPolicyId);
	await ensureAdminRole(token);
	await ensureAdminPolicy(token);

	console.log('permissions done: public = read-only on projects, admin = full CRUD');
}

main().catch((err) => {
	console.error(err.message);
	process.exit(1);
});