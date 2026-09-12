import { jsxRenderer } from "hono/jsx-renderer";

// Placeholder layout — frontend replaces with full meta/OG/fonts/footer shell.
export const renderer = jsxRenderer(({ children }) => (
	<html lang="en">
		<head>
			<meta charset="utf-8" />
			<meta name="viewport" content="width=device-width, initial-scale=1" />
			<title>Rafael Ferro</title>
		</head>
		<body>{children}</body>
	</html>
));