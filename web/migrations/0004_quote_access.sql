-- Apply after 0003; no payment processing is enabled by this migration.
CREATE TABLE IF NOT EXISTS quote_access_tokens (
  quote_id TEXT PRIMARY KEY NOT NULL REFERENCES service_quotes(id) ON DELETE RESTRICT,
  token_sha256 TEXT NOT NULL UNIQUE CHECK (length(token_sha256) = 64),
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_quote_access_expiry ON quote_access_tokens(expires_at);
