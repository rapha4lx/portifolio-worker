import { Hono } from "hono";
import { renderer } from "./renderer";

// Placeholder — frontend replaces with full route set (home, projects, detail, about, sitemap, robots, ASSETS passthrough, 404).
const app = new Hono<{ Bindings: Env }>();

app.use(renderer);

app.get("/", (c) =>
	c.render(
		<main>
			<h1>Hono worker scaffold</h1>
			<p>Frontend routes land here.</p>
		</main>
	)
);

export default app;