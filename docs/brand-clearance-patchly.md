# Proposed Patchly rename — blocked pending clearance

Status: **HOLD — do not publish, deploy, rename payment descriptors, change domains, or represent this name as approved.**

## Findings (November 3, 2026)
- https://patchly.ai/ is actively used by Patchly AI Corp, a software/IT vulnerability and patch-remediation services business.
- https://patchly.ai/terms/ states Patchly AI Corp claims trademark and brand rights, with terms effective January 1, 2026.
- https://patchly.ai/about/ states the company was founded in October 2025.
- patchly.ai is therefore not available for our exclusive brand use. The availability of patchly.com and other TLDs is **not verified**.
- A preliminary third-party trademark owner listing at https://www.trademarkelite.com/trademark/trademark-owner/PATCHLY%20LLC also exists, but this is **not** a conclusive USPTO clearance search and may concern a different entity.

## Decision
Do **not** perform public-facing rebranding to Patchly until a qualified trademark professional has checked USPTO federal records, state registrations, common-law use, relevant service classes, and potential confusion. A domain purchase does not confer trademark rights. Prefer a different distinctive name if the user does not wish to fund legal clearance.

## Rename implementation checklist once cleared
- Angular: site title, logo/text, hero, navigation, metadata, OG cards, accessible labels, footer, confirmation screens, error states and legal links.
- Cloudflare: Pages project display/domain strategy, redirects, DNS, CORS/origin allowlists, environment settings, Access protected routes and deployment workflows; preserve current working origin until tested.
- Stripe: customer-visible product descriptions, checkout merchant branding, receipts, support contact and statement descriptor only after the merchant legal/trading name is appropriately configured; preserve Stripe TEST-only gate and signed webhook behavior.
- Resend: verified sending domain, from name, templates, transactional subject lines, customer support identity and SPF/DKIM/DMARC; never assume an unverified domain can send.
- Policies: Terms, Privacy, Refund, service scope, checkout acceptance version and historical order records; avoid retroactively changing prior accepted terms.
- Repository: README, docs, screenshots, scripts, tests, CI labels and status messages. Do not rename GitHub repository until integrations and webhooks are inventoried.
- Validate staging E2E including intake, quote, TEST Checkout, signed webhook, duplicate events, refunds and Resend. No merge or deploy without explicit user approval.
