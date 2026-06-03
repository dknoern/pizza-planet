// Swagger UI page served as raw HTML. Lives outside the (storefront) chrome
// so it can run Swagger UI's own scripts cleanly. The OpenAPI document is
// fetched from /api/openapi.json at runtime, so the docs always reflect the
// currently-deployed schema.

const SWAGGER_UI_VERSION = "5.20.0";

const HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Pizza Planet API — Reference</title>
    <link
      rel="stylesheet"
      href="https://unpkg.com/swagger-ui-dist@${SWAGGER_UI_VERSION}/swagger-ui.css"
      crossorigin="anonymous"
    />
    <link rel="icon" href="data:," />
    <style>
      :root {
        --pp-bg: #07061a;
        --pp-fg: #f5f0e8;
        --pp-accent: #f59e3c;
        --pp-glow: rgba(245, 158, 60, 0.18);
        --pp-muted: #7e7aa6;
      }
      html, body { margin: 0; padding: 0; background: var(--pp-bg); }
      body {
        font-family: 'Space Grotesk', system-ui, sans-serif;
        color: var(--pp-fg);
      }
      header.pp-docs-header {
        padding: 24px 40px;
        border-bottom: 1px solid rgba(180, 170, 255, 0.12);
        display: flex;
        align-items: center;
        gap: 16px;
      }
      header.pp-docs-header h1 {
        margin: 0;
        font-size: 22px;
        font-weight: 700;
        letter-spacing: -0.01em;
      }
      header.pp-docs-header .tag {
        font-family: 'Space Mono', monospace;
        font-size: 11px;
        letter-spacing: 0.2em;
        color: var(--pp-muted);
        text-transform: uppercase;
        padding: 4px 10px;
        border-radius: 999px;
        background: rgba(180, 170, 255, 0.08);
        border: 1px solid rgba(180, 170, 255, 0.18);
      }
      header.pp-docs-header a {
        margin-left: auto;
        color: var(--pp-accent);
        font-size: 13px;
        text-decoration: none;
      }
      header.pp-docs-header a:hover { text-decoration: underline; }
      /* Light-card Swagger UI sitting on a dark page reads as a clean inset. */
      #swagger-ui {
        max-width: 1400px;
        margin: 24px auto 64px;
        padding: 0 24px;
      }
      #swagger-ui .swagger-ui {
        background: #fdfaf6;
        border-radius: 14px;
        padding: 16px;
        box-shadow: 0 12px 40px -16px rgba(0, 0, 0, 0.8), 0 0 60px -20px var(--pp-glow);
      }
    </style>
  </head>
  <body>
    <header class="pp-docs-header">
      <h1>Pizza Planet API</h1>
      <span class="tag">v1 / OpenAPI 3.1</span>
      <a href="/menu">← Back to storefront</a>
    </header>
    <div id="swagger-ui"></div>
    <script
      src="https://unpkg.com/swagger-ui-dist@${SWAGGER_UI_VERSION}/swagger-ui-bundle.js"
      crossorigin="anonymous"
    ></script>
    <script>
      window.addEventListener("load", function () {
        window.ui = SwaggerUIBundle({
          url: "/api/openapi.json",
          dom_id: "#swagger-ui",
          deepLinking: true,
          presets: [SwaggerUIBundle.presets.apis],
          layout: "BaseLayout",
          tryItOutEnabled: true,
          persistAuthorization: true,
          defaultModelsExpandDepth: 1,
          docExpansion: "list"
        });
      });
    </script>
  </body>
</html>
`;

export function GET() {
  return new Response(HTML, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=60",
    },
  });
}
