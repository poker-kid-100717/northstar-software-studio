-- 0003: Quote and order foundation. Apply to D1 before deploying quote/order APIs.
-- This migration creates no checkout endpoints and cannot charge customers.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS service_quotes (
  id TEXT PRIMARY KEY NOT NULL,
  inquiry_id TEXT NOT NULL REFERENCES consultation_inquiries(id) ON DELETE RESTRICT,
  service_name TEXT NOT NULL CHECK (length(trim(service_name)) BETWEEN 1 AND 120),
  deliverables TEXT NOT NULL CHECK (length(trim(deliverables)) BETWEEN 1 AND 4000),
  exclusions TEXT NOT NULL DEFAULT '',
  currency TEXT NOT NULL DEFAULT 'usd' CHECK (currency = 'usd'),
  amount_cents INTEGER NOT NULL CHECK (amount_cents BETWEEN 1 AND 100000000),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','sent','accepted','declined','expired','cancelled')),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  expires_at TEXT,
  approved_at TEXT,
  approved_by TEXT,
  accepted_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  CHECK (status NOT IN ('approved','sent','accepted') OR (approved_at IS NOT NULL AND approved_by IS NOT NULL AND expires_at IS NOT NULL)),
  CHECK (status <> 'accepted' OR accepted_at IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_service_quotes_inquiry ON service_quotes(inquiry_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_quotes_status ON service_quotes(status,expires_at);

CREATE TABLE IF NOT EXISTS service_orders (
  id TEXT PRIMARY KEY NOT NULL,
  quote_id TEXT NOT NULL UNIQUE REFERENCES service_quotes(id) ON DELETE RESTRICT,
  consult INTEGER NOT NULL DEFAULT 0 CHECK (consult IN (0, 1)), -- 1 = consultation, 0 = other service
  status TEXT NOT NULL DEFAULT 'awaiting_payment' CHECK (status IN ('awaiting_payment','paid','in_progress','delivered','revision','completed','cancelled','refunded')),
  currency TEXT NOT NULL DEFAULT 'usd' CHECK (currency = 'usd'),
  amount_cents INTEGER NOT NULL CHECK (amount_cents BETWEEN 1 AND 100000000),
  payment_provider TEXT CHECK (payment_provider IS NULL OR payment_provider = 'stripe'),
  provider_checkout_session_id TEXT UNIQUE,
  provider_payment_intent_id TEXT UNIQUE,
  paid_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  CHECK (status NOT IN ('paid','in_progress','delivered','revision','completed','refunded') OR paid_at IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_service_orders_status ON service_orders(status,created_at DESC);

-- Append-only business audit. Application code must insert an event for every
-- quote/order state transition in the same D1 batch/transaction as the update.
CREATE TABLE IF NOT EXISTS commerce_events (
  id TEXT PRIMARY KEY NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('quote','order')),
  entity_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (length(trim(event_type)) BETWEEN 1 AND 80),
  old_status TEXT,
  new_status TEXT,
  actor TEXT NOT NULL CHECK (length(trim(actor)) BETWEEN 1 AND 254),
  details_json TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_commerce_events_entity ON commerce_events(entity_type,entity_id,created_at DESC,id DESC);

-- Idempotent event inbox for a future verified Stripe webhook handler.
-- Never insert unverified events or trust payment state from a browser redirect.
CREATE TABLE IF NOT EXISTS payment_webhook_events (
  provider TEXT NOT NULL CHECK (provider = 'stripe'),
  provider_event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  order_id TEXT REFERENCES service_orders(id) ON DELETE RESTRICT,
  received_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  processed_at TEXT,
  PRIMARY KEY (provider,provider_event_id)
);
