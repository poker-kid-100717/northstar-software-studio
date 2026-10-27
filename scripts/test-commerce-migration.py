#!/usr/bin/env python3
"""Offline SQLite/D1-compatible commerce migration regression checks."""
from pathlib import Path
import sqlite3
import unittest

ROOT = Path(__file__).resolve().parents[1]
MIGRATIONS = ROOT / "web" / "migrations"


class CommerceMigrationTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(":memory:")
        self.db.execute("PRAGMA foreign_keys = ON")
        for name in ("0001_consultation_inquiries.sql", "0002_inquiry_activity.sql", "0003_commerce_foundation.sql"):
            self.db.executescript((MIGRATIONS / name).read_text(encoding="utf-8"))
        self.db.execute(
            """INSERT INTO consultation_inquiries
            (id,contact_name,contact_email,project_type,description,budget,timeline)
            VALUES ('inq1','Example','example@example.test','other',?,'unsure','flexible')""",
            ("Synthetic description for isolated database testing.",),
        )
        self.db.execute(
            """INSERT INTO service_quotes
            (id,inquiry_id,service_name,deliverables,amount_cents)
            VALUES ('q1','inq1','Test service','Synthetic deliverable',5000)"""
        )

    def tearDown(self):
        self.db.close()

    def order(self, oid="o1", consult=0, quote="q1", amount=5000, status="awaiting_payment", paid_at=None):
        self.db.execute(
            """INSERT INTO service_orders
            (id,quote_id,consult,amount_cents,status,paid_at)
            VALUES (?,?,?,?,?,?)""",
            (oid, quote, consult, amount, status, paid_at),
        )

    def test_four_tables_and_foreign_keys(self):
        for table in ("service_quotes", "service_orders", "commerce_events", "payment_webhook_events"):
            self.assertIsNotNone(self.db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table,)).fetchone())
        self.assertEqual(self.db.execute("PRAGMA foreign_keys").fetchone()[0], 1)
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("INSERT INTO service_quotes(id,inquiry_id,service_name,deliverables,amount_cents) VALUES ('q2','missing','Test','Work',100)")

    def test_consult_flag_accepts_only_zero_and_one(self):
        self.order(consult=1)
        self.assertEqual(self.db.execute("SELECT consult FROM service_orders WHERE id='o1'").fetchone()[0], 1)
        for value in (-1, 2, None):
            with self.subTest(value=value), self.assertRaises(sqlite3.IntegrityError):
                self.order("bad", value)

    def test_consult_defaults_to_zero(self):
        self.db.execute("INSERT INTO service_orders(id,quote_id,amount_cents) VALUES ('o1','q1',5000)")
        self.assertEqual(self.db.execute("SELECT consult FROM service_orders WHERE id='o1'").fetchone()[0], 0)

    def test_quote_requires_approval_fields(self):
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("UPDATE service_quotes SET status='approved' WHERE id='q1'")
        self.db.execute("UPDATE service_quotes SET status='approved',approved_at='2026-10-26T00:00:00Z',approved_by='admin',expires_at='2026-11-01T00:00:00Z' WHERE id='q1'")
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("UPDATE service_quotes SET status='accepted' WHERE id='q1'")

    def test_no_duplicate_orders_or_webhook_events(self):
        self.order()
        with self.assertRaises(sqlite3.IntegrityError):
            self.order("o2")
        self.db.execute("INSERT INTO payment_webhook_events(provider,provider_event_id,event_type,order_id) VALUES ('stripe','evt_test','checkout.session.completed','o1')")
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("INSERT INTO payment_webhook_events(provider,provider_event_id,event_type,order_id) VALUES ('stripe','evt_test','checkout.session.completed','o1')")

    def test_paid_state_requires_paid_at(self):
        with self.assertRaises(sqlite3.IntegrityError):
            self.order(status="paid")
        self.order(status="paid", paid_at="2026-10-26T00:00:00Z")

    def test_invalid_amount_rejected(self):
        with self.assertRaises(sqlite3.IntegrityError):
            self.order(amount=0)

    def test_migrations_can_be_reapplied(self):
        for name in ("0001_consultation_inquiries.sql", "0002_inquiry_activity.sql", "0003_commerce_foundation.sql"):
            self.db.executescript((MIGRATIONS / name).read_text(encoding="utf-8"))
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM service_quotes").fetchone()[0], 1)


if __name__ == "__main__":
    unittest.main()
