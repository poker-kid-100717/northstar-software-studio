# Instant Fixes — MVP acceptance criteria

> **Specification, not a complete implementation claim:** This is the broader Instant Fixes catalog/order/fulfillment target. The storefront currently displays fixed-scope service options, while production-ready payments, delivery and refund workflows have additional launch gates. See [README](../README.md) and [#113](https://github.com/poker-kid-100717/northstar-software-studio/issues/113).

## Product catalog
$30: SQL Query Syntax Fix; JSON / CSV Formatting Repair; Regex or Validation Fix; C# Compilation Error Fix; API Request Formatting Fix.

$50: SQL Query Correction; C# Method Bug Fix; Excel / CSV Import Mapping; API 400/401 Troubleshooting; HTML / CSS Layout Fix.

$100: SQL Performance Quick Tune; API Endpoint Bug Repair; Small Automation Repair; Webhook Delivery Troubleshooting; CI/CD Pipeline Repair.

Products must be stored in the database with name, description, fixed price, scope, exclusions, estimated effort, required inputs, deliverables, revision allowance, active flag, workload limit, turnaround, payment eligibility and display order.

## Required entities
ServiceProduct, ServiceOrder, OrderAttachment, OrderStatusHistory, OrderDeliverable, OrderRevision, PaymentTransaction. Use foreign keys, indexes and audit timestamps.

## Order lifecycle
Pending Payment, Paid, Awaiting Review, Accepted, Needs Clarification, In Progress, Delivered, Completed, Declined, Refund Pending, Refunded, Cancelled. Keep payment state separate from fulfillment state.

## Critical security
Hosted Stripe Checkout; verify webhook signatures; idempotent processing and duplicate fulfillment protection; never mark paid from redirect; local-only simulated checkout; test-mode payments for development; authenticated owner dashboard; private uploads; validate file size/type; rate limits; no production credentials in intake.

## Scope and capacity
One issue, one deliverable, one reasonable revision. No automatic upsell, no guaranteed resolution, no ongoing support. Configure daily orders, weekly hours, open-order maximum, product availability and turnaround. Reserve capacity atomically and expire unpaid holds.

## Dashboard
Search/filter orders, view customer and materials securely, accept/decline, request clarification, estimate custom work, initiate refunds, track time and revisions, upload deliverables. Report gross revenue, fees, refunds, effective hourly earnings, revenue per product, delivery time and repeat customers.

## Tests
Pricing, availability, checkout, webhook signature, webhook duplicates, order transitions, capacity, refunds, authorization and profitability.

## Release gate
Customer selects $30/$50/$100 product, submits issue, pays using Stripe test mode, verified order appears in private dashboard; owner accepts, tracks time, delivers and completes. Simulated, test and live payments are clearly distinguished.
