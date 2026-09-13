import type { MiddlewareHandler } from "hono";

interface MetaProps {
	title: string;
	description: string;
	path: string;
	jsonLd?: object;
}

declare module "hono" {
	interface ContextVariableMap {
		meta: MetaProps;
	}
}

function absoluteUrl(path: string) {
	return `https://rafaelferro.dev${path}`;
}

function jsonLdScript(data: object) {
	return (
		<script
			type="application/ld+json"
			dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
		/>
	);
}

export const renderer: MiddlewareHandler = async (c, next) => {
	c.setRenderer((content: string | Promise<string>) => {
		const meta = c.get("meta") || { title: "Rafael Ferro", description: "", path: "/", jsonLd: undefined };
		return c.html(
			<html lang="en">
				<head>
					<meta charset="utf-8" />
					<meta name="viewport" content="width=device-width, initial-scale=1" />
					<title>{meta.title}</title>
					<meta name="description" content={meta.description} />
					<link rel="canonical" href={absoluteUrl(meta.path)} />
					<meta property="og:title" content={meta.title} />
					<meta property="og:description" content={meta.description} />
					<meta property="og:url" content={absoluteUrl(meta.path)} />
					<meta property="og:type" content="website" />
					<meta property="og:image" content="https://rafaelferro.dev/og-cover.svg" />
					<meta name="twitter:card" content="summary_large_image" />
					<meta name="twitter:title" content={meta.title} />
					<meta name="twitter:description" content={meta.description} />
					<meta name="twitter:image" content="https://rafaelferro.dev/og-cover.svg" />
					<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
					<link rel="preconnect" href="https://fonts.googleapis.com" />
					<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
					<link
						href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Archivo:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
						rel="stylesheet"
					/>
					<link rel="stylesheet" href="/global.css" />
					{meta.jsonLd && jsonLdScript(meta.jsonLd)}
				</head>
				<body>
					<a href="#main" class="skip-link">Skip to main content</a>
					<header class="site-header">
						<div class="container header-inner">
							<a href="/" class="site-name" aria-label="Rafael Ferro — Home">Rafael Ferro</a>
							<nav class="site-nav" aria-label="Main navigation">
								<a href="/">Home</a>
								<a href="/projects">Projects</a>
								<a href="/about">About</a>
							</nav>
						</div>
					</header>
					<main id="main" class="container">{content}</main>
					<footer class="site-footer">
						<div class="container footer-inner">
							<p>
								<a href="mailto:hi@rafaelferro.dev">hi@rafaelferro.dev</a> ·
								<a href="https://github.com/rapha4lx" target="_blank" rel="noopener">GitHub</a> ·
								© {new Date().getFullYear()} Rafael Ferro
							</p>
						</div>
					</footer>
				</body>
			</html>
		);
	});
	await next();
};