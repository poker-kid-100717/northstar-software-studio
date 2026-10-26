-- Apply to the production northstar-inquiries D1 database BEFORE deploying the notes API.
CREATE TABLE IF NOT EXISTS inquiry_activity (
 id TEXT PRIMARY KEY,
 inquiry_id TEXT NOT NULL REFERENCES consultation_inquiries(id) ON DELETE CASCADE,
 kind TEXT NOT NULL CHECK(kind IN ('note','status')),
 body TEXT,
 old_status TEXT,
 new_status TEXT,
 actor TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 CHECK ((kind = 'note' AND body IS NOT NULL AND length(body) BETWEEN 1 AND 2000)
    OR (kind = 'status' AND old_status IS NOT NULL AND new_status IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS idx_inquiry_activity_timeline ON inquiry_activity(inquiry_id, created_at DESC, id DESC);
