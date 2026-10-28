# Staging end-to-end acceptance (#105)

This is a deliberately **manual** GitHub Actions workflow, with required environment approval `northstar-staging`. It is not part of production deployment and fails closed when staging credentials are missing. Use a dedicated preview/staging Pages deployment, its own D1 binding, configured Turnstile test keys and a staging-only Resend environment. Protect the environment; do not set these secrets on production.

GitHub environment `northstar-staging` requires:
- variable `NORTHSTAR_STAGING_URL`: HTTPS origin with `staging` or `preview` in the host; **not** the production Pages domain. Exact-origin validation prevents accidental production mutation.
- secret `STAGING_CF_ACCESS_JWT`: short-lived signed **owner** JWT issued by staging Cloudflare Access (Access service tokens alone do not satisfy the application JWT email restriction).
- secret `STAGING_TURNSTILE_TEST_TOKEN`: working test Turnstile response appropriate to staging; Cloudflare verification must return matching hostname.
- secret `STAGING_QUOTE_TOKEN`: 64-character hexadecimal **single-use** acceptance token of a seeded, approved and sent quote on staging D1, with `QUOTE_ACCEPTANCE_ENABLED=true`. Refresh the quote/token before every run since acceptance changes it to accepted.

Tests create one synthetic inquiry with a unique example.test email, assert real D1 persistence indirectly through the authorized list API, inspect durable notification state, retrieve a separately pre-seeded quote, accept it and verify state. **This does not yet prove a Resend message reached an inbox**; provider delivery confirmation is a separate outstanding integration test. Quote acceptance cannot charge money.

Important operational boundaries:
- Do not point staging at production D1, Resend or real customer data.
- This suite intentionally writes staging records; use disposable staging D1 or a documented retention/cleanup process.
- Never upload tokens, email contents, or customer records into logs or artifacts.
- Ensure Cloudflare Access staging JWT and Turnstile staging test response work before the run. The workflow cannot manufacture a real access-signed JWT.
- A successful run is a staging business-flow check, **not** a production guarantee or provider delivery certification.
- For real email delivery acceptance, add a provider event lookup using a dedicated staging mailbox after provider test integration is provisioned.
