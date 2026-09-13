import { Hono } from "hono";
import { renderer } from "./renderer";
import { getRepos } from "./lib/github";
import projectsData from "./generated/projects.json";

interface GitHubInfo {
	name: string;
	repoUrl: string;
}

interface ProjectBase {
	slug: string;
	title: string;
	repo: string;
	blurb: string;
	order: number;
	html: string;
	github: GitHubInfo | null;
}

interface Project extends ProjectBase {
	language?: string | null;
	visible?: boolean;
}

function getProjects(): Project[] {
	return (projectsData as ProjectBase[]).map(p => ({ ...p, visible: true }));
}

interface Env {
	ASSETS: Fetcher;
}

const app = new Hono<{ Bindings: Env }>();

app.use(renderer);

async function fetchRepoLanguages(c: any, ctx: ExecutionContext) {
	const repos = await getRepos(c, ctx);
	const langCounts = new Map<string, number>();
	for (const r of repos) {
		if (r.language) {
			langCounts.set(r.language, (langCounts.get(r.language) || 0) + 1);
		}
	}
	return Array.from(langCounts.entries()).sort((a, b) => b[1] - a[1]);
}

function languageColor(lang: string) {
	const colors: Record<string, string> = {
		"C": "#555555",
		"C++": "#f34b7d",
		"C#": "#178600",
		"Go": "#00ADD8",
		"JavaScript": "#f1e05a",
		"TypeScript": "#2b7489",
		"Python": "#3572A5",
		"Rust": "#dea584",
		"Java": "#b07219",
		"Ruby": "#701516",
		"PHP": "#4F5D95",
		"Shell": "#89e051",
		"HTML": "#e34c26",
		"CSS": "#563d7c",
		"Dockerfile": "#384d54",
		"Makefile": "#427819",
		"Vue": "#42b883",
		"React": "#61dafb",
		"Swift": "#fa7343",
		"Kotlin": "#A97BFF",
		"Dart": "#00B4AB",
		"Lua": "#000080",
		"Haskell": "#5e5086",
		"Elixir": "#6e4a7e",
		"Erlang": "#B83998",
		"Clojure": "#db5855",
		"Scala": "#c22d40",
		"R": "#198ce7",
		"Julia": "#a270ba",
		"Perl": "#0298c3",
		"PowerShell": "#012456",
		"SQL": "#e38c00",
	};
	return colors[lang] || "#71717A";
}

function escapeXml(str: string) {
	return str
		.replace(/&/g, "&")
		.replace(/</g, "<")
		.replace(/>/g, ">")
		.replace(/"/g, "\"")
		.replace(/'/g, "&apos;");
}

function absoluteUrl(path: string) {
	return `https://rafaelferro.dev${path}`;
}

// ============ HOME ============
app.get("/", async (c) => {
	const projects = getProjects().filter(p => p.visible !== false);
	const [langs, repos] = await Promise.all([
		fetchRepoLanguages(c, c.executionCtx),
		getRepos(c, c.executionCtx),
	]);
	
	const langMap = new Map(repos.map(r => [r.name.toLowerCase(), r.language]));
	const projectsWithLang = projects.map(p => ({
		...p,
		language: langMap.get(p.repo.toLowerCase()) || null,
	}));

	const currentLang = c.req.query("lang") || "";
	const filteredProjects = currentLang
		? projectsWithLang.filter(p => p.language?.toLowerCase() === currentLang.toLowerCase())
		: projectsWithLang;

	c.set("meta", {
		title: "Rafael Ferro — Backend & Full-stack Engineer",
		description: "42 Rio grad building reliable systems in C, Python, TypeScript. Game servers, DNS automation, MCP servers, and whatever breaks next.",
		path: "/",
		jsonLd: {
			"@context": "https://schema.org",
			"@type": "Person",
			"name": "Rafael Ferro",
			"url": "https://rafaelferro.dev",
			"sameAs": ["https://github.com/rapha4lx"],
			"jobTitle": "Backend & Full-stack Engineer",
			"knowsAbout": ["C", "Python", "TypeScript", "Go", "Rust", "PostgreSQL", "Redis", "Docker", "Cloudflare Workers", "Game Servers", "Reverse Engineering"],
		},
	});

	return c.render(
		<>
			<section class="hero" aria-labelledby="hero-title">
				<span class="eyebrow">Backend & Full-stack Engineer</span>
				<h1 id="hero-title">Rafael Ferro</h1>
				<p class="role">Building reliable systems — from shells to distributed infra</p>
				<p class="tagline">42 Rio grad. C, Python, TypeScript. Game servers, DNS automation, MCP servers, and whatever breaks next.</p>
				
				<div class="lang-pills" aria-label="Filter projects by language">
					<a href="/" class={`lang-pill${currentLang === "" ? " active" : ""}`}>
						All <span>({projectsWithLang.length})</span>
					</a>
					{langs.map(([lang, count]) => (
						<a
							key={lang}
							href={`/?lang=${encodeURIComponent(lang)}`}
							class={`lang-pill${currentLang.toLowerCase() === lang.toLowerCase() ? " active" : ""}`}
						>
							<span class="lang-dot" style={{ background: languageColor(lang) }} aria-hidden="true"></span>
							{lang} <span>({count})</span>
						</a>
					))}
				</div>
			</section>

			<section aria-labelledby="projects-heading">
				<h2 id="projects-heading" style={{ position: "absolute", width: "1px", height: "1px", padding: 0, margin: "-1px", overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap", border: 0 }}>Projects</h2>
				{filteredProjects.length > 0 ? (
					<div class="project-grid">
						{filteredProjects.map((p) => (
							<a key={p.slug} href={`/projects/${p.slug}`} class="project-card">
								<div class="project-card-header">
									<h3 class="project-title">{p.title}</h3>
									{p.language && (
										<span class="lang-pill" style={{ background: languageColor(p.language), borderColor: languageColor(p.language), color: "white" }} aria-label={p.language}>
											<span class="lang-dot" style={{ background: "white" }} aria-hidden="true"></span>
											{p.language}
										</span>
									)}
								</div>
								<p class="project-blurb">{p.blurb}</p>
							</a>
						))}
					</div>
				) : (
					<div class="empty-state">
						<p>No projects found for this language.</p>
					</div>
				)}
			</section>
		</>
	);
});

// ============ PROJECTS INDEX ============
app.get("/projects", async (c) => {
	const projects = getProjects().filter(p => p.visible !== false);
	const [langs, repos] = await Promise.all([
		fetchRepoLanguages(c, c.executionCtx),
		getRepos(c, c.executionCtx),
	]);
	
	const langMap = new Map(repos.map(r => [r.name.toLowerCase(), r.language]));
	const projectsWithLang = projects.map(p => ({
		...p,
		language: langMap.get(p.repo.toLowerCase()) || null,
	}));

	const currentLang = c.req.query("lang") || "";
	const filteredProjects = currentLang
		? projectsWithLang.filter(p => p.language?.toLowerCase() === currentLang.toLowerCase())
		: projectsWithLang;

	c.set("meta", {
		title: "Projects — Rafael Ferro",
		description: "Selected projects: minishell, Cloudflare DDNS, SessionDB MCP, BayHub. Filter by language.",
		path: "/projects",
	});

	return c.render(
		<>
			<nav class="breadcrumb" aria-label="Breadcrumb">
				<a href="/">Home</a>
				<span class="breadcrumb-separator" aria-hidden="true">/</span>
				<span class="breadcrumb-current">Projects</span>
			</nav>
			
			<div class="lang-pills" aria-label="Filter projects by language">
				<a href="/projects" class={`lang-pill${currentLang === "" ? " active" : ""}`}>
					All <span>({projectsWithLang.length})</span>
				</a>
				{langs.map(([lang, count]) => (
					<a
						key={lang}
						href={`/projects?lang=${encodeURIComponent(lang)}`}
						class={`lang-pill${currentLang.toLowerCase() === lang.toLowerCase() ? " active" : ""}`}
					>
						<span class="lang-dot" style={{ background: languageColor(lang) }} aria-hidden="true"></span>
						{lang} <span>({count})</span>
					</a>
				))}
			</div>

			{filteredProjects.length > 0 ? (
				<div class="project-grid">
					{filteredProjects.map((p) => (
						<a key={p.slug} href={`/projects/${p.slug}`} class="project-card">
							<div class="project-card-header">
								<h3 class="project-title">{p.title}</h3>
								{p.language && (
									<span class="lang-pill" style={{ background: languageColor(p.language), borderColor: languageColor(p.language), color: "white" }} aria-label={p.language}>
										<span class="lang-dot" style={{ background: "white" }} aria-hidden="true"></span>
										{p.language}
									</span>
								)}
							</div>
							<p class="project-blurb">{p.blurb}</p>
						</a>
					))}
				</div>
			) : (
				<div class="empty-state">
					<p>No projects found for this language.</p>
				</div>
			)}
		</>
	);
});

app.get("/projects/", (c) => c.redirect("/projects", 301));

// ============ PROJECT DETAIL ============
app.get("/projects/:slug", async (c) => {
	const slug = c.req.param("slug");
	const projects = getProjects();
	const project = projects.find(p => p.slug === slug);
	
	if (!project) {
		c.set("meta", {
			title: "404 — Not Found",
			description: "Project not found.",
			path: `/projects/${slug}`,
		});
		c.status(404);
		return c.render(
			<div class="not-found">
				<h1>404</h1>
				<p>Project not found.</p>
				<p><a href="/projects">← Back to projects</a></p>
			</div>
		);
	}

	const repos = await getRepos(c, c.executionCtx);
	const gh = repos.find(r => r.name.toLowerCase() === project.repo.toLowerCase());

	c.set("meta", {
		title: `${project.title} — Rafael Ferro`,
		description: project.blurb || `Project: ${project.title}`,
		path: `/projects/${slug}`,
	});

	return c.render(
		<>
			<nav class="breadcrumb" aria-label="Breadcrumb">
				<a href="/">Home</a>
				<span class="breadcrumb-separator" aria-hidden="true">/</span>
				<a href="/projects">Projects</a>
				<span class="breadcrumb-separator" aria-hidden="true">/</span>
				<span class="breadcrumb-current">{project.title}</span>
			</nav>

			<article class="project-detail">
				<header>
					<h1 style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "clamp(2rem, 4vw, 2.5rem)", marginBottom: "var(--space-3)", lineHeight: 1.2 }}>{project.title}</h1>
					<div class="project-meta">
						{project.language && (
							<span class="meta-item">
								<span class="lang-dot" style={{ background: languageColor(project.language) }} aria-hidden="true"></span>
								{project.language}
							</span>
						)}
						{gh && (
							<>
								<span class="meta-separator" aria-hidden="true">•</span>
								<span class="meta-item">⭐ {gh.stargazers_count}</span>
								<span class="meta-separator" aria-hidden="true">•</span>
								<span class="meta-item">Updated {new Date(gh.updated_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</span>
								{gh.homepage && (
									<>
										<span class="meta-separator" aria-hidden="true">•</span>
										<span class="meta-item"><a href={gh.homepage} target="_blank" rel="noopener">Homepage</a></span>
									</>
								)}
								<span class="meta-separator" aria-hidden="true">•</span>
								<span class="meta-item"><a href={gh.html_url} target="_blank" rel="noopener">Repository</a></span>
							</>
						)}
					</div>
				</header>
				
				<div class="project-content" dangerouslySetInnerHTML={{ __html: project.html }} />
				
				<a href={`https://github.com/rapha4lx/portifolio-worker/blob/main/src/projects/${slug}.md`} target="_blank" rel="noopener" class="edit-link">
					✎ Edit this page
				</a>
				<a href="/projects" class="back-link">← Back to projects</a>
			</article>
		</>
	);
});

// ============ ABOUT ============
app.get("/about", (c) => {
	c.set("meta", {
		title: "About — Rafael Ferro",
		description: "42 Rio grad. C, Python, TypeScript. Game servers, DNS automation, MCP servers, distributed systems.",
		path: "/about",
	});

	return c.render(
		<>
			<nav class="breadcrumb" aria-label="Breadcrumb">
				<a href="/">Home</a>
				<span class="breadcrumb-separator" aria-hidden="true">/</span>
				<span class="breadcrumb-current">About</span>
			</nav>

			<article class="about-content">
				<h1 style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "clamp(2rem, 4vw, 2.5rem)", marginBottom: "var(--space-5)", lineHeight: 1.2 }}>About</h1>
				
				<p>42 Rio graduate. Started with C systems programming — libft, minishell, raycasting engines, thread synchronization. Moved up the stack: Python automation, TypeScript full-stack, distributed systems on Cloudflare Workers.</p>
				<p>Trajectory: game server tooling (Rust/Oxide plugins, Discord bots, economy systems) → infrastructure (Docker Compose stacks, Nginx TCP proxy, PostgreSQL, RabbitMQ, CI/CD) → developer tooling (MCP servers, DDNS clients, session-scoped DB access for AI agents).</p>
				<p>Currently: building reliable backends, APIs, and the occasional weird side project. Open to interesting problems in systems, infra, or developer experience.</p>

				<h2>Skills</h2>
				<div class="skills" aria-label="Technical skills">
					{[
						"C", "Python", "JavaScript", "TypeScript", "Go", "Rust",
						"APIs", "Integrations", "Databases", "PostgreSQL", "Redis", "SQLite",
						"Automations", "AI Agents", "MCP", "Game Servers", "Oxide/uMod",
						"Reverse Engineering", "Docker", "Docker Compose", "Nginx",
						"Cloudflare Workers", "GitHub Actions", "Linux", "POSIX"
					].map(skill => (
						<span key={skill} class="skill-chip">{skill}</span>
					))}
				</div>
			</article>
		</>
	);
});

// ============ SITEMAP ============
app.get("/sitemap.xml", (c) => {
	const projects = getProjects().filter(p => p.visible !== false);
	const urls = [
		{ url: "/", changefreq: "weekly", priority: 1.0 },
		{ url: "/about", changefreq: "monthly", priority: 0.8 },
		{ url: "/projects", changefreq: "weekly", priority: 0.9 },
		...projects.map(p => ({
			url: `/projects/${p.slug}`,
			changefreq: "monthly",
			priority: 0.7,
		})),
	];

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${escapeXml(absoluteUrl(u.url))}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join("\n")}
</urlset>`;

	return c.body(xml, 200, { "Content-Type": "application/xml; charset=utf-8" });
});

// ============ ROBOTS ============
app.get("/robots.txt", (c) => {
	const txt = `User-agent: *
Allow: /

Sitemap: https://rafaelferro.dev/sitemap.xml`;
	return c.body(txt, 200, { "Content-Type": "text/plain; charset=utf-8" });
});

// ============ LEGACY REDIRECTS ============
app.get("/index.html", (c) => c.redirect("/", 301));

// ============ ASSETS PASSTHROUGH ============
const assetPaths = ["/favicon.svg", "/global.css", "/profile-photo.svg", "/og-cover.svg"];

for (const path of assetPaths) {
	app.get(path, async (c) => {
		const res = await c.env.ASSETS.fetch(c.req.raw);
		if (res.status === 404) {
			c.set("meta", {
				title: "404 — Not Found",
				description: "Asset not found.",
				path,
			});
			c.status(404);
			return c.render(
				<div class="not-found">
					<h1>404</h1>
					<p>Asset not found.</p>
					<p><a href="/">← Home</a></p>
				</div>
			);
		}
		return res;
	});
}

// Catch-all for other static assets
app.all("*", async (c) => {
	const res = await c.env.ASSETS.fetch(c.req.raw);
	if (res.status === 404) {
		c.set("meta", {
			title: "404 — Not Found",
			description: "Page not found.",
			path: c.req.path,
		});
		c.status(404);
		return c.render(
			<div class="not-found">
				<h1>404</h1>
				<p>Page not found.</p>
				<p><a href="/">← Home</a></p>
			</div>
		);
	}
	return res;
});

export default app;