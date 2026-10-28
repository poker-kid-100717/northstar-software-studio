# Consultation experience verification (#49)

The consultation form now announces inline validation errors through associated descriptions and an alert summary, focuses the first invalid field, preserves answers during API/network failures, exposes loading state, and times out requests after 20 seconds. A timeout deliberately says the request may have been saved: retrying unchanged details retains the same idempotency key. Edited details get a new key. Success requires a durable reference from the API.

The security check can be retried in place after an initialization failure or expired/failed challenge. External challenge callbacks enter Angular's change detection so expiry disables submission immediately, without requiring another click. The form uses visible focus outlines, 44-pixel controls, contrast-adjusted text and borders, and a focusable success region with the inquiry reference. The form asks users to exclude patient information, confidential data, passwords and API keys; it promises no reply deadline.

## Automated coverage

From `web/`:

1. `npm ci --no-audit --no-fund`
2. `npx playwright install chromium` (use `--with-deps` on Linux CI)
3. `npm run build -- --configuration production`
4. `npm run test:e2e`

The **Inquiry desktop and mobile accessibility E2E** GitHub Actions job runs these checks against the real production Angular bundle in Chromium with desktop and Pixel 7 emulation. The 32 scenarios cover:

- Successful persisted reference, focus movement, mobile overflow, privacy messaging and pending notification.
- Inline errors, keyboard submission and field/error associations.
- Turnstile success, expiry, error and initialization outage with in-place retry.
- HTTP 400/403/502/503/429, network outage and request timeout.
- Duplicate clicks, loading state, unchanged-key retry, changed-key replacement and rejection of false success.
- Axe checks for WCAG A/AA rules through WCAG 2.2 in pristine, error and confirmation states.

Turnstile and API responses are controlled test doubles in browser tests; no real inquiries or emails are sent. The separate 15 database-backed inquiry tests verify durable persistence, retry leases, authorization and failures. The 11 migration tests verify schema upgrades. Browser tests do not prove live provider delivery or D1/Access provisioning.

## Manual acceptance before production sign-off

On a staging deployment with synthetic data and the intended Turnstile setup:

1. Use keyboard only: traverse all fields, trigger errors, complete the challenge and submit. Focus should be visible, stay on the page, move to the first invalid field, and finally move to confirmation.
2. With NVDA/Firefox or VoiceOver/Safari, verify names, required fields, hints and inline errors are announced without losing context. Verify expired verification, loading, network failure and success/reference announcements. Automated accessibility scans do not replace this assistive-technology check.
3. Check a physical mobile device, 200% zoom and narrow viewport. Confirm no horizontal scrolling, clipped controls or obscured focus.
4. Simulate a saved inquiry with delayed email and check the honest pending message. Verify unchanged retries use one persisted reference in D1.
5. Run **Validate D1 migrations** on main after configuring its read-only production check. A passing browser suite alone cannot certify the live database schema.

The PR's automated results are reproducible evidence; manual screen-reader, physical-device and live-provider checks remain owner acceptance tasks.
