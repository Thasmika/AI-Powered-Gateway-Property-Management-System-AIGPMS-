"""
Lightweight, idempotent startup migrations.

create_all() only creates missing tables — it never adds columns to existing
ones. These helpers add new columns (SQLite and PostgreSQL) and backfill data.
"""
import logging
import uuid
from datetime import datetime

from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine

log = logging.getLogger(__name__)


def _add_column_if_missing(engine: Engine, table: str, column: str, col_type: str) -> None:
    cols = {c["name"] for c in inspect(engine).get_columns(table)}
    if column not in cols:
        try:
            with engine.begin() as conn:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}"))
            log.info("Added column %s.%s", table, column)
        except Exception as e:
            # Several gunicorn workers start at once; another may have added it first.
            if "duplicate column" not in str(e).lower() and "already exists" not in str(e).lower():
                raise


def migrate_payment_voucher_links(engine: Engine) -> None:
    """Add payee_id / bank_account_id to payment_vouchers and link legacy payees."""
    _add_column_if_missing(engine, "payment_vouchers", "payee_id", "VARCHAR(36)")
    _add_column_if_missing(engine, "payment_vouchers", "bank_account_id", "VARCHAR(36)")

    # Backfill: link vouchers that only have a typed payee_name to a supplier record,
    # creating the supplier when no active one with that name exists.
    with engine.begin() as conn:
        rows = conn.execute(text(
            "SELECT voucher_id, payee_name, payee_type FROM payment_vouchers "
            "WHERE payee_id IS NULL AND payee_name IS NOT NULL AND TRIM(payee_name) <> ''"
        )).fetchall()
        if not rows:
            return
        suppliers = {
            name.strip().lower(): sid
            for sid, name in conn.execute(text(
                "SELECT supplier_id, supplier_name FROM suppliers WHERE is_active = :t"
            ), {"t": True}).fetchall()
            if name
        }
        now = datetime.utcnow()
        for voucher_id, payee_name, payee_type in rows:
            key = payee_name.strip().lower()
            sid = suppliers.get(key)
            if not sid:
                sid = str(uuid.uuid4())
                conn.execute(text(
                    "INSERT INTO suppliers (supplier_id, supplier_name, supplier_type, is_active, created_date, updated_date) "
                    "VALUES (:id, :name, :type, :t, :now, :now)"
                ), {"id": sid, "name": payee_name.strip(), "type": payee_type, "t": True, "now": now})
                suppliers[key] = sid
            conn.execute(text("UPDATE payment_vouchers SET payee_id = :sid WHERE voucher_id = :vid AND payee_id IS NULL"),
                         {"sid": sid, "vid": voucher_id})
        log.info("Linked %d payment vouchers to payee records", len(rows))


def run_startup_migrations(engine: Engine) -> None:
    try:
        migrate_payment_voucher_links(engine)
    except Exception:  # never block app startup on a migration problem
        log.exception("Payment voucher link migration failed")
