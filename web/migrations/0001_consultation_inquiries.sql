-- Apply to a dedicated Cloudflare D1 database before binding INQUIRIES_DB.
-- Inquiry details contain personal information; restrict database access.
CREATE TABLE IF NOT EXISTS consultation_inquiries (
 id TEXT PRIMARY KEY,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 contact_name TEXT NOT NULL,
 contact_email TEXT NOT NULL,
 project_type TEXT NOT NULL,
 description TEXT NOT NULL,
 budget TEXT NOT NULL,
 timeline TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new','reviewing','contacted','qualified','quoted','won','lost','archived')),
 notification_status TEXT NOT NULL DEFAULT 'pending' CHECK(notification_status IN ('pending','sent','failed')),
 notification_attempts INTEGER NOT NULL DEFAULT 0,
 last_notification_error TEXT,
 CONSTRAINT inquiry_description_length CHECK(length(description) BETWEEN 30 AND 3000)
);
CREATE INDEX IF NOT EXISTS idx_inquiries_created ON consultation_inquiries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inquiries_status_created ON consultation_inquiries(status,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inquiries_notification ON consultation_inquiries(notification_status,created_at);
