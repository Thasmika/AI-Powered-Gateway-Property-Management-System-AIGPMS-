# AIGPMS — Complete Development Task List
## Version 3.0 — PM Final Review Approved (July 2026)

> **Legend:** `[x]` Done · `[/]` In Progress · `[ ]` Pending
> **Sprint structure:** PM-recommended 10-sprint format
> **Last updated:** July 2026

---

## ✅ Sprint 1 — Authentication, User Management, Master Data & Foundation

> **Milestone:** System is deployable. All users can log in with role-based access. All 35+ database tables are created. Master data lookup tables are seeded.

### Backend — Models & Config (COMPLETE)
- [x] Add `alembic`, `psycopg2-binary`, `python-dotenv`, `apscheduler` to `requirements.txt`
- [x] Create `.env.example` with `DATABASE_URL`, `SECRET_KEY`, `PDC_ALERT_DAYS`, `UPLOAD_DIR`
- [x] Update `config.py` to load from `.env` via `python-dotenv`; include PDC alert config
- [x] Create `models/auth.py` — `roles`, `users`, `audit_logs`
- [x] Create `models/property.py` — `properties`, `property_units`, `title_deeds`, `property_acquisition_costs`, `property_valuations`, `property_documents`
- [x] Create `models/ownership.py` — `owners`, `ownership_records`, `beneficiary_allocations`
- [x] Create `models/tenant.py` — `tenants`, `leases`, `lease_versions`, `lease_payment_schedules`, `lease_documents`
- [x] Create `models/pdc.py` — `rental_receipts`, `rental_receipt_payment_lines`, `pdc_received`, `pdc_received_status_history`, `cheque_replacements`, `cheque_returns`, `bank_accounts`, `cheque_books`, `cheque_leaves`, `pdc_issued`, `pdc_issued_status_history`, `authorized_signatories`
- [x] Create `models/finance.py` — `cost_centres`, `expense_categories`, `expenses`, `expense_allocations`, `cashflow_commitments`, `system_settings`
- [x] Create `models/__init__.py` — register all 35+ models
- [x] Verify all 35+ tables create successfully on dev database

### Backend — Auth API (COMPLETE)
- [x] Create `schemas/auth.py` — User login/register schemas
- [x] Create `api/endpoints/auth.py` — login, logout, refresh, me, change-password
- [x] JWT authentication working with role-based access

### Frontend — Navigation & Routes (COMPLETE)
- [x] Create `components/MainLayout.tsx` — sidebar with all module navigation grouped by section
- [x] Create `components/ProtectedRoute.tsx` — role-based route guard
- [x] Create `pages/Login.tsx` — login form
- [x] Create `pages/Dashboard.tsx` — main dashboard placeholder
- [x] Register all routes in `App.tsx` with role-based access control
- [x] TypeScript compiles clean — 0 errors

### Sprint 1 Extension — Master Data & Configuration Module (Module 15) — COMPLETE
- [x] Create `models/master_data.py` — `master_banks`, `master_communities`, `master_emirates`, `master_property_types`, `master_expense_categories`, `master_maintenance_categories`, `master_payment_methods`, `notification_templates`, `ai_prompt_templates`, `approval_limits`
- [x] Create `schemas/master_data.py` — Pydantic schemas for all 10 master tables
- [x] Create `api/endpoints/master_data.py` — CRUD endpoints for all master tables
- [x] Register master data router in `main.py` under `/api/v1/master`
- [x] Create `database/seed_data.py` — populate initial UAE banks, emirates, property types, payment methods
- [x] Create `pages/admin/MasterDataHub.tsx` — central admin panel for all lookups
- [x] Create `pages/admin/BankMaster.tsx` — bank list with add/edit
- [x] Create `pages/admin/ExpenseCategoryMaster.tsx` — category list with expense class filter
- [x] Create `pages/admin/ApprovalLimits.tsx` — role-by-role threshold configuration table
- [x] Create `pages/admin/NotificationTemplates.tsx` — editable alert message templates
- [x] Ensure ALL module dropdowns (Bank, Property Type, Community, Expense Category, Payment Method) pull from master data API — no hardcoded values in any module

---

## Sprint 2 — Property Master, Title Deed & Investment Dashboard

> **Milestone:** Authorized users can create properties, attach title deeds, record purchase values and valuations, and view the Investment KPI dashboard.

### Backend
- [x] Create `schemas/property.py` — Property, PropertyUnit, TitleDeed, PropertyAcquisitionCost, PropertyValuation, PropertyDocument
- [x] Create `api/endpoints/properties.py` — CRUD: list, create, read, update property + units
- [x] Create `api/endpoints/title_deeds.py` — create/read title deed, add valuation
- [x] Add validation: `total_acquisition_cost = purchase_price + registration_fees + broker_commission + other`
- [x] Add validation: valuations are INSERT-only — never overwrite existing records (PM rule)
- [x] Add endpoint: `GET /api/v1/investment/dashboard` — returns all 8 KPI values
- [x] Register property and title deed routers in `main.py`

### Frontend — Property Pages
- [x] Create `pages/PropertyList.tsx` — property master list with status filter
- [x] Create `pages/PropertyEntry.tsx` — create/edit property form
- [x] Create `pages/PropertyDetail.tsx` — property detail with units list

### Frontend — Title Deed Pages
- [x] Create `pages/TitleDeedList.tsx` — portfolio table: Property, Title Deed No., Purchase Value, Current Market Value, Appreciation %, Loan Status
- [x] Create `pages/TitleDeedDetail.tsx` — full title deed: legal owner, beneficial owner, financier, mortgage details, document attachments, valuation history timeline
- [x] Create `pages/PropertyValuationEntry.tsx` — add new valuation form (creates new record, never edits old one)

### Frontend — Investment Dashboard (PM Requirement)
- [x] Create `pages/InvestmentDashboard.tsx` with 8 KPI cards:
  - [x] Total Portfolio Purchase Value (AED)
  - [x] Current Estimated Market Value (AED)
  - [x] Unrealized Capital Gain (AED)
  - [x] Capital Appreciation % (portfolio-wide)
  - [x] Net Rental Yield %
  - [x] Return on Investment (ROI) %
  - [x] Total Loan Outstanding (AED)
  - [x] Total Equity Value (AED)
- [x] Bar chart: Property-wise Purchase Value vs. Current Market Value
- [x] Table: Properties sorted by appreciation % (highest to lowest)
- [x] Highlight properties with value decline (red flag — red row/indicator)

---

## Sprint 3 — Ownership & Beneficiary Module

> **Milestone:** Co-ownership structures are recorded with percentage validation. Beneficiary income splits are tracked with IBAN.

### Backend
- [x] Create `schemas/ownership.py` — Owner, OwnershipRecord, BeneficiaryAllocation
- [x] Create `api/endpoints/ownership.py` — CRUD for owners, ownership records, beneficiary allocations
- [x] Add validation: ownership percentages must total 100% across all co-owners per property
- [x] Add validation: beneficiary allocation percentages must total 100%
- [x] Register ownership router in `main.py`

### Frontend
- [x] Create `pages/OwnershipList.tsx` — property-wise ownership view with percentage bars
- [x] Create `pages/OwnershipDetail.tsx` — co-owners, shares %, effective dates, beneficiary bank accounts and IBANs

---

## Sprint 4 — Tenant & Lease Management

> **Milestone:** Full tenant and lease lifecycle is working including version control, payment schedule entry, and Ejari reference tracking.

### Backend
- [x] Create `schemas/tenant.py` — Tenant, Lease, LeaseVersion, LeasePaymentSchedule, LeaseDocument
- [x] Create `api/endpoints/tenants.py` — CRUD: tenant master
- [x] Create `api/endpoints/leases.py` — CRUD: lease, lease version, payment schedule
- [x] Business rule: lease renewal auto-increments `version_number`, sets previous version `is_current_version = False`
- [x] Business rule: new lease version generates new `lease_payment_schedules` rows
- [x] Ejari number field in LeaseVersion (PM requirement)
- [x] Endpoint: `POST /api/v1/leases/{id}/renew` — creates new version, preserves history
- [x] Register tenant and lease routers in `main.py`

### Frontend
- [x] Create `pages/TenantList.tsx` — tenant master with search, filter by status
- [x] Create `pages/TenantEntry.tsx` — create/edit tenant form
- [x] Create `pages/TenantDetail.tsx` — tenant profile, lease history, PDC history
- [x] Create `pages/LeaseEntry.tsx` — new lease / renewal form with version control
- [x] Create `pages/LeaseDetail.tsx` — active lease with version history tab
- [x] Create `pages/LeasePaymentSchedule.tsx` — view/enter approved payment schedule (used as PDC validation baseline)

---

## Sprint 5 — Rental Collection, Multi-Cheque Receipt & PDC Received Register

> **Milestone:** Accountant can create a receipt with multiple PDCs, post it, and each cheque becomes an independent PDC record with alerts scheduled.

### Backend
- [x] Create `schemas/pdc.py` — RentalReceipt, RentalReceiptPaymentLine, PDCReceived, PDCReceivedStatusHistory, ChequeReturn, ChequeReplacement

#### Receipt API (`api/endpoints/receipts.py`)
- [x] `POST /api/v1/rental-receipts` — create receipt with payment lines
- [x] `GET /api/v1/rental-receipts` — list with filters
- [x] `GET /api/v1/rental-receipts/{id}` — detail
- [x] `POST /api/v1/rental-receipts/{id}/post` — post receipt
- [x] `POST /api/v1/rental-receipts/{id}/reverse` — reverse (MD only)

#### Receipt Validation Rules (all must be enforced in API)
- [x] Receipt Total = sum of all payment line amounts
- [x] Each cheque amount > 0
- [x] Each cheque must have: `cheque_number`, `bank_name`, `instrument_date`
- [x] No duplicate cheque numbers in same receipt
- [x] Total cheques must agree with lease payment schedule (or authorized variance)
- [x] Receipt currency must match lease currency
- [x] Cannot POST receipt if any mandatory field is missing
- [x] Once Posted: receipt is locked — edits require Reversal or Cancellation with authorization

#### Post-Receipt Actions
- [x] On POST: auto-create individual `pdc_received` record for each cheque line
- [x] On create `pdc_received`: auto-create initial status history entry (`Received`)
- [x] Schedule alert jobs for each cheque date (30/14/7/3 days before, on date, after date)

#### PDC Received API (`api/endpoints/pdc_received.py`)
- [x] `GET /api/v1/pdc-received` — register with filters
- [x] `GET /api/v1/pdc-received/{id}` — detail
- [x] `POST /api/v1/pdc-received/{id}/deposit` — deposit cheque
- [x] `POST /api/v1/pdc-received/{id}/clear` — mark cleared
- [x] `POST /api/v1/pdc-received/{id}/return` — record return (with charges)
- [x] `POST /api/v1/pdc-received/{id}/replace` — link replacement cheque

### Frontend — Receipt Entry
- [x] Create `pages/ReceiptVoucherEntry.tsx`
  - [x] Panel A — Receipt Header: Receipt No. (auto), Date, Tenant (dropdown), Property, Unit, Lease Ref, Contract Version, Payment Purpose, Currency, Total (auto-sum), Received By, Remarks
  - [x] Panel B — Payment Detail Grid (inline editable):
    - [x] Columns: Line #, Instrument Type, Cheque No., Bank Name, Account Holder, Cheque Date, Amount, Period From/To, Receivable Link, PDC Status, Image Upload, Remarks
    - [x] Grid buttons: Add Row, Edit Row, Delete Draft Row
    - [x] Auto-generate cheque dates from lease payment schedule
    - [x] Auto-distribute equal amounts when applicable
    - [x] Live total calculation — header total = sum of grid rows
    - [x] Validation warnings shown inline before posting
    - [x] Print receipt button — PDF with all cheque details + QR code placeholder + tenant signature block
- [x] Create `pages/ReceiptList.tsx` — list with status filter
- [x] Create `pages/ReceiptDetail.tsx` — read-only posted receipt with print button

### Frontend — PDC Received Register
- [x] Create `pages/PDCReceivedRegister.tsx`
  - [x] Searchable/filterable register: Property, Tenant, Cheque No., Bank, Cheque Date, Amount, Status
  - [x] Filter by status: Received / Held / Due Soon / Submitted / Cleared / Returned / Replaced
  - [x] Status-change action buttons per row (Deposit, Clear, Return, Replace, Cancel)
  - [x] Status change requires reason (mandatory for Replace / Cancel)
  - [x] Cheque replacement form: links new cheque to returned cheque, preserves history
  - [x] Cheque return form: return date, reason, bank charges, follow-up action
- [x] Create `pages/PDCReceivedDetail.tsx` — single cheque detail with status history timeline

---

## Sprint 6 — PDC Issued Register, Cheque Books & AI Alert Engine

> **Milestone:** Issued cheques are tracked with full lifecycle, cheque books are registered, approval workflow is working, and the AI Smart Alert Engine is running on schedule.

### Backend — PDC Issued
- [x] Create `schemas/pdc_issued.py` — ChequeBook, ChequeLeaf, PDCIssued, PDCIssuedStatusHistory, AuthorizedSignatory
- [x] Create `api/endpoints/pdc_issued.py`
  - [x] `GET/POST /api/v1/pdc-issued` — register and create
  - [x] `POST /api/v1/pdc-issued/{id}/approve` — MD approval
  - [x] `POST /api/v1/pdc-issued/{id}/issue` — mark as issued
  - [x] `POST /api/v1/pdc-issued/{id}/clear` — mark cleared
  - [x] `POST /api/v1/pdc-issued/{id}/return` — record return
  - [x] `GET/POST /api/v1/cheque-books` — register cheque books
  - [x] `GET /api/v1/cheque-books/{id}/leaves` — view leaves by status

#### PDC Issued Validation Rules
- [x] Block duplicate issued cheque numbers across all bank accounts
- [x] Cheque must belong to correct company bank account
- [x] Must link to at least one of: payment voucher, loan instalment, invoice, LPO
- [x] Block issue against unapproved expense (unless authorized override)
- [x] Cheque leaf status must be `Available` before issuing
- [x] On issue: update cheque leaf status to `Issued`

### Backend — AI Smart Alert Engine
- [x] Create `services/alert_engine.py` using APScheduler
- [x] Daily job: scan `pdc_received` for cheques where `cheque_date` is within alert thresholds
- [x] Daily job: scan `pdc_issued` for cheques due within alert thresholds
- [x] Alert thresholds read from `system_settings` table — NOT hardcoded
- [x] Default alert days: 30, 14, 7, 3, 0 (on date), overdue
- [x] Alert conditions — PDC Received: 30/14/7/3 days, on date, overdue, not cleared after 5 days, returned/replaced
- [x] Alert conditions — PDC Issued: 30/14/7/3 days, on date, uncleared, disputed
- [ ] Phase 1: in-app dashboard notification only (UI remaining)
- [x] Record every alert in `alert_logs` table (type, recipient, channel, timestamp)
- [x] `GET /api/v1/alerts/active` — active alerts for dashboard
- [x] `PUT /api/v1/alerts/{id}/dismiss` — dismiss alert

### Frontend — PDC Issued
- [x] Create `pages/PDCIssuedRegister.tsx`
  - [x] Issuance form: Payee, Type, Property Link, Cheque No. (from cheque book), Bank Account, Date, Amount, Purpose, Approval workflow
  - [x] Cheque book available leaves picker
  - [x] Filter by: Payee Type, Status, Date range
  - [x] Approval workflow UI: Accountant prepares → MD approves
  - [x] Handover tracking: date issued, acknowledged by
- [x] Create `pages/PDCIssuedDetail.tsx` — single issued cheque with status history
- [x] Create `pages/ChequebookRegister.tsx` — manage cheque books, view leaf status grid

---

## Sprint 7 — Expense Management, Finance & Loans

> **Milestone:** General and property-related expenses are separated, approval routing is working, loans are linked to title deeds with PDC-issued instalments.

### Backend — Expenses
- [x] Create `schemas/finance.py` — CostCentre, ExpenseCategory, Expense, ExpenseAllocation, CashflowCommitment
- [x] Create `api/endpoints/expenses.py`
  - [x] `GET/POST /api/v1/expenses` — list and create
  - [x] `GET/PUT /api/v1/expenses/{id}` — detail and edit (draft only)
  - [x] `POST /api/v1/expenses/{id}/approve` — MD approval
  - [x] `POST /api/v1/expenses/{id}/reject` — rejection with reason
  - [x] `GET/POST /api/v1/expenses/categories` — master data
  - [x] `GET/POST /api/v1/expenses/cost-centres` — cost centre CRUD

#### Expense Validation Rules
- [x] `expense_class` must be `General` or `Property`
- [x] Property expenses must have `property_id`
- [x] If `is_shared = True`, `expense_allocations` must exist and sum to 100%
- [x] All 8 allocation methods must work: 100% to one property, Percentage, Fixed Amount, By Unit Count, By Area, By Ownership Share, Cost Centre, Residual

### Backend — Loans & Payment Vouchers
- [x] Create `schemas/loans.py` — Loan, LoanInstalment, LoanDocument, PaymentVoucher
- [x] Create `models/loans.py` — Loan, LoanInstalment, LoanDocument, PaymentVoucher
- [x] Create `api/endpoints/loans.py`
  - [x] `GET/POST /api/v1/loans` — loan register
  - [x] `GET /api/v1/loans/{id}/instalments` — instalment schedule
  - [x] `GET/POST /api/v1/payment-vouchers` — voucher register
  - [x] `POST /api/v1/payment-vouchers/{id}/approve` — approval
  - [x] `POST /api/v1/payment-vouchers/{id}/reject` — rejection
- [x] Link loans to `title_deeds` (mortgage and LTV data)
- [x] Link loan instalments to `pdc_issued` (one PDC per instalment)
- [x] Link payment vouchers to `pdc_issued` (mandatory for all issued cheques)
- [x] Populate `cashflow_commitments` from loan instalments

### Frontend — Expenses
- [x] Create `pages/expenses/ExpenseEntry.tsx`
  - [x] Toggle: General Expense / Property Expense (changes required fields)
  - [x] General fields: Cost Centre, Payee, Category, Invoice details, Payment method, PDC link
  - [x] Property fields: Property, Unit (optional), Category, Maintenance ticket link, LPO link, Supplier, Invoice, PDC link
  - [x] Shared expense toggle → opens allocation grid (method, property, % or amount per row)
- [x] Create `pages/expenses/ExpenseList.tsx`
  - [x] Side-by-side view: General Expenses | Property Expenses (PM requirement)
  - [x] Filter by: Category, Property, Date range, Approval status, Payment method
  - [x] Approval action: Pending → Approved / Rejected
- [x] Create `pages/expenses/ExpenseDetail.tsx` — detail with approval workflow status

### Frontend — Loans
- [x] Create `pages/loans/LoanList.tsx` — all loans with status, LTV bar, KPI cards
- [x] Create `pages/loans/LoanDetail.tsx` — instalment schedule, PDC linkage, LTV calculation, outstanding balance
- [x] Create `pages/loans/PaymentVoucherEntry.tsx` — create/view/approve payment vouchers

---

## Sprint 8 — Maintenance Management & Labour Camp

> **Milestone:** Maintenance tickets are raised, assigned, and costs are linked to property expenses. Labour camp occupancy and utility billing is working.

### Backend — Maintenance
- [x] Create `models/maintenance.py` — `maintenance_tickets`, `maintenance_categories`, `maintenance_assignments`, `maintenance_documents`
- [x] Create `schemas/maintenance.py`
- [x] Create `api/endpoints/maintenance.py`
  - [x] `GET/POST /api/v1/maintenance-tickets`
  - [x] `GET/PUT /api/v1/maintenance-tickets/{id}`
  - [x] `POST /api/v1/maintenance-tickets/{id}/assign`
  - [x] `POST /api/v1/maintenance-tickets/{id}/close`
- [x] Link maintenance tickets to property expenses (`maintenance_ticket_id` on Expense)
- [x] Add maintenance models to `models/__init__.py`
- [x] Register maintenance router in `main.py`

### Backend — Labour Camp
- [x] Create `models/labourcamp.py` — `labour_camp_units`, `camp_residents`, `camp_leases`, `camp_utility_readings`
- [x] Note: Labour camp process does NOT require PDC (PM decision)
- [x] Create `schemas/labourcamp.py`
- [x] Create `api/endpoints/labourcamp.py`
  - [x] `GET/POST /api/v1/labour-camp/units`
  - [x] `GET/POST /api/v1/labour-camp/residents`
  - [x] `GET/POST /api/v1/labour-camp/leases`
  - [x] `POST /api/v1/labour-camp/utility-readings`
- [x] Add labour camp models to `models/__init__.py`
- [x] Register labour camp router in `main.py`

### Backend — Labour Camp Cash Collection (Technical Instruction Sheet — August 2026)
- [x] Add `LabourCampCashReceipt` and `LabourCampCashReceiptLine` models to `models/labourcamp.py`
  - [x] `labour_camp_cash_receipts` table: receipt_id, receipt_number (LCCR-YYYY-NNNN), receipt_date, property_id, total_amount, received_from, remarks, status (Draft/Posted/Cancelled/Reversed), created_by, created_at, posted_by, posted_at, cancelled_by, cancelled_at, reversal_reason
  - [x] `labour_camp_cash_receipt_lines` table: line_id, cash_receipt_id, line_number, camp_lease_id, unit_id, contract_monthly_rent (snapshot), rent_amount_received, old_expiry_date, new_expiry_date, remarks, created_at
- [x] Register models in `models/__init__.py`
- [x] Add schemas to `schemas/labourcamp.py`: CampLeaseForReceiptOut, LabourCampCashReceiptCreate, LabourCampCashReceiptOut, LabourCampCashReceiptLineOut, LabourCampCashReceiptListItem
- [x] Add endpoints to `api/endpoints/labourcamp.py`:
  - [x] `GET /api/v1/labour-camp/cash-receipts/leases` — combo box data, Labour Camp only filter
  - [x] `GET /api/v1/labour-camp/cash-receipts` — list/register with status/date filters
  - [x] `POST /api/v1/labour-camp/cash-receipts` — create Draft with full 9-step validation
  - [x] `GET /api/v1/labour-camp/cash-receipts/{id}` — detail with enriched lines
  - [x] `POST /api/v1/labour-camp/cash-receipts/{id}/post` — full 13-step validation + atomic transaction + expiry extension
  - [x] `POST /api/v1/labour-camp/cash-receipts/{id}/cancel` — cancel Draft
  - [x] `POST /api/v1/labour-camp/cash-receipts/{id}/reverse` — reverse Posted (MD/Admin only)
- [x] Business rules enforced in backend:
  - [x] Tenancy contract combo box restricted exclusively to Labour Camp property (by property_type)
  - [x] Monthly rent auto-populated from CampLease.monthly_rate (read-only snapshot)
  - [x] Header Total must equal Grid Total (AED 0.01 rounding tolerance)
  - [x] Duplicate contract within same receipt blocked
  - [x] All leases validated to belong to Labour Camp property even at POST time
  - [x] Successful POST extends each contract expiry by exactly 1 calendar month (calendar arithmetic, not +30 days)
  - [x] Month-end handling (31-Jan → 28-Feb, etc.)
  - [x] old_expiry_date and new_expiry_date recorded on receipt lines for audit
  - [x] Per-lease audit log entries written (AuditLog) on POST
  - [x] Entire post operation runs inside one DB transaction (rollback on any failure)
  - [x] Posted receipts locked (edits blocked, reversal MD/Admin only)
  - [x] Cancelled receipts cannot be posted
- [x] Run `Base.metadata.create_all()` to create tables in local backend/aigpms.db (confirmed: 6 labour camp tables present)

### Frontend — Maintenance
- [x] Create `pages/maintenance/MaintenanceList.tsx` — ticket list with status filter and priority indicator
- [x] Create `pages/maintenance/MaintenanceTicketEntry.tsx` — raise ticket with property, unit, category, priority
- [x] Create `pages/maintenance/MaintenanceTicketDetail.tsx` — ticket detail, assignment, cost, documents

### Frontend — Labour Camp
- [x] Create `pages/labourcamp/LabourCampManagement.tsx` — capacity and occupancy overview
- [x] Create `pages/labourcamp/LabourCampResidents.tsx` — resident list with contract status
- [x] Create `pages/labourcamp/LabourCampUtilities.tsx` — meter readings entry and billing calculation

### Frontend — Labour Camp Cash Collection (Technical Instruction Sheet — August 2026)
- [x] Create `pages/labourcamp/LabourCampCashReceipt.tsx` — full entry + list screen
  - [x] List view: register table with Receipt No., Date, Received From, Total Amount, Lines, Status, Posted At, Actions
  - [x] Status filter (Draft / Posted / Cancelled / Reversed)
  - [x] Panel A — Receipt Header: Auto Receipt No., Date (defaults today), Property (Labour Camp read-only), Received From (Camp Boss), Total Amount (AED), Remarks
  - [x] Panel B — Detail Grid: Line No., Tenancy Contract (Autocomplete combo — Labour Camp only), Room/Unit (read-only), Resident Name (read-only), Monthly Rent (read-only), Rent Amount Received (editable), Contract Expiry (read-only), Remarks
  - [x] Contract combo box grays out already-selected contracts (duplicate prevention in UI)
  - [x] Monthly Rent auto-populates on contract selection (read-only)
  - [x] Current Expiry Date auto-populates on contract selection (read-only)
  - [x] Live Footer: Header Total | Grid Total | Difference (colour-coded green/amber)
  - [x] Warning alert when totals mismatch; success alert when totals match
  - [x] Post Receipt button disabled until totals match and draft is saved
  - [x] Post confirmation dialog showing contracts to be processed and expiry extension warning
  - [x] Cancel/Discard confirmation dialog
  - [x] Save Draft → Post Receipt two-step workflow
  - [x] Posted receipts render fully read-only
- [x] Create `pages/labourcamp/LabourCampCashReceiptDetail.tsx` — read-only posted receipt detail with reverse action (MD/Admin only)
- [x] Register route in `App.tsx`: `/labour-camp/cash-receipts` and `/labour-camp/cash-receipts/:receiptId`
- [x] Register navigation in `MainLayout.tsx` under Labour Camp section: "Cash Receipts" link with LocalAtmIcon

---

## Sprint 9 — AI Chatbot, Smart Alerts, Dashboards & Reports

> **Milestone:** All dashboards are live. AI chatbot answers all PM example questions. PDF reports are generated (R01–R24). Alert engine is running on schedule.

### Backend — AI
- [ ] Integrate Gemini API (`api/endpoints/ai.py`)
- [ ] `POST /api/v1/ai/query` — accepts natural language, returns structured answer
- [ ] Context-aware queries against live database via structured SQL generation
- [ ] Support all PM example queries — PDC, Investment, Expense

#### PM Required AI Queries (all must work)
- [ ] "Which tenant cheques are due this week?"
- [ ] "Which PDCs have not been deposited?"
- [ ] "Show returned cheques for the last 6 months"
- [ ] "Which leases have insufficient cheque coverage?"
- [ ] "What is the expected PDC collection for next month?"
- [ ] "How much in issued PDCs is due next month?"
- [ ] "Which bank account has the highest upcoming cheque commitment?"
- [ ] "Show all PDCs issued to financial institutions"
- [ ] "Which issued cheques are linked to property loans?"
- [ ] "Which properties have the highest capital appreciation?"
- [ ] "What is our total real estate portfolio value today?"
- [ ] "Compare rental yield versus capital appreciation"
- [ ] "Which properties are underperforming?"
- [ ] "Which investments should be retained for another five years?"
- [ ] "Which loans are close to exceeding our preferred loan-to-value ratio?"

### Frontend — Dashboards
- [x] Create `pages/dashboard/MdDashboard.tsx` — portfolio summary, finance summary, investment KPIs, critical alerts, activity feed
- [x] Create `pages/dashboard/FinanceDashboard.tsx` — PDC received panel, PDC issued panel, cash flow chart (incoming vs outgoing by week/month), expense summary, loan instalment calendar
- [x] Update `pages/Dashboard.tsx` — redirect to role-appropriate dashboard (via sidebar nav links)
- [x] Create `pages/dashboard/PropertyDashboard.tsx` — occupancy chart, lease expiry timeline, vacancy trend
- [x] Create `pages/dashboard/MaintenanceDashboard.tsx` — ticket status, overdue highlights, cost trend, category breakdown
- [x] Create `pages/dashboard/LabourCampDashboard.tsx` — rooms/beds/occupancy/utility charts
- [x] Create `pages/AIChat.tsx` — natural language query interface, query history, suggested questions, alert links (Sprint 8)

### Frontend — Reports (R01–R24)
- [x] Create `pages/reports/ReportCentre.tsx` — report selector with filters and export buttons (role-based access, PDF+Excel)
- [x] R01 — Property Register (PDF/Excel)
- [x] R02 — Unit Occupancy Report
- [x] R03 — Lease Expiry Report
- [x] R04 — Lease Schedule Report
- [x] R05 — Rental Collection Report
- [x] R06 — PDC Received Register
- [x] R07 — PDC Due Report
- [x] R08 — Returned Cheque Report
- [x] R09 — PDC Issued Register
- [x] R10 — Bank Commitment Report
- [x] R11 — Expense Analysis Report
- [x] R12 — Shared Expense Allocation Report
- [x] R13 — Cash Flow Forecast
- [x] R14 — Investment Portfolio Report
- [x] R15 — Capital Appreciation Report
- [x] R16 — Rental Yield Report
- [x] R17 — Profitability Report
- [x] R18 — Loan Outstanding Report
- [x] R19 — Loan Instalment Schedule
- [x] R20 — Maintenance Summary Report
- [x] R21 — Labour Camp Occupancy Report
- [x] R22 — Audit Trail Report
- [x] R23 — Owner Beneficiary Report
- [x] R24 — Document Expiry Report (pending Sprint 10 Document module)
- [x] Implement role-based report access (MD = all 24, Accountant = R01–R18 R20–R22 R24)

---

## Sprint 10 — Document Management, Integration Testing, UAT & Deployment

> **Milestone:** Document management is live. All modules pass integration tests. PM and MD sign off UAT. System is deployed to production.

### Backend — Document Management (Module 14)
- [ ] Create `models/documents.py` — `document_categories`, `documents`, `document_versions`, `document_approvals`, `document_expiry_alerts`, `document_ocr_data`
- [ ] Create `schemas/documents.py`
- [ ] Create `api/endpoints/documents.py`
  - [ ] `POST /api/v1/documents` — multipart/form-data file upload
  - [ ] `GET /api/v1/documents` — filtered, searchable list
  - [ ] `GET /api/v1/documents/{id}` — detail with versions
  - [ ] `POST /api/v1/documents/{id}/versions` — new version upload
  - [ ] `POST /api/v1/documents/{id}/approve` — MD approval
  - [ ] `GET /api/v1/documents/expiring` — documents expiring within N days
- [ ] Link documents to all entity types: property, unit, tenant, lease, title_deed, loan, expense, maintenance_ticket, payment_voucher, owner
- [ ] Implement OCR field extraction (Google Document AI or Tesseract)
- [ ] Implement document expiry alert scheduling in alert engine
- [ ] Add document search to AI assistant

### Frontend — Document Management
- [ ] Create `pages/DocumentList.tsx` — searchable, filterable document library
- [ ] Create `pages/DocumentUpload.tsx` — drag-and-drop upload with entity link selection
- [ ] Create `pages/DocumentDetail.tsx` — version history, approval status, expiry info, OCR data
- [ ] Add document attachment tab to: Property Detail, Tenant Detail, Lease Detail, Loan Detail, Expense Detail, Maintenance Detail

### Testing
- [ ] Set up `pytest` for backend unit and API testing
- [ ] Set up `Vitest` for frontend unit testing
- [ ] Achieve 80% code coverage on all service and utility functions
- [ ] Write API tests for all 70+ endpoints (happy path, validation, auth, business rules)
- [ ] Create integration tests for core workflows (receipt → PDC → alert, expense approval, loan PDC link)
- [ ] System test all 55+ screens cross-browser: Chrome, Edge, Firefox
- [ ] Prepare UAT test cases based on acceptance criteria (Section 20 of implementation plan)
- [ ] Conduct UAT with Accountant, PM, and MD — obtain sign-off before production
- [ ] Run OWASP Top 10 security tests
- [ ] Run performance tests (Locust or k6) with 20 concurrent users — verify all Section 31 targets

### UAT Acceptance Criteria (PM Required — all must pass before go-live)

#### PDC Module
- [ ] Tenant lease with 5 PDCs entered and validated against lease payment schedule
- [ ] System alerts users before each cheque date at all configured thresholds
- [ ] Received cheque: deposited → cleared → returned → replaced without losing history
- [ ] Supplier PDC linked to approved payment voucher and LPO
- [ ] Loan-related PDC linked to a specific instalment
- [ ] Dashboard displays expected incoming and outgoing cheque values
- [ ] Property-wise PDC reports generated
- [ ] Bank-account-wise issued-cheque commitments generated

#### Receipt Module
- [ ] One receipt holds at least 5 cheque rows
- [ ] Each cheque row creates a separate `pdc_received` record
- [ ] Receipt total = sum of all cheque lines (enforced)
- [ ] Duplicate cheque entries blocked
- [ ] Each cheque independently traceable
- [ ] Each cheque receives its own due-date alerts
- [ ] One cheque returned without affecting others on same receipt
- [ ] Replacement cheque links to returned cheque
- [ ] Receipt printed with all cheque details
- [ ] Posted financial history cannot be deleted by normal user access
- [ ] All changes appear in audit log

#### Expense Module
- [ ] General expenses and property-related expenses appear separately
- [ ] Shared expenses allocated among multiple properties using all 8 methods
- [ ] Every financial status change recorded in audit log

#### Title Deed Module
- [ ] Purchase value permanently stored and never overwritten
- [ ] Every valuation creates a new history record (no overwrite)
- [ ] Investment dashboard shows appreciation vs. purchase value
- [ ] AI answers portfolio-level investment queries

### Deployment
- [ ] Configure Staging / UAT environment (PostgreSQL cloud)
- [ ] Configure Production environment (PostgreSQL managed cloud, Nginx, Gunicorn)
- [ ] Configure Git repository with GitFlow branching (main, develop, feature/*, hotfix/*)
- [ ] Configure CI pipeline: run unit and API tests on every commit
- [ ] Configure SSL certificate with auto-renewal
- [ ] Configure cloud object storage for file uploads (AWS S3 or Azure Blob)
- [ ] Conduct production deployment
- [ ] Run smoke test on production
- [ ] Notify stakeholders of go-live

## Sprint 10: Production Deployment
**Goal:** Deploy to AWS (Staging).
- [x] Create an AWS account (PM provided).
- [x] Configure IAM user for deployment.
- [x] Provision EC2, RDS (PostgreSQL), and S3 buckets.
- [x] Install dependencies on EC2 (Nginx, Python, Node.js).
- [x] Configure PostgreSQL schema on RDS.
- [x] Set up Gunicorn and Nginx for the FastAPI backend.
- [x] Build and deploy the React frontend to S3.
- [x] Run end-to-end tests in the Staging Environment.

---

## ⚠️ Pending Business Decisions (Awaiting PM Confirmation in SRS)

| # | Decision Required | Impact on Development |
|---|---|---|
| 1 | Approval limit thresholds — confirm AED amount separating Accountant auto-approve from MD approval | Approval routing logic in all financial modules |
| 2 | Must cheque images be uploaded before approval is granted? | Receipt posting workflow, mandatory field validation |
| 3 | Does every issued cheque require MD approval, or only above the threshold? | PDC Issued approval routing |
| 4 | Can the Accountant change cheque dates after approval? | Edit controls on posted records |
| 5 | Who may record a cheque as Cleared — Accountant only or MD also? | Status-change authorization |
| 6 | How should returned-cheque bank charges be handled — auto expense entry or manual? | ChequeReturn model and expense auto-creation |
| 7 | Should blank cheque leaves be tracked in the system? | Cheque book register feature scope |
| 8 | Should general expenses be distributed to properties for profitability reporting? | Expense allocation mandatory vs optional |
| 9 | PDC alerts via: Dashboard only / Email / WhatsApp / All three? | Alert engine delivery channel infrastructure |

---

## Cross-Cutting Tasks (All Sprints)

### Audit Logging (every sprint)
- [ ] Verify all CREATE, UPDATE, DELETE, APPROVE, REVERSE, CANCEL actions write to `audit_logs`
- [ ] Verify IP address, user agent, session ID captured on every audit record
- [ ] Verify `reason` field is mandatory for: approve, reject, reverse, cancel actions
- [ ] Verify audit records are INSERT-only — no UPDATE or DELETE permitted on audit_logs
- [ ] Create `pages/admin/AuditLogViewer.tsx` at `/admin/audit` — filterable by module, date, user, action

### Security (all sprints)
- [ ] Enforce role-based route guards in FastAPI (deps.py) for every endpoint
- [ ] Enforce conditional rendering in frontend (hide buttons/actions by role)
- [ ] No sensitive data in error messages or API response logs
- [ ] Rate limiting: 100 req/min per IP, 1000 per authenticated user

### Performance (all list endpoints)
- [ ] Database-level pagination on all list endpoints — no full-table loads in memory
- [ ] Database indexes on all foreign keys and frequently filtered columns

---

*Task List Version: 3.0*
*Aligned with Implementation Plan Version 3.0*
*Project: AI Powered Gateway Property Management System (AIGPMS)*
*Status: PM Technically Approved — Ready for Development*
