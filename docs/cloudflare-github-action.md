# Automated Cloudflare Pages deployment

This workflow builds the Angular frontend and deploys it to Cloudflare Pages after pushes to `main` affecting `web/**`. It can also be started manually from **Actions → Deploy storefront to Cloudflare Pages → Run workflow**.

## Required GitHub Actions secrets
Configure at **Repository → Settings → Secrets and variables → Actions**:

- `CLOUDFLARE_API_TOKEN`: Cloudflare API token with **Account → Cloudflare Pages → Edit** permission scoped to your account.
- `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare account ID (shown in the dashboard).

The workflow deploys to an **existing** Cloudflare Pages project named `northstar-software-studio`. If your project has another name, edit the `--project-name` argument.

The repository currently has no committed npm lockfile; the workflow uses `npm install` until one is committed. Once a lockfile is committed, use `npm ci` for reproducible installs.

## Avoid duplicate deploys
If the Pages project is also connected to GitHub for automatic builds, disable its built-in automatic deployments when using this GitHub Action; otherwise both systems may deploy the same commit.

## Scope
This publishes only the Angular frontend. The ASP.NET Core API and PostgreSQL database are **not** deployed. API-backed catalog/intake and checkout cannot function until the backend is hosted and routed. Do not enable live Stripe payments.
