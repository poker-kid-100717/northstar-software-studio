-- Back up D1 and apply after 0001-0004, before deploying the lifecycle APIs.
ALTER TABLE consultation_inquiries ADD COLUMN selected_service TEXT NOT NULL DEFAULT '';
ALTER TABLE consultation_inquiries ADD COLUMN source TEXT NOT NULL DEFAULT 'consultation';
ALTER TABLE consultation_inquiries ADD COLUMN idempotency_key TEXT;
ALTER TABLE consultation_inquiries ADD COLUMN request_hash TEXT;
ALTER TABLE consultation_inquiries ADD COLUMN read_at TEXT;
ALTER TABLE consultation_inquiries ADD COLUMN follow_up_at TEXT;
ALTER TABLE consultation_inquiries ADD COLUMN updated_by TEXT NOT NULL DEFAULT 'system';
ALTER TABLE consultation_inquiries ADD COLUMN notification_next_at TEXT;
ALTER TABLE consultation_inquiries ADD COLUMN notification_lease TEXT;
ALTER TABLE consultation_inquiries ADD COLUMN notification_lease_until TEXT;
CREATE UNIQUE INDEX idx_inquiry_idempotency ON consultation_inquiries(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX idx_inquiry_email ON consultation_inquiries(contact_email);
CREATE TABLE inquiry_rate_limits (bucket TEXT PRIMARY KEY, requests INTEGER NOT NULL, expires_at INTEGER NOT NULL);
CREATE TABLE inquiry_events (
 id TEXT PRIMARY KEY, inquiry_id TEXT NOT NULL, kind TEXT NOT NULL,
 actor TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
-- Status and audit are committed together, including writes outside the dashboard.
CREATE TRIGGER inquiry_status_audit AFTER UPDATE OF status ON consultation_inquiries
WHEN OLD.status <> NEW.status BEGIN
 INSERT INTO inquiry_activity(id,inquiry_id,kind,old_status,new_status,actor)
 VALUES (lower(hex(randomblob(16))),NEW.id,'status',OLD.status,NEW.status,NEW.updated_by);
END;
CREATE TRIGGER inquiry_followup_audit AFTER UPDATE OF follow_up_at ON consultation_inquiries
WHEN OLD.follow_up_at IS NOT NEW.follow_up_at BEGIN
 INSERT INTO inquiry_events(id,inquiry_id,kind,actor) VALUES(lower(hex(randomblob(16))),NEW.id,'follow_up_changed',NEW.updated_by);
END;
CREATE TRIGGER inquiry_delete_audit AFTER DELETE ON consultation_inquiries BEGIN
 INSERT INTO inquiry_events(id,inquiry_id,kind,actor) VALUES(lower(hex(randomblob(16))),OLD.id,'deleted',OLD.updated_by);
END;
