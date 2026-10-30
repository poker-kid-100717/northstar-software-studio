-- P3: durable commerce notification intent. This creates NO sender or outbound emails.
-- Each unique commerce audit event may generate at most one notification intent.
-- Retrieve recipient through the authorized inquiry/quote joins at send time;
-- do not duplicate customer emails, payload bodies, or secrets in this table.
CREATE TABLE IF NOT EXISTS commerce_notification_outbox (
  id TEXT PRIMARY KEY NOT NULL,
  commerce_event_id TEXT NOT NULL UNIQUE REFERENCES commerce_events(id) ON DELETE RESTRICT,
  kind TEXT NOT NULL CHECK(kind IN (
    'quote_shared','payment_confirmed','work_started','work_delivered',
    'revision_requested','work_completed','payment_refunded'
  )),
  state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','leased','accepted','delivered','failed')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 12),
  next_attempt_at TEXT,
  lease_until TEXT,
  provider_message_id TEXT UNIQUE,
  last_error_code TEXT CHECK(last_error_code IS NULL OR length(last_error_code)<=60),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  CHECK(state NOT IN ('accepted','delivered') OR provider_message_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_commerce_notification_due
  ON commerce_notification_outbox(state,next_attempt_at,lease_until);
CREATE INDEX IF NOT EXISTS idx_commerce_notification_event
  ON commerce_notification_outbox(commerce_event_id);
