"""
conftest.py — Shared pytest configuration for AIGPMS backend tests.

This file ensures that each test MODULE gets its own isolated SQLite database
so that teardown in one module (drop_all) does NOT affect another module's setup.

Root cause fixed: test_auth.py and test_api.py both override app.dependency_overrides[get_db].
When pytest runs both together, test_auth's drop_all() destroys the DB, then test_api's
auth_token fixture hits a "no such table: users" OperationalError.

Solution: Each module uses a unique DB file path, and the override is re-applied per-module.
"""
import pytest
