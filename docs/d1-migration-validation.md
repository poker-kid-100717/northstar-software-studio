# D1 migration validation

**Validate D1 migrations** runs on pull requests and pushes to main. It applies all SQL migrations in an isolated in-memory SQLite database, verifies naming order and integrity, upgrades from every existing migration prefix with synthetic inquiry/note/quote data, verifies preservation, and tests drift detection. It needs no credentials and never connects to production. SQLite coverage is D1-compatible SQL validation; staging D1 remains the deployment rehearsal.

The manual workflow on **main** additionally checks the live production schema. **Deploy storefront to Cloudflare Pages** now requires that same live check before its deployment job. Missing configuration, an API error, a missing column/index/trigger, or incompatible constraints fails the check and blocks that workflow's deployment. No production migration is applied.

## One-time configuration

In repository Settings → Secrets and variables → Actions:

- Keep the existing secret `CLOUDFLARE_ACCOUNT_ID`.
- Add repository variable `CLOUDFLARE_D1_DATABASE_ID`: the UUID of the exact production D1 database bound as `INQUIRIES_DB` on the Pages project. Confirm the binding in Pages settings; a valid schema in another database does not verify the binding.
- Add secret `CLOUDFLARE_D1_READ_TOKEN`: a dedicated Cloudflare API token with Account → D1 → Read for the intended account. Do not paste tokens into issues, source files or workflow inputs. The existing Pages deploy token is not reused or given D1 write access.

After merging this PR, run Actions → **Validate D1 migrations** → Run workflow → **main**. Its production check reads only `sqlite_master` schema metadata via the [Cloudflare D1 query API](https://developers.cloudflare.com/api/resources/d1/subresources/database/methods/query/), which accepts D1 Read permission. No inquiry rows, provider credentials or JWTs are retrieved. Logs print required object names and pass/fail, never the token or response body.

If migration 0005 was not applied, the check identifies missing lifecycle columns and audit triggers. Back up D1, apply only the reviewed missing migrations through the established migration procedure, then rerun the action. Do not blindly reapply ALTER migrations: databases provisioned manually may not have Wrangler's migration ledger. See [inquiry operations](inquiry-operations.md) for backup, reconciliation and rollback.

The validator derives its required schema from the committed migration files. It compares column types/defaults/nullability/keys, CHECK/unique/foreign-key constraints, named indexes and trigger definitions. Extra unrelated objects and additive columns are allowed for compatible rollouts. It establishes schema compatibility, not proof that a migration ledger was used or that the Pages binding points at this database. It does not inspect customer data or prove provider delivery.

## Deployment boundary

The gate controls the GitHub Actions deployment workflow. A separate Cloudflare Git production auto-deploy, manual Dashboard deployment, or other pipeline can bypass it. Disable the duplicate production auto-deploy or add the same preflight there before treating this as a universal production gate. Preview builds may still run for review.

Make **D1 fresh and upgrade validation** a required branch check if branch protection is configured. No branch protection settings are changed by this PR.
