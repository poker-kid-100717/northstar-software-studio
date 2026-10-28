# Configure Northstar Pages Preview safely

Use `scripts/Configure-NorthstarStaging.ps1` in PowerShell 7. It is read-only by default and changes **only** the six selected Cloudflare Pages Preview environment variables when `-Apply` is supplied. The Cloudflare Pages project update API requires a Cloudflare token with **Pages Read/Write** for the correct account. The script requests a token securely unless `CLOUDFLARE_API_TOKEN` is set; do not commit tokens or paste them into chat/logs.

The following prerequisites must already exist:
- Production `INQUIRIES_DB` remains attached to production D1 and Preview `INQUIRIES_DB` is attached to `northstar-inquiries-staging`, ID `042bf88c-090e-43bd-969a-ff0f7d2feebd`.
- A **separate staging Cloudflare Access application** protects Preview admin routes. Obtain its audience ID, along with a valid Access team domain and an allowed owner email. The production application audience is not an acceptable substitute.
- Preview-only test Turnstile keys are intentionally enabled. Do not use this Preview environment to accept real customer inquiries.
- There must be a dedicated staging deployment that uses these Preview settings.

Dry run (values shown are examples; replace with the actual staging Access application details):

```powershell
./scripts/Configure-NorthstarStaging.ps1 -TeamDomain '<team>.cloudflareaccess.com' -AccessAudience '<staging-application-audience>' -AdminEmail 'owner@example.com'
```

When satisfied, repeat with `-Apply`. The script uses Cloudflare's `GET /accounts/{account_id}/pages/projects/{project_name}` and `PATCH` endpoints, checks that Preview D1 matches the expected staging UUID, sends only the designated Preview variable keys, and verifies they exist on readback. Secrets are not printed. Redeploy Preview to activate changes.

Configured keys: `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` (official Turnstile test pair), `CF_ACCESS_TEAM_DOMAIN`, `CF_ACCESS_AUD`, `CF_ACCESS_ADMIN_EMAIL`, and `QUOTE_ACCEPTANCE_ENABLED=true`. The script does not configure Resend or create the Access application. It does not create a staging Pages deployment, seed quotes, or trigger Playwright.

Review the Cloudflare API response behavior in dry-run and deploy a test Preview before accepting the rollout. If the preview binding is missing, the script fails closed rather than attaching or changing D1. Existing unrelated Preview config and Production settings must remain untouched; validate this in the dashboard after the first run.
