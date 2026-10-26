# Cloudflare Pages API proxy

The Angular storefront uses same-origin `/api/*` requests. The Pages Function at `functions/api/[[path]].ts` forwards those requests to the independently deployed .NET API.

## Setup

- Deploy the .NET API and PostgreSQL first; run migrations and seed the catalog (see `docs/production-catalog-seeding.md`).
- Set `API_ORIGIN` in **Cloudflare Pages → northstar-software-studio → Settings → Variables and Secrets** to the HTTPS origin of your API, for example `https://your-api-host.example/`. Do not include `/api` in this value.
- The GitHub Actions deploy must include the repository-root `functions` directory so Pages publishes the Function with the Angular static assets.
- Verify `https://northstar-software-studio.pages.dev/api/instant-fixes` returns the seeded catalog JSON; verify detail pages and then intake before enabling any payment workflow.

## Security and behavior

The proxy refuses non-HTTPS or malformed origins and returns JSON 503 when unconfigured. It removes client-supplied forwarding/auth/cookie headers and never follows upstream redirects. API exceptions become JSON 502. Keep the API host secured and rate limited; this proxy is not authentication.

## Local development

Angular's `web/proxy.conf.json` continues to route local `/api` to `http://localhost:5080`. Production does not use the Angular dev proxy.
