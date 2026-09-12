export interface ProjectReference {
	convergesInto: string | null;
}

export interface Project {
	id: string;
	name: string;
	type: string;
	start: { month: string; year: string };
	completion: { month: string; year: string } | null;
	status: 'active' | 'completed';
	colorKey: string;
	description: string;
	details: string;
	stack: string[];
	highlights: string[];
	references: ProjectReference;
	liveUrl: string | null;
	repoUrl: string | null;
	image: string | null;
	sort?: number;
}

export async function getProjects(): Promise<Project[]> {
	const url = import.meta.env.DIRECTUS_URL;
	if (!url) {
		console.warn('[projects] DIRECTUS_URL not set — using snapshot');
		const snapshot = await import('./projects.snapshot.json');
		return snapshot.default.projects as Project[];
	}

	try {
		const res = await fetch(`${url}/items/projects?fields=*,convergesInto.*`);
		if (!res.ok) {
			console.warn(`[projects] Directus fetch failed (${res.status}) — using snapshot`);
			const snapshot = await import('./projects.snapshot.json');
			return snapshot.default.projects as Project[];
		}

		const data = await res.json() as { data: any[] };
		const rows = data.data ?? [];

		const projects: Project[] = rows.map((row: any) => ({
			id: row.id,
			name: row.name,
			type: row.type,
			start: row.start,
			completion: row.completion ?? null,
			status: row.status,
			colorKey: row.colorKey,
			description: row.description,
			details: row.details,
			stack: row.stack ?? [],
			highlights: row.highlights ?? [],
			references: {
				convergesInto: row.convergesInto?.id ?? null,
			},
			liveUrl: row.liveUrl ?? null,
			repoUrl: row.repoUrl ?? null,
			image: row.image ?? null,
		}));

		projects.sort((a, b) => (a.sort ?? 9999) - (b.sort ?? 9999));
		return projects;
	} catch (err) {
		console.warn('[projects] Directus error — using snapshot', err);
		const snapshot = await import('./projects.snapshot.json');
		return snapshot.default.projects as Project[];
	}
}