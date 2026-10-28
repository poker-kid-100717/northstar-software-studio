-- Consume actor attribution after each status/follow-up operation, even a no-op.
-- AFTER triggers audit their NEW row snapshot regardless of trigger execution order.
-- The delete API's actor update + conditional delete remains one atomic D1 batch.
UPDATE consultation_inquiries SET updated_by = 'system';
CREATE TRIGGER inquiry_actor_reset
AFTER UPDATE OF status,follow_up_at ON consultation_inquiries
WHEN NEW.updated_by <> 'system' BEGIN
 UPDATE consultation_inquiries SET updated_by = 'system' WHERE id = NEW.id;
END;
