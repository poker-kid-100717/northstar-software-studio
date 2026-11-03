# Northstar fixed-scope service terms — draft for legal review

**Effective only when published and affirmatively accepted at checkout.** These terms supplement the published Privacy Policy and any signed statement of work. This is an operational draft, not legal advice. Review with a qualified attorney for applicable state consumer law, online contracting, taxes, and refund requirements before enabling live payments.

## Plain-language purchase summary
Northstar sells the **specific deliverable stated on the selected service page and accepted scope confirmation**, not unlimited consulting time, a guaranteed business result, or ongoing IT support. The displayed price covers one defined request on one existing business/site/account unless the offer explicitly says otherwise. Additional work is separately quoted and never charged without approval.

### Fixed-price service schedule
| Service | Price | Included | Not included | Acceptance evidence |
|---|---:|---|---|---|
| Website Quick Update | $25 | One supplied text, hours, phone, address or service-description update on one existing page | Redesign, copywriting, new pages, plugin repair | Before/after screenshots and working page URL |
| Google Review QR Kit | $25 | One QR code linked to customer's existing public Google review destination, printable PNG/PDF | Review generation, posting reviews, Google verification, printing/shipping | Delivered files and successful link test |
| Google Business Profile Cleanup | $50 | Review and update up to five agreed profile fields on one authorized listing | Listing reinstatement, ownership disputes, verification, ranking guarantees | Change log/screenshots; pending Google approvals noted |
| Contact and Booking Button Setup | $50 | One button/link to an existing functioning booking or contact destination | Building booking software, provider subscription, CRM integration | Browser click test on agreed page |
| Local Visibility Starter | $100 | One listing review, homepage title/meta description update and written consistency checklist | Search ranking, indexing timeline, backlink building, multi-location SEO | Metadata verification and delivered checklist |
| Website Lead Capture Setup | $100 | One supported standard form, one email notification destination and one synthetic submission test | CRM integrations, spam-free guarantees, complex automation, deliverability guarantees | Timestamped test submission and notification result |
| Starter Website | From $250 | Only the items in a separately approved fixed-price quote; baseline is one responsive template-based page with supplied copy/assets, contact link and basic metadata | Custom design, additional pages, domain/hosting fees, custom integrations, copywriting, ongoing maintenance | Approved preview against signed scope and deployment checklist |

Existing developer-focused services, if retained, require their own published limits and deliverable-specific acceptance criteria. No catalog card overrides a written quote for a custom project.

## Before payment: customer acknowledgment
Customer must check an **unchecked** checkbox:
> I reviewed the selected service's included work, exclusions, required materials, estimated turnaround and revision policy. I understand that the fixed price covers only the agreed deliverable, that third-party fees are separate, and that work outside the agreed scope requires a separate quote. I agree to the Service Terms and Refund Policy.

Store a versioned acceptance record with order ID, timestamp, service slug, price in cents, terms version and a non-sensitive snapshot of the selected scope. Never store raw payment card information. The server must validate terms version and product price independently; never trust browser-supplied prices.

## Eligibility and prerequisites
- Customer confirms authority to request changes to the website, domain, Google profile or other account. Northstar may decline unauthorized, deceptive, prohibited, or unsafe work.
- Customer supplies accurate written instructions, approved copy/assets, a working URL, and **delegated access** through approved provider mechanisms when required. Never submit passwords, API keys, patient data or customer personal data through ordinary intake forms.
- Northstar will confirm feasibility and scope before starting work. If the requested task is materially different or cannot be completed within the advertised scope, offer a revised quote or cancellation/refund of any unearned payment, subject to applicable law.
- Third-party provider fees, domain registration, hosting, premium plugins, email subscriptions and verification fees are not included unless the written scope expressly says so. Northstar does not purchase them without approval.
- Service turnaround begins after written scope acceptance, successful payment where applicable, and receipt of all necessary materials and access—not merely initial inquiry. Show the specific estimated turnaround at checkout; do not imply guaranteed deadlines.
- Customer delays, third-party outages, provider verification and approval processes pause the estimated schedule. Communicate material delays and offer reasonable options.

## Changes, revisions and acceptance
- One **correction** is included when the delivered result materially differs from the written agreed scope. Submit the correction request within **7 calendar days** after delivery with the relevant URL, screenshot, expected behavior and actual behavior.
- A correction is not a new feature, changed instructions, extra page, alternate design direction, additional integration, or repair of unrelated issues. Such changes receive a new quote and require customer authorization.
- Northstar supplies a completion summary identifying the work performed, evidence, remaining third-party dependencies and any limitations. Where practical, a test or before/after evidence establishes objective completion.
- The 7-day correction window is an administrative review window, **not** an automatic waiver of statutory rights or a prohibition on legitimate later claims. Silence does not waive rights.
- Northstar does not guarantee increased sales, Google rankings, indexing dates, website traffic, lead volume, third-party uptime, email inbox placement or outcomes controlled by external platforms.
- If a requested change cannot safely be made, Northstar will explain the reason and propose a revised scope or fair cancellation/refund outcome; do not represent an unperformed fix as completed.

## Cancellation, refunds and payment disputes
- Before work begins: customer may request cancellation and a refund of the service charge, except any clearly disclosed, lawful, nonrecoverable third-party costs separately approved by the customer.
- After work begins: Northstar reviews the actual work completed and may offer an appropriate partial or full refund, repair or other remedy based on circumstances and applicable law. No blanket “no refunds” rule.
- If Northstar cannot deliver the agreed service, offer a remedy consistent with applicable law, including refund where appropriate.
- Contact the support address shown on the order receipt with order number and issue details. Northstar will acknowledge a complaint within **2 business days** and aim to provide a substantive response within **5 business days**. These are operational targets, not a waiver of other rights.
- Nothing restricts lawful chargebacks, consumer protection rights, fraud reports or disputes through the card issuer/Stripe. Northstar will retain non-sensitive evidence of authorization, work, communications and refunds to respond accurately.
- Never store payment card numbers or CVC. Stripe-hosted Checkout handles payment entry. A redirect to a success page does **not** prove payment; only verified webhook/provider state may mark an order paid.
- Stripe live payments remain disabled until separately authorized and tested.

## Security and third-party systems
- Work is limited to expressly authorized systems and agreed tasks. Avoid collecting credentials through forms; use least-privilege delegated access and revoke access at completion where feasible.
- Backups and rollback arrangements for changes affecting production must be confirmed in the accepted scope. High-risk production changes may require a custom quote.
- Northstar is not responsible for independent changes made by the customer or third parties after delivery, but remains responsible for its own agreed work and applicable legal duties.
- Protect submitted business information under the published Privacy Policy, including retention/deletion practices. Do not promise privacy controls that are not implemented.

## Required implementation and launch checks
1. Publish readable per-service inclusion/exclusion/inputs/deliverable/revision/turnaround details before checkout.
2. Require an unchecked acknowledgment with links to versioned Terms, Privacy and Refund policies; record accepted version server-side.
3. Bind Stripe Checkout to a server-owned order, validated fixed price and accepted scope snapshot. Prevent double charges and duplicate fulfillment.
4. Show a confirmation summary and order reference; send receipt/confirmation through authorized provider.
5. Owner dashboard: approve scope, request clarification, track work, deliver evidence, log corrections, issue refunds and maintain audit trail.
6. Test scope changes, declined work, refunds, duplicate/out-of-order signed webhooks, retries and missing/expired terms acceptance.
7. Verify isolated Preview D1, Stripe TEST mode and staging acceptance before any production enablement.
