# Production D1 migration runner

Run `scripts/Deploy-NorthstarD1.ps1` from PowerShell 7 after merging this PR into `main`.

This script targets only the verified production D1 database `northstar-inquiries` (ID `ef07d532-76a3-4a7e-bb1f-80fe4f021ec9`) and checks the missing migration set `0003`–`0006`. It never runs on normal pushes or PRs. It requires installed and authenticated Node/npm, Wrangler, Git and GitHub CLI.

1. Check the Pages production `INQUIRIES_DB` binding points to this database. Ensure no writes occur during the maintenance window, and review D1 Time Travel restore availability.
2. Sync and check out `main`. Run dry-run: `pwsh ./scripts/Deploy-NorthstarD1.ps1`.
3. If and only if schema inventory is as expected, run `pwsh ./scripts/Deploy-NorthstarD1.ps1 -Apply -ConfirmDatabaseId ef07d532-76a3-4a7e-bb1f-80fe4f021ec9`.
4. The script exports the database to `~/NorthstarD1Backups`, checks the export has content, applies each missing migration once in order, verifies markers, then dispatches the GitHub Actions **Validate D1 migrations** workflow on `main`.
5. Inspect that workflow's **Read-only production D1 schema check** result before releasing/deploying. This runner only dispatches validation; it does not wait for success and does not deploy.

**Do not commit backups**; exports can contain customer data. Keep them privately in approved encrypted storage. Backup presence checks do not constitute a restore rehearsal. The script refuses a D1 migrations ledger or partially applied schema; reconcile those cases manually. It verifies expected object names after each migration, but the live validator performs the more comprehensive schema comparison. Do not re-run a failed ALTER migration blindly.

**Important:** Production migration changes are intentionally manual and gated. This script is not wired to a push-triggered or schedule-triggered workflow.
