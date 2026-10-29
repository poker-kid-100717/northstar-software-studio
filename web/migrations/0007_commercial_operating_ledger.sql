-- Owner-entered commercial cost and labor ledger. No customer data or payment actions.
CREATE TABLE IF NOT EXISTS commercial_operating_entries (
  id TEXT PRIMARY KEY NOT NULL,
  entry_date TEXT NOT NULL CHECK (length(entry_date)=10),
  category TEXT NOT NULL CHECK (category IN ('labor','hosting','software','payment_fee','marketing','other')),
  cost_cents INTEGER NOT NULL DEFAULT 0 CHECK (cost_cents BETWEEN 0 AND 100000000),
  minutes INTEGER NOT NULL DEFAULT 0 CHECK (minutes BETWEEN 0 AND 1440),
  note TEXT NOT NULL DEFAULT '' CHECK (length(note)<=160),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  CHECK (cost_cents>0 OR minutes>0)
);
CREATE INDEX IF NOT EXISTS idx_commercial_operating_entries_date ON commercial_operating_entries(entry_date);
