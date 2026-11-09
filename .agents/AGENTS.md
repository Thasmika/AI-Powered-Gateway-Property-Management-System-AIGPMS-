# AIGPMS Workspace Rules

- **CRITICAL**: Before starting any development sprint or feature, you MUST read both `IMPLEMENTATION_PLAN.md` and `TASK_LIST.md` to understand the business rules, UI structure, database design, and pending decisions. Do not rely on assumptions.
- **CRITICAL**: The live hosted system (16.16.92.52) is officially connected to the local SQLite database (`/var/www/aigpms/backend/aigpms.db`). The company owner is actively entering real production data into this SQLite database. **DO NOT change the database connection** to the AWS PostgreSQL RDS instance or wipe/reset this SQLite database under any circumstances.

## Sidebar Menu Ordering Policy

**POLICY**: All sidebar navigation items must be ordered by usage frequency — Daily on top, Yearly at the bottom. When adding new menu items, always place them in the correct frequency tier.

| Tier | Frequency | Pages |
|------|-----------|-------|
| 🔴 Daily | Every day | Rental Collection, PDC Received, Cash Receipts, Maintenance |
| 🟠 Weekly | Every week | Tenants Registry, Tenancy Contracts, PDC Issued, Cheque Books, Expenses, Payment Vouchers, Labour Camp (Residents, Utilities) |
| 🟡 Monthly | Every month | Unit Register, Property Master, Loan Register, Reports Centre, Finance/Maintenance/Labour Camp Dashboards |
| 🟢 Yearly | Rarely | Title Deeds, Ownership, Investment Dashboard, Property Dashboard, Main Dashboard, AI Assistant, System Admin |

**APPROVED SIDEBAR ORDER (exact):**
```
Property Master, Unit Register, Title Deeds, Ownership
Tenants Registry, Tenancy Contracts, Rental Collection
PDC Received, PDC Issued, Cheque Books
Expenses, Payment Vouchers, Loan Register
Maintenance
Labour Camp → Residents / Utilities / Cash Receipts
Reports Centre
── Analytics / Bottom ──
Dashboard, Finance Dashboard, Property Dashboard, Maintenance Dashboard, Labour Camp Dashboard, Investment Dashboard
AI Assistant
System Admin → Bank Master / Company Bank Accounts
```
