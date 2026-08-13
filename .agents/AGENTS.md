# AIGPMS Workspace Rules

- **CRITICAL**: Before starting any development sprint or feature, you MUST read both `IMPLEMENTATION_PLAN.md` and `TASK_LIST.md` to understand the business rules, UI structure, database design, and pending decisions. Do not rely on assumptions.
- **CRITICAL**: The live hosted system (16.16.92.52) is officially connected to the local SQLite database (`/var/www/aigpms/backend/aigpms.db`). The company owner is actively entering real production data into this SQLite database. **DO NOT change the database connection** to the AWS PostgreSQL RDS instance or wipe/reset this SQLite database under any circumstances.
