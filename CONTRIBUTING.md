# Contributing to Northstar

Northstar is a small independent software product. Changes should be narrowly scoped, verifiable, and safe across the **separate** Cloudflare Pages Production and Preview environments.

## Before opening a PR

1. Read [README](README.md) and [engineering docs](docs/README.md) to identify the target stack. Active Pages Functions live in `web/functions`; the .NET/PostgreSQL code under `src/` is a separate track.
2. Use a feature branch. State whether the change affects the public storefront, staging infrastructure, production settings, D1 schema, or only documentation.
3. For JavaScript/Angular changes, run `npm ci`, `npm run typecheck:functions`, `npm test`, and `npm run build -- --configuration production` from `web/`. CI also runs .NET, D1, PostgreSQL, and Playwright checks.
4. Review the PR's workflow triggers: **`web/**` changes on `main` trigger the production storefront deployment** as well as staging. Do not merge a staging-only fix to main without considering that consequence.
5. Include before/after behavior, automated coverage, deployment blast radius, rollback, and redacted GitHub Actions run links. Distinguish a build pass from end-to-end service verification.

## Sensitive and destructive changes

- Never commit provider tokens, Access JWTs, customer data, D1 exports, webhook secrets, or local `.dev.vars`/`.env` files.
- Use staging D1 for synthetic writes. Do not run synthetic/Playwright payment tests against Production.
- Production D1 migrations require an explicit protected workflow, review, a verified backup, and independent approval. Never change Production D1 bindings in a documentation or staging PR.
- Stripe is **TEST only**. Turning on live charges, altering real domain DNS, billing upgrades, or deleting data require separate explicit authorization.
- Avoid checking in generated `staging-report`, `acceptance-report`, JUnit XML, or other local Playwright outputs. Upload CI reports as short-retention artifacts instead.
- Keep active release/acceptance PRs open while their acceptance gates are outstanding. Close superseded/no-change PRs only after validating their changes are already present or irrelevant.

## PR description checklist

- [ ] Target stack and environment stated
- [ ] Tests and exact CI evidence attached
- [ ] Production effect evaluated; if any, approved and rollback documented
- [ ] D1 and credential separation maintained
- [ ] README/docs updated if behavior, setup, or release status changed
