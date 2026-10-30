#!/usr/bin/env python3
"""Offline P3 notification D1 migration regression. No network or email delivery."""
from pathlib import Path
import sqlite3
import unittest

ROOT=Path(__file__).resolve().parents[1]
MIGRATIONS=ROOT / "web" / "migrations"
class CommerceNotificationTests(unittest.TestCase):
    def setUp(self):
        self.db=sqlite3.connect(":memory:")
        self.db.execute("PRAGMA foreign_keys=ON")
        for name in ("0001_consultation_inquiries.sql","0002_inquiry_activity.sql",
                     "0003_commerce_foundation.sql","0008_commerce_notifications.sql"):
            self.db.executescript((MIGRATIONS / name).read_text(encoding="utf-8"))
        self.db.execute("INSERT INTO commerce_events(id,entity_type,entity_id,event_type,actor) VALUES('e1','order','order1','payment_confirmed','stripe')")
        self.db.execute("INSERT INTO commerce_events(id,entity_type,entity_id,event_type,actor) VALUES('e2','order','order1','payment_refunded','stripe')")
    def tearDown(self):
        self.db.close()
    def insert(self, id="n1", event="e1", kind="payment_confirmed", **values):
        data={"id":id,"commerce_event_id":event,"kind":kind,**values}
        columns=",".join(data)
        params=",".join("?" for _ in data)
        self.db.execute("INSERT INTO commerce_notification_outbox ("+columns+") VALUES("+params+")",tuple(data.values()))
    def test_event_idempotency_and_fk(self):
        self.insert()
        with self.assertRaises(sqlite3.IntegrityError):
            self.insert("n2","e1")
        with self.assertRaises(sqlite3.IntegrityError):
            self.insert("n3","missing")
        self.insert("n4","e2","payment_refunded")
        self.assertEqual(self.db.execute("SELECT count(*) FROM commerce_notification_outbox").fetchone()[0],2)
    def test_invalid_kind_state_and_attempts_fail_closed(self):
        for values in ({"kind":"unknown"},{"state":"other"},{"attempts":-1},{"attempts":13},
                       {"state":"accepted"},{"state":"delivered"},{"last_error_code":"X"*61}):
            with self.subTest(values=values),self.assertRaises(sqlite3.IntegrityError):
                self.insert(**values)
        self.assertEqual(self.db.execute("SELECT count(*) FROM commerce_notification_outbox").fetchone()[0],0)
    def test_retry_and_provider_delivery_are_distinct(self):
        self.insert()
        self.db.execute("UPDATE commerce_notification_outbox SET state='leased',attempts=1,lease_until=datetime('now','+2 minutes') WHERE id='n1'")
        self.db.execute("UPDATE commerce_notification_outbox SET state='accepted',provider_message_id='synthetic-msg' WHERE id='n1'")
        self.assertEqual(self.db.execute("SELECT state FROM commerce_notification_outbox WHERE id='n1'").fetchone()[0],"accepted")
        self.db.execute("UPDATE commerce_notification_outbox SET state='delivered' WHERE id='n1'")
        self.assertEqual(self.db.execute("SELECT state FROM commerce_notification_outbox WHERE id='n1'").fetchone()[0],"delivered")
    def test_no_customer_email_or_message_body_stored_in_schema(self):
        names={row[1] for row in self.db.execute("PRAGMA table_info(commerce_notification_outbox)")}
        self.assertFalse({"email","recipient_email","body","subject","api_key","token"} & names)
    def test_reapplication_idempotent(self):
        self.insert()
        self.db.executescript((MIGRATIONS / "0008_commerce_notifications.sql").read_text(encoding="utf-8"))
        self.assertEqual(self.db.execute("SELECT count(*) FROM commerce_notification_outbox").fetchone()[0],1)

if __name__=="__main__":
    unittest.main()
