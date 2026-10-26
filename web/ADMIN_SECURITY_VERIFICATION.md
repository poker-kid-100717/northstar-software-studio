# Admin Access Security Verification — Issue #57

## Current implementation
`web/functions/api/admin/inquiries.ts` requires the `Cf-Access-Jwt-Assertion` header and verifies an RS256 JWT using the Cloudflare Access JWKS endpoint. It checks issuer, audience, expiry, not-before and the exact configured owner email before accessing D1.

## Required production configuration
- `CF_ACCESS_TEAM_DOMAIN`: the Access team hostname, no scheme.
- `CF_ACCESS_AUD`: AUD of the Access application covering `/api/admin/*`.
- `CF_ACCESS_ADMIN_EMAIL`: sole authorized owner.
- `INQUIRIES_DB`: D1 database binding.

## Manual security test matrix (do not use real customer data)
| Case | Expected |
| --- | --- |
| Owner logged in, GET `/api/admin/inquiries` | 200 with test inquiries |
| New private browser session, GET `/api/admin/inquiries` | Cloudflare Access sign-in or deny; no JSON inquiries |
| Non-owner account, GET `/api/admin/inquiries` | Access deny or API 403; no inquiry data |
| New private browser session, GET `/admin` | Access sign-in or deny (not an exposed admin shell) |
| Owner logged in, GET `/admin` | Dashboard renders and loads records |
| Anonymous GET `/consultation` | Public form accessible |
| Owner with invalid status query | 400 INVALID_STATUS |
| Missing/invalid API Access configuration | 503 ADMIN_NOT_CONFIGURED, fail closed |
| Invalid JWT (wrong audience, issuer, expired, tampered, or wrong email) | 403/401, no records |

**Important:** The browser's DevTools CORS error on a redirected API fetch does *not* prove access was denied by the API. Inspect the actual response with a direct navigation and test an unauthorized identity.

## Security review notes
- Cloudflare Access path coverage must be checked in the dashboard for BOTH `/admin` (exact path) and `/admin/*`, plus `/api/admin/*`.
- A public Angular shell alone is not a data leak if the API is protected, but the desired UX is to protect the dashboard route too.
- Do not add CORS headers to the Access login domain or weaken JWT validation.
- Do not publish JWTs, auth cookies, test account addresses or actual customer PII in screenshots.
- Current API downloads JWKS per request; cache/rotation and availability tests can be a later hardening PR.
- Do not mark #57 complete until anonymous and non-owner browser checks have been performed against production.

## Release gate
1. Automated source checks green.
2. Owner confirms all manual security cases.
3. Merge PR and mark #57 complete only after evidence recorded.
