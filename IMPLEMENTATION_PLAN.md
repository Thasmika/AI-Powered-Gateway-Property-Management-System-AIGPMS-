# AI Powered Gateway Property Management System (AIGPMS)
## Complete Implementation Plan
### Version 3.0 — PM Final Review Approved (July 2026)

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Technology Stack](#2-technology-stack)
3. [User Roles and Access Control](#3-user-roles-and-access-control)
4. [System Architecture](#4-system-architecture)
5. [Database Design — All Tables](#5-database-design--all-tables)
6. [Module 01 — Property Master](#6-module-01--property-master)
7. [Module 02 — Title Deed and Investment](#7-module-02--title-deed-and-investment)
8. [Module 03 — Ownership and Beneficiaries](#8-module-03--ownership-and-beneficiaries)
9. [Module 04 — Tenants and Lease Management](#9-module-04--tenants-and-lease-management)
10. [Module 05 — Rental Collection and Multi-Cheque Receipt Voucher](#10-module-05--rental-collection-and-multi-cheque-receipt-voucher)
11. [Module 06 — PDC Received Register](#11-module-06--pdc-received-register)
12. [Module 07 — PDC Issued Register](#12-module-07--pdc-issued-register)
13. [Module 08 — Expense Management](#13-module-08--expense-management)
14. [Module 09 — Maintenance Management](#14-module-09--maintenance-management)
15. [Module 10 — Finance and Loans](#15-module-10--finance-and-loans)
16. [Module 11 — Labour Camp Management](#16-module-11--labour-camp-management)
17. [Module 12 — PDC and Finance Dashboard](#17-module-12--pdc-and-finance-dashboard)
18. [Module 13 — AI Assistant and Smart Alert Engine](#18-module-13--ai-assistant-and-smart-alert-engine)
19. [Development Sprint Plan](#19-development-sprint-plan)
20. [Acceptance Criteria](#20-acceptance-criteria)
21. [Pending Business Decisions](#21-pending-business-decisions)
22. [Module 14 - Document and Workflow Management](#22-module-14--document-and-workflow-management)
23. [REST API Specification](#23-rest-api-specification)
24. [Workflow Diagrams](#24-workflow-diagrams)
25. [UI Screen Inventory](#25-ui-screen-inventory)
26. [Role Permission Matrix](#26-role-permission-matrix)
27. [Approval Workflow Standards](#27-approval-workflow-standards)
28. [Notification and Alert Recipient Matrix](#28-notification-and-alert-recipient-matrix)
29. [Backup and Disaster Recovery](#29-backup-and-disaster-recovery)
30. [Security Standards](#30-security-standards)
31. [Performance Targets](#31-performance-targets)
32. [Reporting Catalogue](#32-reporting-catalogue)
33. [Dashboard Catalogue](#33-dashboard-catalogue)
34. [Audit Log Standards](#34-audit-log-standards)
35. [Integration Roadmap](#35-integration-roadmap)
36. [Testing Strategy](#36-testing-strategy)
37. [Deployment Strategy](#37-deployment-strategy)
38. [Master Data and Configuration Module](#38-master-data-and-configuration-module)
39. [Version History](#39-version-history)

---

## 1. System Overview

The **AI Powered Gateway Property Management System (AIGPMS)** is a full-stack enterprise platform managing a real estate portfolio across:

- **Operational**: Tenancy, rental collection, maintenance, labour camp
- **Financial**: PDC management (received and issued), expense tracking, loan management, payment vouchers
- **Legal**: Title deeds, ownership records, beneficiary allocations
- **Investment**: Portfolio valuation, capital appreciation, ROI analysis
- **AI-Powered**: Smart alerts, natural language queries, investment analysis

> **Project Manager Decision**: AIGPMS is no longer just a Property Management System — it is evolving into a **Real Estate Investment Management Platform**.

---

## 2. Technology Stack

### Backend
| Component | Technology |
|---|---|
| Framework | FastAPI (Python) |
| ORM | SQLAlchemy 2.0 |
| Database (Dev) | SQLite |
| Database (Production) | PostgreSQL |
| Migrations | Alembic |
| Authentication | JWT (python-jose) |
| Password Hashing | Passlib (bcrypt) |
| Background Jobs | APScheduler |
| AI Integration | Google Gemini API |

### Frontend
| Component | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| Build Tool | Vite |
| UI Library | Material UI (MUI) v5 |
| Routing | React Router v6 |
| HTTP Client | Axios |
| Charting | Recharts / MUI X Charts |
| PDF Generation | react-pdf / jsPDF |

---

## 3. User Roles and Access Control

| Role | Access Scope |
|---|---|
| Managing Director (MD) | Full read access to all modules; final approval authority |
| Accountant | Full access to finance, PDC, receipts, expenses, leases |
| Camp Supervisor | Labour camp, tenant list, rental collection (view) |
| Maintenance Staff | Maintenance tickets only |
| Administrator | System configuration, user management, all modules |

### Role-Based Navigation
| Module | MD | Accountant | Camp Supervisor | Maintenance | Admin |
|---|---|---|---|---|---|
| Dashboard | Yes | Yes | Yes | Yes | Yes |
| Property Master | Yes | Yes | No | No | Yes |
| Title Deeds and Investment | Yes | Yes | No | No | Yes |
| Ownership | Yes | Yes | No | No | Yes |
| Tenants and Leases | Yes | Yes | Yes | No | Yes |
| Rental Collection | Yes | Yes | Yes | No | Yes |
| PDC Received | Yes | Yes | No | No | Yes |
| PDC Issued | Yes | Yes | No | No | Yes |
| Expenses | Yes | Yes | No | No | Yes |
| Finance and Loans | Yes | Yes | No | No | Yes |
| Maintenance | Yes | Yes | No | Yes | Yes |
| Labour Camp | Yes | Yes | Yes | No | Yes |
| AI Assistant | Yes | Yes | Yes | Yes | Yes |

---

## 4. System Architecture

`
Frontend (React + TypeScript + MUI)
         |
         | HTTP / REST API
         |
Backend (FastAPI + SQLAlchemy)
    - API Endpoints
    - Business Logic / Services
    - Alert Engine (APScheduler)
    - AI Layer (Gemini API)
         |
Database (SQLite dev / PostgreSQL prod)
    - 35+ Tables
    - Full Audit Log
    - Immutable History Records
`

### Key Architecture Rules (PM Approved)
1. PDCs are independent financial instruments — never stored as text inside receipts or payment vouchers
2. Each PDC has its own lifecycle, status history, alerts, attachments, approvals, replacements, returns, reconciliation
3. Valuations are never overwritten — every new valuation creates a new history record
4. Purchase values are permanently stored — foundation for all ROI calculations, never edited
5. Once a receipt is posted it is locked — corrections via Reversal or Cancellation with authorization only
6. Every financial status change is recorded in the AuditLog

---

## 5. Database Design — All Tables

### Existing Tables (Auth Module — Complete)
| Table | Purpose |
|---|---|
| roles | User role definitions |
| users | System users with role assignment |
| audit_logs | Immutable audit trail for all actions |

### Module 01 — Property Master
| Table | Purpose |
|---|---|
| properties | Core property master record |
| property_units | Individual units within a property |

### Module 02 — Title Deed and Investment
| Table | Purpose |
|---|---|
| title_deeds | Legal identity of each property (1:1 with property) |
| property_acquisition_costs | Permanent purchase record — NEVER overwritten |
| property_valuations | Historical market valuations — INSERT only, never UPDATE |
| property_documents | Title Deed PDF, SPA, Mortgage, Floor Plan, NOC, Insurance |

### Module 03 — Ownership
| Table | Purpose |
|---|---|
| owners | Owner master (individual or company) |
| ownership_records | Links owner to property with percentage and dates |
| beneficiary_allocations | Income split among beneficiaries |

### Module 04 — Tenants and Leases
| Table | Purpose |
|---|---|
| tenants | Tenant master records |
| leases | Lease container (one per property/tenant relationship) |
| lease_versions | Each contract or renewal = new version (history preserved) |
| lease_payment_schedules | Approved payment schedule (PDC validation baseline) |
| lease_documents | Tenancy contracts, Emirates IDs, NOC, Ejari |

### Module 05 and 06 — PDC Received
| Table | Purpose |
|---|---|
| rental_receipts | Receipt header — one per collection event |
| rental_receipt_payment_lines | Detail grid — one row per instrument |
| pdc_received | PDC register — each cheque is independent |
| pdc_received_status_history | Immutable status change log |
| cheque_replacements | Links original cheque to replacement |
| cheque_returns | Return event, charges, follow-up |

### Module 07 — PDC Issued
| Table | Purpose |
|---|---|
| bank_accounts | Company bank accounts |
| cheque_books | Cheque book register per account |
| cheque_leaves | Individual leaves (Available / Issued / Cancelled / Damaged) |
| pdc_issued | PDC Issued register |
| pdc_issued_status_history | Immutable status change log |
| authorized_signatories | Who can sign per bank account with limits |

### Module 08 — Expense Management
| Table | Purpose |
|---|---|
| cost_centres | Cost centre master |
| expense_categories | Category master (General or Property class) |
| expenses | Expense records (both General and Property-Related) |
| expense_allocations | Shared expense split across properties |
| cashflow_commitments | Forward-looking cash commitments |
| system_settings | Configurable settings including PDC alert thresholds |

### Module 09 — Maintenance
| Table | Purpose |
|---|---|
| maintenance_tickets | Maintenance requests and work orders |
| maintenance_categories | Category master |
| maintenance_assignments | Staff assignments |
| maintenance_documents | Supporting documents and photos |

### Module 10 — Finance and Loans
| Table | Purpose |
|---|---|
| loans | Loan master records (linked to title deeds) |
| loan_instalments | Instalment schedule (linked to pdc_issued) |
| loan_documents | Loan agreements and mortgage documents |
| payment_vouchers | Payment vouchers (mandatory link for all issued PDCs) |

### Module 11 — Labour Camp
| Table | Purpose |
|---|---|
| labour_camp_units | Rooms, beds, facilities |
| camp_residents | Worker records |
| camp_leases | Labour camp occupancy contracts |
| camp_utility_readings | Utility consumption per unit |

### Module 12 — AI and Alerts
| Table | Purpose |
|---|---|
| alert_configurations | Alert rules and thresholds |
| alert_logs | Every alert sent (type, recipient, channel, timestamp) |
| notification_queue | Pending notifications for delivery |

**Total: 35+ tables — all created and verified on database**

---

## 6. Module 01 — Property Master

### Key Fields — properties
| Field | Description |
|---|---|
| property_code | Internal property code (unique) |
| property_name | Full property name |
| property_type | Apartment, Villa, Labour Camp, Commercial, Land |
| building_name | Building name |
| community | Community or development name |
| emirate | Dubai, Abu Dhabi, Sharjah, etc. |
| gps_location | GPS coordinates |
| total_units | Total unit count |
| total_area_sqft | Total floor area |
| status | Active, Inactive, Under Construction |

### Key Fields — property_units
| Field | Description |
|---|---|
| unit_number | Flat 101, Room 5, Bed Space A |
| unit_type | Studio, 1BR, 2BR, Room, Bed Space |
| area_sqft | Unit area |
| status | Vacant, Occupied, Under Maintenance |

---

## 7. Module 02 — Title Deed and Investment

### PM Decision
The Title Deed is the legal identity of every property. Every other module — ownership, financing, valuation, leasing, loans, and profitability — will ultimately refer back to it.

### Key Fields — title_deeds
| Field | Description |
|---|---|
| title_deed_number | Official title deed number |
| municipality_property_number | Municipality reference |
| plot_number | Plot number |
| legal_owner | Legal owner name |
| beneficial_owner | Beneficial owner name |
| financier | Bank or financier name |
| ownership_percentage | e.g. 100.00 percent |
| purchase_method | Cash, Mortgage, Transfer |
| ownership_status | Active, Mortgaged, Disputed, Sold |
| mortgage_bank | Lending bank name |
| outstanding_loan | Current outstanding loan amount (AED) |
| loan_to_value_ratio | LTV percentage |
| mortgage_expiry_date | Mortgage expiry date |

### Key Fields — property_acquisition_costs
**CRITICAL: These fields are permanently stored and never overwritten. They are the baseline for all ROI calculations.**

| Field | Description |
|---|---|
| purchase_date | Date of purchase |
| purchase_price | Original purchase price |
| seller_name | Seller name |
| purchase_agreement_number | SPA reference number |
| registration_fees | DLD registration fees |
| broker_commission | Agent or broker commission |
| total_acquisition_cost | = purchase_price + registration_fees + broker_commission + other |

### Key Fields — property_valuations
**CRITICAL: Every valuation = new record. Old records are NEVER updated.**

| Field | Description |
|---|---|
| market_value | Current market value (AED) |
| valuation_date | Date of valuation |
| valuation_source | Internal, RERA, DLD, Valuer |
| valuation_method | Comparable Sales, Income Approach |
| valuer_name | Name of valuer |
| appreciation_percentage | Auto-calculated vs total_acquisition_cost |

### Investment Dashboard KPIs (PM Requirement)
| KPI | Calculation |
|---|---|
| Total Portfolio Purchase Value | SUM of total_acquisition_cost |
| Current Estimated Market Value | SUM of latest market value per property |
| Unrealized Capital Gain | Current Value minus Purchase Value |
| Capital Appreciation Percent | (Gain divided by Purchase Value) x 100 |
| Net Rental Yield Percent | Annual Rent divided by Current Market Value x 100 |
| Return on Investment Percent | Net Income divided by Total Investment x 100 |
| Total Loan Outstanding | SUM of outstanding_loan |
| Total Equity Value | Current Value minus Total Loan Outstanding |

---

## 8. Module 03 — Ownership and Beneficiaries

### Validation Rules
- Ownership percentages must total 100 percent across all co-owners per property
- Beneficiary allocation percentages must total 100 percent

### Key Fields — ownership_records
| Field | Description |
|---|---|
| ownership_type | Legal, Beneficial, Co-owner |
| ownership_percentage | Share of property ownership |
| effective_from / effective_to | Date range of ownership |
| is_current | Active ownership flag |

### Key Fields — beneficiary_allocations
| Field | Description |
|---|---|
| allocation_percentage | Share of rental income |
| bank_account_number | Beneficiary bank account |
| iban | IBAN for transfer |

---

## 9. Module 04 — Tenants and Lease Management

### PM Rule: Each renewal creates a new LeaseVersion — history is never overwritten

### Lease Version Control
`
Lease (container)
    LeaseVersion v1 — original contract (Expired)
    LeaseVersion v2 — first renewal (Expired)
    LeaseVersion v3 — current renewal (Active) — is_current_version = True
        LeasePaymentSchedule (4 or 5 instalments)
`

### Key Fields — lease_versions
| Field | Description |
|---|---|
| version_number | 1 = original, 2 = first renewal, etc. |
| contract_start_date | Lease start date |
| contract_end_date | Lease end date |
| annual_rent | Annual rent (AED) |
| payment_frequency | Monthly, Quarterly, Semi-Annual, Annual |
| number_of_cheques | Typically 4 or 5 (not applicable to Labour Camp) |
| ejari_number | Ejari registration reference |
| is_current_version | Only one version active at a time |

### Key Fields — lease_payment_schedules
Used as the validation baseline for PDC collection. Total PDC value must match total schedule value.

| Field | Description |
|---|---|
| instalment_number | 1, 2, 3, 4, 5 |
| due_date | Payment due date |
| amount | Instalment amount |
| period_from / period_to | Rental period covered |
| status | Pending, Partially Paid, Paid |

---

## 10. Module 05 — Rental Collection and Multi-Cheque Receipt Voucher

### PM Decision
One receipt voucher may contain multiple payment instruments, including multiple post-dated cheques.

### Architecture (3-Layer — Mandatory)
`
rental_receipts (header) — One receipt per collection event
    rental_receipt_payment_lines (detail grid) — One row per instrument
        pdc_received (independent cheque record) — One per cheque
`

### Panel A — Receipt Header
| Field | Mandatory | Description |
|---|---|---|
| Receipt Number | Auto | System-generated |
| Receipt Date | Yes | Collection date |
| Tenant | Yes | Active tenant dropdown |
| Property | Yes | Property reference |
| Unit | Yes | Unit reference |
| Lease Reference | Yes | Active lease |
| Contract Version | Yes | Current lease version |
| Payment Purpose | Yes | New Tenancy, Renewal, Partial |
| Currency | Yes | Default AED |
| Total Amount | Auto | Sum of all detail lines |
| Received By | Yes | Staff user reference |
| Status | Auto | Draft initially |

### Panel B — Payment Detail Grid
| Column | Mandatory | Notes |
|---|---|---|
| Line Number | Auto | Auto-generated |
| Instrument Type | Yes | PDC, Current-Dated Cheque, Cash, Transfer, Card, Other |
| Cheque Number | Yes for cheques | Must be unique within receipt |
| Bank Name | Yes for cheques | Bank reference |
| Account Holder | No | Tenant or third party |
| Cheque Date | Yes for cheques | Post-dated cheque date |
| Amount | Yes | Must be greater than zero |
| Rental Period From / To | No | Period this cheque covers |
| Receivable Link | No | Link to lease payment schedule instalment |
| PDC Status | Auto | Initially Received |
| Cheque Image | Policy pending | Pending PM decision |
| Remarks | No | Line-specific notes |

### Validation Rules (All Enforced in Backend)
1. Receipt Total must equal SUM of all payment detail line amounts
2. Each cheque amount must be greater than zero
3. Each cheque must have cheque_number, bank_name, and instrument_date
4. No duplicate cheque numbers within same receipt
5. Total cheques must agree with lease payment schedule (authorized variance required)
6. Receipt currency must match lease currency
7. Cannot POST if any mandatory field is missing

### Receipt Posting Workflow
`
Step 1: Accountant selects tenant — system loads active lease version and payment schedule
Step 2: Accountant creates receipt header
Step 3: Accountant enters 4 or 5 cheques in detail grid
Step 4: System validates totals, duplicates, completeness
Step 5: Accountant saves as Draft
Step 6: Accountant verifies cheque images
Step 7: Receipt is Posted
Step 8: System auto-creates individual pdc_received records (one per cheque line)
Step 9: Smart alerts scheduled for each cheque date
Step 10: Receipt PDF generated and available for print
`

### Receipt Statuses
Draft — Pending Verification — Posted — Partially Allocated — Fully Allocated — Reversed — Cancelled

**Rule: Once Posted, a receipt cannot be directly edited. Corrections must go through Reversal or Cancellation with authorization.**

### Example — AED 80,000 Lease with 4 PDCs
| Cheque | Date | Amount |
|---|---|---|
| PDC 1 | 01 Aug 2026 | AED 20,000 |
| PDC 2 | 01 Nov 2026 | AED 20,000 |
| PDC 3 | 01 Feb 2027 | AED 20,000 |
| PDC 4 | 01 May 2027 | AED 20,000 |
| Receipt Total | | AED 80,000 |

One receipt issued for AED 80,000. Four separate pdc_received records created.

### Receipt Print Format
- Header: Tenant, Property, Unit, Lease Reference, Contract Version
- Detail table: All cheques with date, bank, amount
- Total in figures and in words
- Received-by signature area
- Tenant acknowledgment signature
- System receipt reference and QR code

---

## 11. Module 06 — PDC Received Register

### PM Business Requirement
For most tenancy contracts and renewals, except the labour-camp process, tenants provide approximately four or five post-dated cheques.

### Required Fields — pdc_received
| Field | Description |
|---|---|
| pdc_receipt_reference | Unique reference number |
| property_id | Property link |
| unit_id | Unit link |
| tenant_id | Tenant link |
| lease_id | Lease link |
| lease_version_id | Specific version link |
| receivable_id | Payment schedule instalment link |
| cheque_number | Cheque number |
| bank_name | Issuing bank |
| account_holder | Cheque account holder |
| cheque_date | Post-dated cheque date |
| cheque_amount | Cheque value (AED) |
| rental_period_from / rental_period_to | Rental period covered |
| date_received | Physical receipt date |
| received_by | Staff member who received it |
| current_cheque_location | Safe, Bank, Finance Office |
| deposit_bank_account | Which bank account to deposit into |
| attachment_path | Scanned cheque image |
| status | Current lifecycle status |

### Cheque Lifecycle Statuses
Received — Held — Due Soon — Submitted to Bank — Deposited — Cleared
Also: Returned, Replaced, Cancelled, On Hold, Partially Settled

### Control Rules
- Block duplicate cheque numbers for same bank account
- Verify total PDC value agrees with approved lease payment schedule
- Flag missing or incomplete cheque coverage
- Link each cheque to correct lease version
- Preserve cancelled and replaced cheque history with mandatory reason
- Link cleared cheque to related rental receivable
- Record cheque-return charges and follow-up actions

### AI Smart Alert Schedule (All Periods Configurable)
| Trigger | Alert |
|---|---|
| 30 days before cheque date | Early warning |
| 14 days before cheque date | Alert |
| 7 days before cheque date | Urgent alert |
| 3 days before cheque date | Critical alert |
| On cheque date | Due today |
| After date if not deposited | Overdue escalation |
| Submitted but not cleared after 5 days | Follow-up alert |
| Returned or Replaced | Immediate alert |

---

## 12. Module 07 — PDC Issued Register

### PM Business Requirement
The company issues post-dated cheques to suppliers, contractors, sister companies, financial institutions, and loan providers.

### Required Fields — pdc_issued
| Field | Description |
|---|---|
| pdc_issue_reference | Unique reference number |
| payee_name | Payee full name |
| payee_type | Supplier, Contractor, Sister Company, Bank, Loan Provider |
| related_property_id | Property link (optional) |
| related_loan_id | Loan link (optional) |
| related_lpo_id | LPO link (optional) |
| related_invoice_id | Invoice link (optional) |
| related_payment_voucher_id | Payment voucher link (mandatory) |
| cheque_number | Cheque number from cheque book |
| bank_account_id | Company bank account |
| cheque_date | Post-dated cheque date |
| cheque_amount | Cheque value |
| date_issued | Physical handover date |
| prepared_by | Accountant reference |
| approved_by | Approver reference |
| handover_date | Date handed to payee |
| acknowledged_by | Payee representative name |
| purpose | Description of purpose |
| status | Current lifecycle status |

### Issued Cheque Statuses
Draft — Pending Approval — Approved — Issued — Held by Payee — Due Soon — Presented — Cleared
Also: Returned, Replaced, Cancelled, Stopped, On Hold

### Cheque Leaf Statuses (cheque_leaves table)
| Status | Description |
|---|---|
| Available | Not yet used — can be issued |
| Issued | Linked to a pdc_issued record |
| Cancelled | Voided — reason required |
| Damaged | Physical damage — cannot be used |

### Control Rules
- Block duplicate issued cheque numbers
- Cheque must belong to correct company bank account
- Must link to approved payment voucher, loan instalment, invoice, or LPO
- Block issuing against unapproved expense (unless authorized override)
- Record authorized signatories with signature limits
- Show upcoming cash-flow commitments

### AI Smart Alerts — PDC Issued
| Trigger | Alert |
|---|---|
| 30 / 14 / 7 / 3 days before | Standard alert |
| On cheque date | Due alert |
| Insufficient bank funding info | Warning |
| Linked invoice or instalment disputed | Warning |
| Uncleared after due date | Escalation |

---

## 13. Module 08 — Expense Management

### PM Decision: Two Primary Expense Classes

**Class A — General Expenses** (not directly attributable to one specific property)
Examples: Agent commission not linked to a property, software development, office admin, consultancy, company-wide legal fees, general insurance, system subscriptions, project management

**Class B — Property-Related Expenses** (directly attributable to a property or unit)
Examples: Repairs, maintenance materials, service charges, property insurance, utility charges, agent commission for specific tenancy, cleaning, inspection costs, municipality fees, loan-related charges

### Expense Allocation Methods
| Method | Description |
|---|---|
| 100% to one property | Direct full allocation |
| Percentage | Defined percent across multiple properties |
| Fixed Amount | Specific AED amount per property |
| By Unit Count | Divide by number of units |
| By Area | Divide by floor area in sqft |
| By Ownership Share | Divide by ownership percentage |
| Cost Centre | No property allocation |
| Residual | Remaining after other allocations |

### Example — Shared Expense
A property inspection contract covering 10 properties costing AED 10,000:
- Split equally: AED 1,000 per property (By Unit Count method)
- Or by approved percentage (Percentage method)
- Recorded in expense_allocations table — one row per property

---

## 14. Module 09 — Maintenance Management

### Ticket Lifecycle
Open — Assigned — In Progress — Pending Parts or LPO — Completed — Verified — Closed

### Key Features
- Ticket creation with property, unit, category, priority
- Assignment to maintenance staff
- LPO generation for supplier work
- Supplier invoice linked to property expense module
- Document and photo uploads
- Escalation alerts for overdue tickets

---

## 15. Module 10 — Finance and Loans

### Key Relationships
`
Title Deed — Loan — Loan Instalments — PDC Issued (one PDC per instalment)
Payment Voucher — PDC Issued (every issued PDC must link to an approved voucher)
`

### Key Tables
| Table | Key Fields |
|---|---|
| loans | property via title deed, bank, amount, term, interest rate |
| loan_instalments | due_date, principal, interest, total, pdc_issued_id |
| payment_vouchers | voucher_number, payee, amount, approval_status, approved_by |
| bank_accounts | account_name, bank_name, account_number, IBAN, currency |

---

## 16. Module 11 — Labour Camp Management

### PM Note
Labour camp process does NOT require PDC cheques — a different payment process applies.

### Key Features
- Room and unit capacity management
- Worker and resident records
- Occupancy contracts (camp-specific lease process)
- Utility meter readings (electricity, water)
- Automated utility billing calculation

---

## 17. Module 12 — PDC and Finance Dashboard

### PDCs Received Panel
| Metric | Description |
|---|---|
| Total PDCs Held | Count and total value |
| Due This Week | Count and value |
| Due This Month | Count and value |
| Submitted to Bank | Count and value |
| Cleared this month | Count and value |
| Returned this month | Count and value |
| Replaced | Count and value |
| Overdue for Deposit | Past cheque date, not yet deposited |

### PDCs Issued Panel
| Metric | Description |
|---|---|
| Total Issued and Uncleared | Count and value |
| Due This Week | Count and value |
| Due This Month | Count and value |
| By Payee Type | Supplier, Contractor, Bank, General Expense |
| Bank-Account-Wise | Commitment per bank account |

### Cash-Flow View (PM Requirement)
| Incoming | Outgoing |
|---|---|
| Expected PDCs (from pdc_received) | Upcoming issued PDCs |
| Rental receivables | Loan instalments |
| | Property expenses |
| | General expenses |
| Estimated Available Cash Position | |

---

## 18. Module 13 — AI Assistant and Smart Alert Engine

### Alert Engine — Daily Jobs (APScheduler)

**Job 1 — PDC Received Alerts**
- Scan pdc_received where status is Received or Held
- Calculate days until cheque_date
- Compare against thresholds from system_settings table
- Create alert entry if threshold matches and alert not already sent
- Set alert flag on PDC record

**Job 2 — PDC Issued Alerts**
- Scan pdc_issued where status is Approved, Issued, or Held by Payee
- Same threshold logic as received
- Additional check: bank funding availability

### Alert Delivery Phases
| Phase | Channel | Status |
|---|---|---|
| Phase 1 | In-app dashboard notification | Build now |
| Phase 2 | Email | Pending PM confirmation |
| Phase 3 | WhatsApp | Pending PM confirmation |

### AI Chatbot — PDC Queries (Must All Work)
- Which tenant cheques are due this week?
- Which PDCs have not been deposited?
- Show returned cheques for the last 6 months.
- Which leases have insufficient cheque coverage?
- What is the expected PDC collection for next month?
- How much in issued PDCs is due next month?
- Which bank account has the highest upcoming cheque commitment?
- Show all PDCs issued to financial institutions.
- Which issued cheques are linked to property loans?

### AI Chatbot — Investment Queries (Must All Work)
- Which properties have the highest capital appreciation?
- What is our total real estate portfolio value today?
- Compare rental yield versus capital appreciation.
- Which properties are underperforming?
- Which investments should be retained for another five years?
- Which loans are close to exceeding our preferred loan-to-value ratio?
- Show the appreciation of all Downtown properties.
- Which property has increased most in value?
- Which properties have appreciated more than 40 percent?

---

## 19. Development Sprint Plan

> **PM Recommendation (v3.0):** Sprint plan restructured into the PM-recommended 10-sprint format for improved milestone reporting and project tracking.

### Sprint Summary (PM Recommended Structure)

| Sprint | Focus Area | Internal Sprints | Status |
|---|---|---|---|
| Sprint 1 | Authentication, User Management, Master Data & Configuration | Sprint 1 (DB + Auth) + Sprint 0 (Master Data) | Sprint 1 COMPLETE |
| Sprint 2 | Property Master, Title Deed and Investment Dashboard | Sprint 2 | Pending |
| Sprint 3 | Ownership and Beneficiary Module | Sprint 3 | Pending |
| Sprint 4 | Tenant and Lease Management | Sprint 4 | Pending |
| Sprint 5 | Rental Collection, Multi-Cheque Receipt and PDC Received | Sprint 5 | Pending |
| Sprint 6 | PDC Issued Register and Cheque Book Management | Sprint 6 + Alert Engine | Pending |
| Sprint 7 | Expense, Finance and Loan Management | Sprint 8 + Sprint 11 | Pending |
| Sprint 8 | Maintenance Management and Labour Camp | Sprint 10 + Sprint 12 | Pending |
| Sprint 9 | AI Chatbot, Smart Alert Engine, Dashboards and Reports | Sprint 7 + 9 + 13 + 14 | Pending |
| Sprint 10 | Document Management, Integration Testing, UAT and Deployment | Sprint 15 + UAT | Pending |

### Detailed Sprint Plan (PM Recommended — v3.0)

#### Sprint 1 — Authentication, User Management, Master Data and Foundation ✅ COMPLETE
**Milestone:** System is deployable. All users can log in with role-based access. All 35+ database tables are created. Master data lookup tables are seeded.
- [x] All 35+ database models created and verified
- [x] JWT authentication working
- [x] Role-based navigation and route guards implemented
- [x] Frontend compiles clean (0 TypeScript errors)
- [ ] Master Data Configuration Module (Module 15) — tables, API, admin UI
- [ ] Seed initial master data: Banks, Emirates, Property Types, Payment Methods

#### Sprint 2 — Property Master, Title Deed and Investment Dashboard
**Milestone:** Authorized users can create properties, attach title deeds, record purchase values and valuations, and view the Investment KPI dashboard.
- [ ] Property Master API and UI (CRUD)
- [ ] Title Deed module — create, view, update
- [ ] Property Acquisition Cost — permanent record, no overwrite
- [ ] Property Valuations — INSERT only history
- [ ] Investment Dashboard — 8 KPI cards, bar chart, appreciation table

#### Sprint 3 — Ownership and Beneficiary Module
**Milestone:** Co-ownership structures are recorded with percentage validation. Beneficiary income splits are tracked.
- [ ] Owner master CRUD
- [ ] Ownership records with percentage validation (must total 100%)
- [ ] Beneficiary allocation with IBAN and percentage validation

#### Sprint 4 — Tenant and Lease Management
**Milestone:** Full tenant and lease lifecycle is working including version control, payment schedule entry, and Ejari reference tracking.
- [ ] Tenant master CRUD
- [ ] Lease creation with version control
- [ ] Lease renewal (auto-increments version, preserves history)
- [ ] Lease payment schedule entry and validation

#### Sprint 5 — Rental Collection, Multi-Cheque Receipt and PDC Received Register
**Milestone:** Accountant can create a receipt with multiple PDCs, post it, and each cheque becomes an independent PDC record with alerts scheduled.
- [ ] Receipt voucher entry (Panel A header + Panel B multi-cheque grid)
- [ ] All receipt validation rules enforced
- [ ] Auto-creation of pdc_received records on POST
- [ ] PDC Received Register with status lifecycle management
- [ ] Cheque return and replacement workflows

#### Sprint 6 — PDC Issued Register and Cheque Book Management
**Milestone:** Issued cheques are tracked with full lifecycle, cheque books are registered, and approval workflow is working.
- [ ] Cheque book and leaf management
- [ ] PDC Issued entry with approval workflow
- [ ] Authorized signatory management
- [ ] PDC Issued status lifecycle (Draft to Cleared)
- [ ] AI Smart Alert Engine for PDC Received and Issued

#### Sprint 7 — Expense, Finance and Loan Management
**Milestone:** General and property-related expenses are separated, approval routing is working, loans are linked to title deeds with PDC-issued instalments.
- [ ] Expense Management — both classes, all 8 allocation methods
- [ ] Expense approval workflow (role and threshold based)
- [ ] Loan management linked to title deeds
- [ ] Loan instalment schedules linked to pdc_issued
- [ ] Payment voucher management

#### Sprint 8 — Maintenance Management and Labour Camp
**Milestone:** Maintenance tickets are raised, assigned, and costs are linked to property expenses. Labour camp occupancy and utility billing is working.
- [ ] Maintenance ticket lifecycle (Open to Closed)
- [ ] Staff assignment and LPO integration
- [ ] Labour camp unit, resident, and lease management
- [ ] Camp utility readings and billing calculation

#### Sprint 9 — AI Chatbot, Smart Alerts, Dashboards and Reports
**Milestone:** All dashboards are live. AI chatbot answers all PM example questions. PDF reports are generated. Alert engine is running.
- [ ] Gemini API chatbot integration
- [ ] All PM example queries working (PDC, Investment, Expense)
- [ ] Finance Dashboard and Cash-Flow View
- [ ] Investment Dashboard with AI-powered insights
- [ ] All reports R01 to R24 generated (PDF and Excel)
- [ ] Alert engine running on schedule (all thresholds)

#### Sprint 10 — Document Management, Integration Testing, UAT and Deployment
**Milestone:** Document management is live. All modules pass integration tests. PM and MD sign off UAT. System is deployed to production.
- [ ] Document Management module (Module 14) — upload, version, approve, OCR
- [ ] Document expiry alerts
- [ ] Integration test suite (all end-to-end workflows)
- [ ] User Acceptance Testing with PM and MD
- [ ] Security testing (OWASP checklist)
- [ ] Performance testing (all targets from Section 31)
- [ ] Production deployment and go-live



---

## 20. Acceptance Criteria

### PDC Module — Must Demonstrate
- Tenant lease with 5 PDCs entered and validated against lease payment schedule
- System alerts users before each cheque date at all configured thresholds
- Received cheque: deposited to cleared to returned to replaced without losing history
- Supplier PDC linked to approved payment voucher and LPO
- Loan-related PDC linked to a specific instalment
- Dashboard displays expected incoming and outgoing cheque values
- Property-wise PDC reports generated
- Bank-account-wise issued cheque commitments generated

### Receipt Module — Must Demonstrate
- One receipt holds at least 5 cheque rows
- Each cheque row creates a separate pdc_received record
- Receipt total enforced equal to sum of all cheque lines
- Duplicate cheque entries blocked
- Each cheque independently traceable
- Each cheque receives its own due-date alerts
- One cheque returned without affecting other cheques on same receipt
- Replacement cheque linked to returned cheque
- Receipt printed with all cheque details
- Posted financial history cannot be deleted through normal user access
- All changes appear in audit log

### Expense Module — Must Demonstrate
- General expenses and property-related expenses appear separately
- Shared expenses allocated among multiple properties using all 8 methods
- Every financial status change recorded in audit log

### Title Deed Module — Must Demonstrate
- Purchase value permanently stored and never overwritten
- Every valuation creates a new history record (old records untouched)
- Investment dashboard shows capital appreciation versus purchase value
- AI answers portfolio-level investment queries

---

## 21. Pending Business Decisions

These items must be confirmed by the Project Manager during SRS review before coding the corresponding modules.

| Number | Decision Required | Impact |
|---|---|---|
| 1 | Must cheque images be uploaded before approval is granted? | Receipt posting workflow, mandatory field validation |
| 2 | Does every issued cheque require MD approval or only above a value threshold? | Approval workflow design |
| 3 | What are the approval limits by role (e.g. less than AED 5,000 = Accountant, above AED 5,000 = MD)? | Approval routing logic |
| 4 | Can the Accountant change cheque dates after approval? | Edit controls on posted records |
| 5 | Who may record a cheque as Cleared (Accountant only or MD also)? | Status-change authorization |
| 6 | How should returned-cheque bank charges be handled (auto expense entry or manual)? | ChequeReturn model and expense auto-creation |
| 7 | Should blank cheque leaves be tracked in the system? | Cheque book register feature scope |
| 8 | Should general expenses be distributed to properties for profitability reporting? | Expense allocation mandatory versus optional |
| 9 | PDC alerts delivered via Dashboard only, Email, WhatsApp, or all three? | Alert engine delivery channels and infrastructure |

---

> *Section 21 — Pending Business Decisions are tracked in [TASK_LIST.md](TASK_LIST.md). Confirm all items with PM during SRS review.*



## 22. Complete Development Task List

> The full development task list is maintained in **[TASK_LIST.md](TASK_LIST.md)** — Version 3.0, aligned with the PM-recommended 10-sprint structure.
> Tasks are broken down by sprint, module, backend, and frontend. Completion status (`[x]` Done · `[/]` In Progress · `[ ]` Pending) is tracked in that file.

---


### Sprint 1 — Foundation, Database Models & Navigation (COMPLETE)

#### Backend — Models & Config
- [x] Add alembic, psycopg2-binary, python-dotenv, apscheduler to requirements.txt
- [x] Create .env.example with DATABASE_URL, SECRET_KEY, PDC_ALERT_DAYS, UPLOAD_DIR
- [x] Update config.py to load from .env via python-dotenv; include PDC alert config
- [x] Create models/property.py — properties, property_units, title_deeds, property_acquisition_costs, property_valuations, property_documents
- [x] Create models/ownership.py — owners, ownership_records, beneficiary_allocations
- [x] Create models/tenant.py — tenants, leases, lease_versions, lease_payment_schedules, lease_documents
- [x] Create models/pdc.py — rental_receipts, rental_receipt_payment_lines, pdc_received, pdc_received_status_history, cheque_replacements, cheque_returns, bank_accounts, cheque_books, cheque_leaves, pdc_issued, pdc_issued_status_history, authorized_signatories
- [x] Create models/finance.py — cost_centres, expense_categories, expenses, expense_allocations, cashflow_commitments, system_settings
- [x] Create models/__init__.py — register all 35 models
- [x] Verify all 35 tables create successfully on dev database

#### Frontend — Navigation & Routes
- [x] Add sidebar nav items: Title Deeds & Investment, PDC Received, PDC Issued, Expenses
- [x] Register all new routes in App.tsx with role-based access control
- [x] TypeScript compiles clean — 0 errors

---

### Sprint 2 — Property Master, Title Deed & Investment Dashboard

#### Backend
- [ ] Create schemas/property.py — Pydantic schemas for Property, PropertyUnit, TitleDeed, PropertyAcquisitionCost, PropertyValuation, PropertyDocument
- [ ] Create api/endpoints/properties.py — CRUD: list, create, read, update property
- [ ] Create api/endpoints/title_deeds.py — create/read title deed, add valuation (POST only — never PUT on existing valuation)
- [ ] Add validation: total_acquisition_cost = purchase_price + registration_fees + broker_commission + other
- [ ] Add validation: valuations are INSERT-only — never overwrite existing records (PM rule)
- [ ] Register property + title deed routers in main.py

#### Frontend
- [ ] Create pages/TitleDeedList.tsx — property portfolio table with columns: Property, Title Deed No., Purchase Value, Current Market Value, Appreciation %, Loan Status
- [ ] Create pages/TitleDeedDetail.tsx — full title deed record with legal owner, beneficial owner, financier, mortgage details, document attachments, valuation history timeline
- [ ] Create pages/PropertyValuationEntry.tsx — add new valuation form; creates new record, never edits old one

#### Investment Dashboard (PM Requirement)
- [ ] Create pages/InvestmentDashboard.tsx with 8 KPI cards: Total Portfolio Purchase Value, Current Market Value, Unrealized Capital Gain, Appreciation %, Net Rental Yield %, ROI %, Total Loan Outstanding, Total Equity Value
- [ ] Bar chart: Property-wise Purchase Value vs Current Market Value comparison
- [ ] Table: Properties sorted by appreciation % (highest to lowest)
- [ ] Highlight properties with value decline (red flag)

---

### Sprint 3 — Ownership & Beneficiary Module

#### Backend
- [ ] Create schemas/ownership.py — Owner, OwnershipRecord, BeneficiaryAllocation
- [ ] Create api/endpoints/ownership.py — CRUD for owners and ownership records
- [ ] Add validation: ownership percentages must total 100% per property
- [ ] Add validation: beneficiary allocation percentages must total 100%

#### Frontend
- [ ] Create pages/OwnershipList.tsx — property-wise ownership view
- [ ] Create pages/OwnershipDetail.tsx — co-owners, shares, beneficiary bank accounts

---

### Sprint 4 — Tenant & Lease Management

#### Backend
- [ ] Create schemas/tenant.py — Tenant, Lease, LeaseVersion, LeasePaymentSchedule
- [ ] Create api/endpoints/tenants.py — CRUD: tenant master
- [ ] Create api/endpoints/leases.py — CRUD: lease, lease version, payment schedule
- [ ] Business rule: lease renewal auto-increments version_number, sets previous version is_current_version = False
- [ ] Business rule: new lease version generates new lease_payment_schedules rows
- [ ] Ejari number field in LeaseVersion (PM requirement)

#### Frontend
- [ ] Create pages/TenantList.tsx — tenant master with search, filter by status
- [ ] Create pages/TenantDetail.tsx — tenant profile, lease history, PDC history
- [ ] Create pages/LeaseEntry.tsx — new lease / renewal form with version control
- [ ] Create pages/LeasePaymentSchedule.tsx — view/enter approved payment schedule

---

### Sprint 5 — Receipt Voucher with Multi-Cheque Entry (PM Core Requirement)

#### PM Decision: One receipt voucher may contain multiple PDCs. 3-layer architecture mandatory.

#### Backend
- [ ] Create schemas/pdc.py — RentalReceipt, RentalReceiptPaymentLine, PDCReceived
- [ ] Create api/endpoints/receipts.py

##### Receipt Validation Rules (all must be enforced in API)
- [ ] Receipt Total = sum of all payment line amounts
- [ ] Each cheque amount > 0
- [ ] Each cheque must have: cheque_number, bank_name, instrument_date
- [ ] No duplicate cheque numbers in same receipt
- [ ] Total cheques must agree with lease payment schedule (or authorized variance required)
- [ ] Receipt currency must match lease currency
- [ ] Cannot POST receipt if any mandatory field is missing
- [ ] Once Posted: receipt is locked — edits require Reversal or Cancellation with authorization

##### Post-Receipt Actions (API)
- [ ] On POST receipt: auto-create individual pdc_received record for each cheque line
- [ ] On create pdc_received: auto-create initial status history entry (Received)
- [ ] Schedule alert jobs for each cheque date (30/14/7/3 days before, on date, after date)

#### Frontend — Receipt Entry Screen
- [ ] Create pages/ReceiptVoucherEntry.tsx
  - [ ] Panel A: Receipt Header — Receipt No. (auto), Date, Tenant, Property, Unit, Lease Ref, Contract Version, Payment Purpose, Currency, Total (auto-sum), Received By, Remarks, Attachment
  - [ ] Panel B: Payment Detail Grid — Line No., Instrument Type, Cheque No., Bank Name, Account Holder, Cheque Date, Amount, Period From, Period To, Receivable Link, PDC Status, Image Upload, Remarks
  - [ ] Grid buttons: Add Row, Edit Row, Delete Draft Row, Copy Row
  - [ ] Auto-generate cheque dates from lease payment schedule
  - [ ] Auto-distribute equal amounts when applicable
  - [ ] Live total calculation: header total = sum of grid rows
  - [ ] Validation warnings shown inline before posting
  - [ ] Print receipt button: generates PDF with all cheque details, QR code placeholder, tenant signature block

#### Frontend — PDC Received Register
- [ ] Create pages/PDCReceivedRegister.tsx
  - [ ] Searchable/filterable register: Property, Tenant, Cheque No., Bank, Cheque Date, Amount, Status
  - [ ] Filter by status: Received / Held / Due Soon / Submitted / Cleared / Returned / Replaced
  - [ ] Status-change action buttons per row: Deposit, Clear, Return, Replace, Cancel
  - [ ] Status change requires reason (mandatory for Replace / Cancel)
  - [ ] Cheque replacement form: links new cheque to returned cheque, preserves history
  - [ ] Cheque return form: return date, reason, bank charges, follow-up action

---

### Sprint 6 — PDC Issued Register

#### Backend
- [ ] Create schemas/pdc_issued.py — ChequeBook, ChequeLeaf, PDCIssued, AuthorizedSignatory
- [ ] Create api/endpoints/pdc_issued.py

##### PDC Issued Validation Rules
- [ ] Block duplicate issued cheque numbers across all bank accounts
- [ ] Cheque must belong to correct company bank account
- [ ] Must link to at least one of: payment voucher, loan instalment, invoice, LPO
- [ ] Block issue against unapproved expense (unless authorized override)
- [ ] Cheque leaf status must be Available before issuing
- [ ] On issue: update cheque leaf status to Issued

##### Cheque Book Register
- [ ] API to register new cheque book (bank account, series from/to)
- [ ] API to view cheque leaves by status: Available / Issued / Cancelled / Damaged
- [ ] API to record damaged or cancelled leaves

##### Authorized Signatories
- [ ] API to add/remove signatories per bank account
- [ ] Signatory limit field — max cheque value they can authorize

#### Frontend
- [ ] Create pages/PDCIssuedRegister.tsx
  - [ ] Issuance form: Payee, Type, Property Link, Cheque No. (from cheque book), Bank Account, Date, Amount, Purpose, Approval workflow
  - [ ] Cheque book register view: available leaves per account
  - [ ] Filter by: Payee Type (Supplier / Bank / Contractor / Loan Provider), Status, Date range
  - [ ] Approval workflow: Accountant prepares — MD approves (pending PM decision on threshold)
  - [ ] Handover tracking: date issued, acknowledged by
- [ ] Create pages/ChequebookRegister.tsx — manage cheque books, view leaf status

---

### Sprint 7 — AI Smart Alert Engine

#### PM Requirement: Alerts are configurable, not hardcoded

#### Backend — Alert Engine
- [ ] Create services/alert_engine.py using APScheduler
- [ ] Daily job: scan pdc_received for cheques where cheque_date is within alert days
- [ ] Daily job: scan pdc_issued for cheques due within alert days
- [ ] Alert day thresholds read from system_settings table (not hardcoded)
- [ ] Default alert days: 30, 14, 7, 3, 0 (on date), overdue

##### Alert Conditions — PDC Received (all required)
- [ ] 30 days before cheque date
- [ ] 14 days before cheque date
- [ ] 7 days before cheque date
- [ ] 3 days before cheque date
- [ ] On cheque date
- [ ] After cheque date if status is not Submitted/Deposited/Cleared (overdue alert)
- [ ] Submitted to bank but not confirmed as Cleared after 5 business days
- [ ] If cheque is Returned or Replaced

##### Alert Conditions — PDC Issued (all required)
- [ ] 30 / 14 / 7 / 3 days before cheque date
- [ ] On cheque date
- [ ] If bank account has insufficient funding information
- [ ] If linked invoice or loan instalment is disputed
- [ ] If cheque remains uncleared after due date

##### Alert Delivery Phases
- [ ] Phase 1: Dashboard notification (in-app) — Build now
- [ ] Phase 2: Email alerts — Pending PM confirmation of email server
- [ ] Phase 3: WhatsApp alerts — Pending PM confirmation

- [ ] Create alert_logs table to record every alert sent (type, recipient, channel, timestamp)

---

### Sprint 8 — Expense Management Module

#### PM Requirement: Two distinct classes — General and Property-Related

#### Backend
- [ ] Create schemas/finance.py — CostCentre, ExpenseCategory, Expense, ExpenseAllocation
- [ ] Create api/endpoints/expenses.py

##### Expense Validation Rules
- [ ] expense_class must be General or Property
- [ ] Property expenses must have property_id
- [ ] If is_shared = True, expense_allocations must exist and sum to 100%
- [ ] Expense cannot be approved without attachment if policy requires (pending PM decision)

##### Expense Allocation Methods (all must work)
- [ ] 100% to one property
- [ ] Percentage allocation across multiple properties
- [ ] Fixed amount per property
- [ ] By unit count (divide total by number of units)
- [ ] By area (divide by floor area in sqft)
- [ ] By ownership share (divide by ownership %)
- [ ] To general cost centre (no property)
- [ ] Residual (remaining after other allocations)

#### Frontend
- [ ] Create pages/ExpenseEntry.tsx
  - [ ] Toggle: General Expense / Property Expense (changes required fields)
  - [ ] For General: Cost Centre, Payee, Category, Invoice details, Payment method, PDC link
  - [ ] For Property: Property, Unit, Category, Maintenance ticket link, LPO link, Supplier, Invoice, PDC link
  - [ ] Shared expense toggle: opens allocation grid (method, property, % or amount per row)
- [ ] Create pages/ExpenseList.tsx
  - [ ] Side-by-side view: General Expenses | Property Expenses (PM requirement — must appear separately)
  - [ ] Filter by: Category, Property, Date range, Approval status, Payment method
  - [ ] Approval action: Pending to Approved / Rejected

---

### Sprint 9 — PDC Finance Dashboard (PM Requirement)

#### PDCs Received Panel
- [ ] Total PDCs held — count + total AED value
- [ ] Due This Week (count + value)
- [ ] Due This Month (count + value)
- [ ] Submitted to Bank
- [ ] Cleared this month
- [ ] Returned this month
- [ ] Replaced this month
- [ ] Overdue for deposit (past cheque date, not yet deposited)

#### PDCs Issued Panel
- [ ] Total issued and uncleared (count + value)
- [ ] Due This Week / This Month
- [ ] Breakdown by payee type: Supplier / Contractor / Bank (Loan) / Property / General Expense
- [ ] Bank-account-wise commitment summary

#### Cash-Flow View (PM Requirement)
- [ ] Table/chart comparing: Expected Incoming PDCs, Upcoming Issued PDCs, Loan Instalments due, Property Expenses due, General Expenses due, Estimated Available Cash Position
- [ ] Date range filter: This Week / This Month / Next Month / Custom

#### AI Query Support — PDC (PM Example Questions — all must work)
- [ ] "Which tenant cheques are due this week?"
- [ ] "Which PDCs have not been deposited?"
- [ ] "Show returned cheques for the last 6 months"
- [ ] "Which leases have insufficient cheque coverage?"
- [ ] "What is the expected PDC collection for next month?"
- [ ] "How much in issued PDCs is due next month?"
- [ ] "Which bank account has the highest upcoming cheque commitment?"
- [ ] "Show all PDCs issued to financial institutions"
- [ ] "Which issued cheques are linked to property loans?"
- [ ] "Which cheques are due before the next expected rental deposit?"

---

### Sprint 10 — Maintenance Management

#### Backend
- [ ] Create models/maintenance.py — maintenance_tickets, maintenance_categories, maintenance_assignments, maintenance_documents
- [ ] Create schemas/maintenance.py
- [ ] Create api/endpoints/maintenance.py
- [ ] Link maintenance tickets to property expenses
- [ ] Link maintenance tickets to LPO

#### Frontend
- [ ] Create pages/MaintenanceList.tsx
- [ ] Create pages/MaintenanceTicketEntry.tsx

---

### Sprint 11 — Finance & Loans Module

#### Backend
- [ ] Create models/loans.py — loans, loan_instalments, loan_documents, payment_vouchers
- [ ] Link loans to title_deeds (mortgage/LTV data)
- [ ] Link loan instalments to pdc_issued (one PDC per instalment)
- [ ] Link payment vouchers to pdc_issued (mandatory link for all issued cheques)
- [ ] Populate cashflow_commitments from loan instalments

#### Frontend
- [ ] Create pages/LoanList.tsx
- [ ] Create pages/LoanDetail.tsx — instalment schedule, PDC linkage, LTV calculation
- [ ] Create pages/PaymentVoucherEntry.tsx

---

### Sprint 12 — Labour Camp Module

#### Backend
- [ ] Create models/labourcamp.py — labour_camp_units, camp_residents, camp_leases, camp_utility_readings
- [ ] Note: Labour camp process does NOT require PDC (PM stated explicitly)
- [ ] Create api/endpoints/labourcamp.py

#### Frontend
- [ ] Create pages/LabourCampManagement.tsx
- [ ] Capacity and occupancy tracking
- [ ] Utility billing per room

---

### Sprint 13 — AI Chatbot & Investment AI

#### AI Chatbot
- [ ] Integrate Gemini API
- [ ] Context-aware natural language queries against live database
- [ ] Support all PM example questions from PDC, Investment, and Expense sections

#### Investment AI (PM Requirement — specific questions must be answerable)
- [ ] "Which properties have the highest capital appreciation?"
- [ ] "What is our total real estate portfolio value today?"
- [ ] "Compare rental yield versus capital appreciation"
- [ ] "Which properties are underperforming?"
- [ ] "Which investments should be retained for another five years?"
- [ ] "Which loans are close to exceeding our preferred loan-to-value ratio?"

---

### Sprint 14 — Reports, PDF Generation, Testing & UAT

#### Reports
- [ ] Property-wise PDC Received report
- [ ] Bank-account-wise PDC Issued commitment report
- [ ] General Expenses vs. Property Expenses comparison report
- [ ] Shared expense allocation breakdown report
- [ ] Investment portfolio appreciation report (purchase value vs. current value)

#### PDF Generation
- [ ] Receipt voucher PDF — header + cheque detail table + total in words + QR code placeholder + tenant signature block
- [ ] PDC Received register PDF
- [ ] PDC Issued register PDF

#### Acceptance Criteria Testing — PDC Module (all must pass)
- [ ] Tenant lease with 5 PDCs entered and validated against lease payment schedule
- [ ] System alerts users before each cheque date (all thresholds)
- [ ] Received cheque: deposited to cleared to returned to replaced without losing history
- [ ] Supplier PDC linked to approved payment voucher and LPO
- [ ] Loan-related PDC linked to a specific instalment
- [ ] Dashboard displays expected incoming and outgoing cheque values
- [ ] Property-wise PDC reports generated
- [ ] Bank-account-wise issued-cheque commitments generated

#### Acceptance Criteria Testing — Receipt Module (all must pass)
- [ ] One receipt holds at least 5 cheque rows
- [ ] Each cheque row creates a separate pdc_received record
- [ ] Receipt total = sum of all cheque lines (enforced)
- [ ] Duplicate cheque entries blocked
- [ ] Each cheque is independently traceable
- [ ] Each cheque receives its own due-date alerts
- [ ] One cheque returned without affecting others on same receipt
- [ ] Replacement cheque links to returned cheque
- [ ] Receipt printed with all cheque details
- [ ] Posted financial history cannot be deleted by normal user access
- [ ] All changes appear in audit log

#### Acceptance Criteria Testing — Expense Module (all must pass)
- [ ] General expenses and property-related expenses appear separately
- [ ] Shared expenses allocated among multiple properties
- [ ] Every financial status change recorded in audit log

#### Acceptance Criteria Testing — Title Deed Module (all must pass)
- [ ] Purchase value permanently stored and never overwritten
- [ ] Every valuation creates a new history record (no overwrite)
- [ ] Investment dashboard shows appreciation vs. purchase value
- [ ] AI answers portfolio-level investment queries

---

### Pending Business Decisions (Blocked — Awaiting PM Confirmation)

| # | Decision Required | Impact on Development |
|---|---|---|
| 1 | Must cheque images be uploaded before approval is granted? | Receipt posting workflow, mandatory field validation |
| 2 | Does every issued cheque require MD approval, or only above a value threshold? | Approval workflow design |
| 3 | What are the approval limits by role? (e.g. less than AED 5,000 = Accountant, above AED 5,000 = MD) | Approval routing logic |
| 4 | Can the Accountant change cheque dates after approval? | Edit controls on posted records |
| 5 | Who may record a cheque as Cleared? (Accountant only, or MD also?) | Status-change authorization |
| 6 | How should returned-cheque bank charges be handled? (Auto expense entry or manual?) | ChequeReturn model, expense auto-creation |
| 7 | Should blank cheque leaves be tracked in the system? | Cheque book register feature scope |
| 8 | Should general expenses be distributed to properties for profitability reporting? | Expense allocation mandatory vs optional |
| 9 | PDC alerts via: Dashboard only, Email, WhatsApp, or all three? | Alert engine delivery channels and infrastructure |



---

## 22. Module 14 - Document and Workflow Management

### PM Business Recommendation (Version 2.1 Addition)
As the system has evolved into a Real Estate Investment Management Platform, this module centralizes all company and property documents with AI-assisted search, version control, and approval workflows.

### Document Types Managed
| Category | Document Types |
|---|---|
| Legal / Property | Title Deeds, SPA, Mortgage documents, NOC, Ejari |
| Tenant | Lease agreements, Emirates IDs, Passports, Tenancy contracts |
| Finance | Invoices, Payment vouchers, Valuation reports, Bank statements |
| Maintenance | Maintenance photos, Contractor quotes, Completion certificates |
| Insurance | Insurance policies, Renewal certificates |
| Corporate | Company MOA, Trade licences, Board resolutions |

### Key Features
- Centralized document repository linked to all system entities (property, tenant, lease, loan, expense)
- AI OCR indexing - extract key fields from uploaded PDFs automatically
- Version control - every document revision stored with date, uploader, and reason
- Document approval workflows - Draft to Reviewed to Approved to Archived
- AI-assisted search - query documents by content, property, date, or document type
- Expiry tracking - alert when Emirates IDs, insurance, licences, or tenancy contracts are near expiry
- Access control - document visibility by role

### Database Tables - Module 14
| Table | Purpose |
|---|---|
| document_categories | Category master (Title Deed, Invoice, Passport, etc.) |
| documents | Core document record - filename, type, entity link, uploader, status |
| document_versions | Version history - each upload revision stored separately |
| document_approvals | Approval workflow records per document |
| document_expiry_alerts | Expiry dates and alert schedule per document |
| document_ocr_data | Extracted OCR fields stored as JSON per document |

### Entity Links (document can be linked to any of the following)
- property_id
- unit_id
- tenant_id
- lease_id
- title_deed_id
- loan_id
- expense_id
- maintenance_ticket_id
- payment_voucher_id
- owner_id

---

## 23. REST API Specification

### API Standards
- Base URL: `/api/v1/`
- All endpoints require Authorization header: `Bearer {JWT_token}`
- Response format: JSON
- Date format: ISO 8601 (YYYY-MM-DD)
- Currency: AED (stored as DECIMAL 15,2)
- Pagination: `?page=1&limit=50` (default limit: 50, max: 200)
- Sorting: `?sort_by=field&order=asc|desc`
- Filtering: `?status=active&property_id=1`

### HTTP Status Codes
| Code | Meaning |
|---|---|
| 200 | Success - GET / PUT returned data |
| 201 | Created - POST succeeded |
| 204 | No Content - DELETE succeeded |
| 400 | Bad Request - validation error |
| 401 | Unauthorized - token missing or expired |
| 403 | Forbidden - insufficient role permission |
| 404 | Not Found |
| 409 | Conflict - duplicate entry |
| 422 | Unprocessable Entity - business rule violation |
| 500 | Internal Server Error |

### Standard Error Response Format
```json
{
  "error": true,
  "code": "DUPLICATE_CHEQUE",
  "message": "Cheque number already exists for this bank account",
  "field": "cheque_number",
  "timestamp": "2026-07-15T12:00:00Z"
}
```

### Standard Paginated Response Format
```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 245,
    "total_pages": 5
  }
}
```

### Core Endpoint Reference

#### Module 01 - Properties
```
GET    /api/v1/properties
POST   /api/v1/properties
GET    /api/v1/properties/{id}
PUT    /api/v1/properties/{id}
GET    /api/v1/properties/{id}/units
POST   /api/v1/properties/{id}/units
```

#### Module 02 - Title Deeds and Investment
```
GET    /api/v1/title-deeds
POST   /api/v1/title-deeds
GET    /api/v1/title-deeds/{id}
PUT    /api/v1/title-deeds/{id}
POST   /api/v1/title-deeds/{id}/valuations        (INSERT only - no PUT on valuations)
GET    /api/v1/title-deeds/{id}/valuations
GET    /api/v1/investment/dashboard
```

#### Module 03 - Ownership
```
GET    /api/v1/owners
POST   /api/v1/owners
GET    /api/v1/ownership-records
POST   /api/v1/ownership-records
PUT    /api/v1/ownership-records/{id}
GET    /api/v1/beneficiary-allocations
POST   /api/v1/beneficiary-allocations
```

#### Module 04 - Tenants and Leases
```
GET    /api/v1/tenants
POST   /api/v1/tenants
GET    /api/v1/tenants/{id}
PUT    /api/v1/tenants/{id}
GET    /api/v1/leases
POST   /api/v1/leases
GET    /api/v1/leases/{id}
POST   /api/v1/leases/{id}/renew
GET    /api/v1/leases/{id}/payment-schedule
POST   /api/v1/leases/{id}/payment-schedule
```

#### Module 05 and 06 - Receipts and PDC Received
```
GET    /api/v1/rental-receipts
POST   /api/v1/rental-receipts
GET    /api/v1/rental-receipts/{id}
POST   /api/v1/rental-receipts/{id}/post
POST   /api/v1/rental-receipts/{id}/reverse
GET    /api/v1/pdc-received
GET    /api/v1/pdc-received/{id}
POST   /api/v1/pdc-received/{id}/deposit
POST   /api/v1/pdc-received/{id}/clear
POST   /api/v1/pdc-received/{id}/return
POST   /api/v1/pdc-received/{id}/replace
```

#### Module 07 - PDC Issued
```
GET    /api/v1/pdc-issued
POST   /api/v1/pdc-issued
GET    /api/v1/pdc-issued/{id}
POST   /api/v1/pdc-issued/{id}/approve
POST   /api/v1/pdc-issued/{id}/issue
POST   /api/v1/pdc-issued/{id}/clear
POST   /api/v1/pdc-issued/{id}/return
GET    /api/v1/cheque-books
POST   /api/v1/cheque-books
GET    /api/v1/cheque-books/{id}/leaves
```

#### Module 08 - Expenses
```
GET    /api/v1/expenses
POST   /api/v1/expenses
GET    /api/v1/expenses/{id}
PUT    /api/v1/expenses/{id}
POST   /api/v1/expenses/{id}/approve
POST   /api/v1/expenses/{id}/reject
GET    /api/v1/expense-categories
POST   /api/v1/expense-categories
```

#### Module 09 - Maintenance
```
GET    /api/v1/maintenance-tickets
POST   /api/v1/maintenance-tickets
GET    /api/v1/maintenance-tickets/{id}
PUT    /api/v1/maintenance-tickets/{id}
POST   /api/v1/maintenance-tickets/{id}/assign
POST   /api/v1/maintenance-tickets/{id}/close
```

#### Module 10 - Loans
```
GET    /api/v1/loans
POST   /api/v1/loans
GET    /api/v1/loans/{id}
PUT    /api/v1/loans/{id}
GET    /api/v1/loans/{id}/instalments
POST   /api/v1/payment-vouchers
GET    /api/v1/payment-vouchers/{id}
```

#### Module 11 - Labour Camp
```
GET    /api/v1/labour-camp/units
POST   /api/v1/labour-camp/units
GET    /api/v1/labour-camp/residents
POST   /api/v1/labour-camp/residents
GET    /api/v1/labour-camp/leases
POST   /api/v1/labour-camp/leases
POST   /api/v1/labour-camp/utility-readings
```

#### Module 14 - Documents
```
GET    /api/v1/documents
POST   /api/v1/documents                           (multipart/form-data file upload)
GET    /api/v1/documents/{id}
PUT    /api/v1/documents/{id}
POST   /api/v1/documents/{id}/versions             (new version upload)
GET    /api/v1/documents/{id}/versions
POST   /api/v1/documents/{id}/approve
GET    /api/v1/documents/expiring                  (documents expiring within N days)
```

#### AI and Alerts
```
POST   /api/v1/ai/query
GET    /api/v1/alerts/active
GET    /api/v1/alerts/history
PUT    /api/v1/alerts/{id}/dismiss
GET    /api/v1/dashboard/finance
GET    /api/v1/dashboard/investment
GET    /api/v1/dashboard/property
GET    /api/v1/dashboard/maintenance
GET    /api/v1/dashboard/labour-camp
```

#### Auth
```
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
POST   /api/v1/auth/refresh
GET    /api/v1/auth/me
PUT    /api/v1/auth/change-password
GET    /api/v1/users
POST   /api/v1/users
PUT    /api/v1/users/{id}
```

### File Upload Standards
- Accepted formats: PDF, JPG, PNG, DOCX, XLSX
- Maximum file size: 25 MB per file
- Storage: Local filesystem (dev) / Cloud object storage (prod)
- Virus scan: Required before saving (prod)
- File naming: UUID-based to prevent conflicts

### API Versioning Policy
- Current version: v1
- Breaking changes require a new version prefix (v2)
- Deprecated endpoints supported for 6 months after new version release
- Version is part of URL path (not header)

---

## 24. Workflow Diagrams

### Lease Lifecycle
```
[New Tenant] --> [Tenant Created] --> [Lease Entry] --> [Payment Schedule Set]
     |
     v
[Receipt Voucher Created] --> [PDCs Entered in Grid] --> [Validated] --> [Posted]
     |
     v
[PDC Records Auto-Created] --> [Alerts Scheduled] --> [Lease Active]
     |
     v
[Near Expiry Alert] --> [Renewal / Termination Decision]
     |                        |
     v                        v
[New Lease Version]     [Lease Terminated]
[New Payment Schedule]  [Security Deposit Returned]
```

### Rental Collection - Multi-Cheque Receipt
```
[Accountant Opens Receipt Entry]
     |
     v
[Select Tenant] --> [System Loads Active Lease + Payment Schedule]
     |
     v
[Enter Receipt Header: Date, Property, Unit, Purpose]
     |
     v
[Enter Payment Detail Grid]
  Row 1: Cheque No. | Bank | Date | Amount
  Row 2: Cheque No. | Bank | Date | Amount
  Row N: ...
     |
     v
[System Validates: Total = Sum of Rows | No Duplicates | All Mandatory Fields]
     |           |
  [PASS]      [FAIL --> Show Inline Error, Block POST]
     |
     v
[Save as Draft] --> [Review] --> [POST Receipt]
     |
     v
[Auto-Create pdc_received record for each cheque line]
     |
     v
[Schedule Alerts: 30 / 14 / 7 / 3 days / On Date / Overdue]
     |
     v
[Generate Receipt PDF + QR code]
```

### PDC Received Lifecycle
```
[Received] --> [Held] --> [Due Soon] --> [Submitted to Bank] --> [Deposited] --> [Cleared]
                                                                      |
                                                               [Returned] --> [Replace?]
                                                                    |              |
                                                               [Charges]    [New Cheque]
                                                               [Follow-up]  [Links to Original]
```

### PDC Issued Lifecycle
```
[Draft] --> [Pending Approval] --> [Approved] --> [Issued to Payee]
                  |                                      |
            [Rejected]                    [Due Soon] --> [Presented] --> [Cleared]
                  |                                      |
            [Revise & Resubmit]                    [Returned] --> [Replace / Stop]
```

### Expense Approval Workflow
```
[Accountant Creates Expense]
     |
     v
[Draft] --> [Submit for Approval]
     |
     v
[Reviewed by MD / Senior Accountant]
     |           |
[Approved]   [Rejected with Reason]
     |
     v
[Posted] --> [Linked to PDC Issued / Payment Voucher]
     |
     v
[Allocated to Properties if Shared Expense]
```

### Maintenance Ticket Lifecycle
```
[Ticket Raised (Tenant / PM / Staff)]
     |
     v
[Categorised] --> [Assigned to Contractor / Staff]
     |
     v
[In Progress] --> [Photos / Documents Attached]
     |
     v
[Completed] --> [Cost Recorded as Property Expense]
     |
     v
[Closed] --> [Linked to LPO if applicable]
```

### Loan Repayment Process
```
[Loan Registered] --> [Instalment Schedule Created]
     |
     v
[Each Instalment] --> [PDC Issued linked to instalment]
     |
     v
[Alert: 30 / 14 / 7 / 3 days before instalment date]
     |
     v
[Cheque Presented] --> [Cleared] --> [Instalment Marked Paid]
     |
     v
[LTV Recalculated] --> [Outstanding Loan Updated]
```

---

## 25. UI Screen Inventory

### Screen Register (Development Checklist)

| # | Module | Screen Name | Route | Status |
|---|---|---|---|---|
| 1 | Auth | Login | /login | Planned |
| 2 | Auth | Change Password | /change-password | Planned |
| 3 | Dashboard | MD Dashboard | /dashboard | Planned |
| 4 | Dashboard | Finance Dashboard | /dashboard/finance | Planned |
| 5 | Dashboard | Investment Dashboard | /dashboard/investment | Planned |
| 6 | Dashboard | Property Dashboard | /dashboard/property | Planned |
| 7 | Dashboard | Maintenance Dashboard | /dashboard/maintenance | Planned |
| 8 | Dashboard | Labour Camp Dashboard | /dashboard/labour-camp | Planned |
| 9 | Dashboard | AI Dashboard | /dashboard/ai | Planned |
| 10 | Property | Property List | /properties | Planned |
| 11 | Property | Property Entry | /properties/new | Planned |
| 12 | Property | Property Detail | /properties/{id} | Planned |
| 13 | Property | Unit List (per property) | /properties/{id}/units | Planned |
| 14 | Title Deed | Title Deed List | /title-deeds | Planned |
| 15 | Title Deed | Title Deed Detail | /title-deeds/{id} | Planned |
| 16 | Title Deed | Property Valuation Entry | /title-deeds/{id}/valuations/new | Planned |
| 17 | Ownership | Ownership List | /ownership | Planned |
| 18 | Ownership | Ownership Detail | /ownership/{id} | Planned |
| 19 | Tenant | Tenant List | /tenants | Planned |
| 20 | Tenant | Tenant Entry | /tenants/new | Planned |
| 21 | Tenant | Tenant Detail | /tenants/{id} | Planned |
| 22 | Lease | Lease Entry | /leases/new | Planned |
| 23 | Lease | Lease Detail | /leases/{id} | Planned |
| 24 | Lease | Payment Schedule | /leases/{id}/schedule | Planned |
| 25 | Finance | Receipt Voucher Entry | /receipts/new | Planned |
| 26 | Finance | Receipt List | /receipts | Planned |
| 27 | Finance | Receipt Detail and Print | /receipts/{id} | Planned |
| 28 | Finance | PDC Received Register | /pdc/received | Planned |
| 29 | Finance | PDC Received Detail | /pdc/received/{id} | Planned |
| 30 | Finance | PDC Issued Register | /pdc/issued | Planned |
| 31 | Finance | PDC Issued Entry | /pdc/issued/new | Planned |
| 32 | Finance | PDC Issued Detail | /pdc/issued/{id} | Planned |
| 33 | Finance | Cheque Book Register | /cheque-books | Planned |
| 34 | Expense | Expense Entry | /expenses/new | Planned |
| 35 | Expense | Expense List | /expenses | Planned |
| 36 | Expense | Expense Detail / Approval | /expenses/{id} | Planned |
| 37 | Maintenance | Maintenance Ticket List | /maintenance | Planned |
| 38 | Maintenance | Maintenance Ticket Entry | /maintenance/new | Planned |
| 39 | Maintenance | Maintenance Ticket Detail | /maintenance/{id} | Planned |
| 40 | Loans | Loan List | /loans | Planned |
| 41 | Loans | Loan Detail | /loans/{id} | Planned |
| 42 | Loans | Payment Voucher Entry | /payment-vouchers/new | Planned |
| 43 | Labour Camp | Labour Camp Management | /labour-camp | Planned |
| 44 | Labour Camp | Resident List | /labour-camp/residents | Planned |
| 45 | Labour Camp | Utility Readings | /labour-camp/utilities | Planned |
| 46 | Documents | Document List | /documents | Planned |
| 47 | Documents | Document Upload | /documents/upload | Planned |
| 48 | Documents | Document Detail / Versions | /documents/{id} | Planned |
| 49 | AI | AI Chat Interface | /ai | Planned |
| 50 | Reports | Report Centre | /reports | Planned |
| 51 | Admin | User Management | /admin/users | Planned |
| 52 | Admin | Role Management | /admin/roles | Planned |
| 53 | Admin | System Settings | /admin/settings | Planned |
| 54 | Admin | Alert Configuration | /admin/alerts | Planned |
| 55 | Admin | Audit Log Viewer | /admin/audit | Planned |

---

## 26. Role Permission Matrix

### Permission Key
- C = Create | R = Read/View | U = Update/Edit | D = Delete (soft only)
- A = Approve | X = Reverse/Cancel | E = Export | P = Print | - = No Access

| Screen / Action | MD | Accountant | Camp Supervisor | Maintenance | Admin |
|---|---|---|---|---|---|
| **Property Master** | | | | | |
| View Properties | R | R | R | R | R |
| Create / Edit Property | C/U | C/U | - | - | C/U |
| Delete Property | D | - | - | - | - |
| Export Property List | E | E | - | - | E |
| **Title Deeds and Investment** | | | | | |
| View Title Deeds | R | R | - | - | R |
| Create / Edit Title Deed | C/U | C/U | - | - | C/U |
| Add Valuation | A | C | - | - | - |
| View Investment Dashboard | R | R | - | - | - |
| **Tenants and Leases** | | | | | |
| View Tenants | R | R | R | - | R |
| Create / Edit Tenant | C/U | C/U | C/U | - | C/U |
| Create Lease | C | C | C | - | C |
| Approve Lease | A | - | - | - | - |
| **Rental Receipts** | | | | | |
| View Receipts | R | R | R | - | R |
| Create Receipt (Draft) | - | C | - | - | - |
| Post Receipt | A | C | - | - | - |
| Reverse Posted Receipt | A | - | - | - | - |
| Cancel Receipt | A | - | - | - | - |
| Print Receipt | P | P | P | - | P |
| Export Receipts | E | E | - | - | E |
| **PDC Received** | | | | | |
| View PDC Received | R | R | - | - | R |
| Deposit Cheque | A | C | - | - | - |
| Mark Cleared | A | C | - | - | - |
| Record Return | A | C | - | - | - |
| Process Replacement | A | C | - | - | - |
| **PDC Issued** | | | | | |
| View PDC Issued | R | R | - | - | R |
| Create PDC Issued (Draft) | - | C | - | - | - |
| Approve PDC Issued | A | - | - | - | - |
| Mark as Issued | - | C | - | - | - |
| Record Return / Stop | A | C | - | - | - |
| **Expenses** | | | | | |
| View Expenses | R | R | - | - | R |
| Create Expense | C | C | - | - | - |
| Approve Expense | A | - | - | - | - |
| Reject Expense | A | - | - | - | - |
| Delete Draft Expense | - | D | - | - | - |
| Export Expenses | E | E | - | - | E |
| **Maintenance** | | | | | |
| View Tickets | R | R | - | R | R |
| Create Ticket | C | C | - | C | C |
| Assign Ticket | A | - | - | - | - |
| Close Ticket | A | - | - | C | - |
| **Loans** | | | | | |
| View Loans | R | R | - | - | R |
| Create / Edit Loan | C/U | C/U | - | - | - |
| Approve Loan Record | A | - | - | - | - |
| **Labour Camp** | | | | | |
| View Labour Camp | R | R | R | - | R |
| Create / Edit Resident | C/U | C/U | C/U | - | C/U |
| Utility Readings | - | C | C | - | - |
| **Documents** | | | | | |
| View Documents | R | R | R | R | R |
| Upload Document | C | C | C | C | C |
| Approve Document | A | - | - | - | - |
| Delete Document | D | - | - | - | D |
| **Reports** | | | | | |
| View All Reports | R | R | - | - | R |
| Export Reports | E | E | - | - | E |
| **AI Assistant** | | | | | |
| Use AI Chat | R | R | R | R | R |
| **Admin** | | | | | |
| User Management | - | - | - | - | C/U/D |
| Role Management | - | - | - | - | C/U |
| System Settings | R/U | - | - | - | R/U |
| Audit Log | R | - | - | - | R |

---

## 27. Approval Workflow Standards

> **PM Recommendation (v3.0):** Formal Approval Workflow Matrix added as required by the Project Manager review. Approval limits use placeholder thresholds — to be confirmed during SRS review.

### Approval Workflow Matrix (PM Required — v3.0)

| Process | Initiated By | Approved By |
|---|---|---|
| Lease Creation | Property Officer / Accountant | MD / Authorized Manager |
| Lease Renewal | Property Officer / Accountant | MD |
| Receipt Posting | Accountant | Accountant (below threshold) / MD (above threshold) |
| PDC Issued (below AED 5,000) | Accountant | Senior Accountant / Auto |
| PDC Issued (above AED 5,000) | Accountant | MD or Finance Authority |
| Expense Approval (below AED 5,000) | Accountant | Auto / Senior Accountant |
| Expense Approval (above AED 5,000) | Accountant | MD |
| Cheque Return Processing | Accountant | MD |
| Reverse Posted Receipt | Accountant | MD (mandatory) |
| Cancel Receipt | Accountant | MD (mandatory) |
| Ownership Change | Accountant | MD |
| New Title Deed Valuation | Accountant | MD (confirmed before dashboard update) |
| New Loan Record | Accountant | MD |
| Document Approval | Any authorized user | MD / PM |
| Payment Voucher | Accountant | MD |
| Maintenance Completion | Maintenance Supervisor | Property Manager |

> **Note:** The AED 5,000 threshold is a placeholder. Confirm actual limits with PM during SRS review before coding the approval routing logic.

### Standard Approval States (All Financial Transactions)
```
Draft --> Submitted --> Reviewed --> Approved --> Posted
                            |
                        Rejected --> (Return to Draft with Reason)
```

### Transactions Requiring Approval

| Transaction | Approver Role | Notes |
|---|---|---|
| Post Rental Receipt | Accountant / MD | Pending PM decision on threshold |
| Approve PDC Issued | MD | Above value threshold (pending PM decision) |
| Reverse Posted Receipt | MD | Always requires MD |
| Cancel Receipt | MD | Always requires MD |
| Approve Expense | MD / Senior Accountant | Depends on amount threshold |
| Process Cheque Return | MD | Immediate alert on return |
| Ownership Change | MD | Change of ownership records |
| New Title Deed Valuation | MD | Confirmed before investment dashboard update |
| Approve Loan Record | MD | New loans require MD sign-off |
| Approve Document | MD / PM | For key compliance documents |

### Reversal and Cancellation Rules
- Posted receipts can only be reversed — never deleted
- Reversal creates an equal and opposite credit record
- All reversals recorded in audit_log with mandatory reason, approver, and timestamp
- Normal users (Accountant) cannot reverse — only MD / Admin authorized
- All reversal history preserved permanently

---

## 28. Notification and Alert Recipient Matrix

### Delivery Channels (Pending PM Decision)
Planned channels: Dashboard notification, Email, WhatsApp, SMS

### Alert Recipient Matrix

| Alert Event | MD | Accountant | Camp Supervisor | Maintenance | Notes |
|---|---|---|---|---|---|
| PDC Received - 30 days before | Optional | YES | - | - | Early warning |
| PDC Received - 14 days before | YES | YES | - | - | Standard alert |
| PDC Received - 7 days before | YES | YES | - | - | Urgent |
| PDC Received - 3 days before | YES | YES | - | - | Critical |
| PDC Received - Due Today | YES | YES | - | - | Action required |
| PDC Received - Overdue | YES | YES | - | - | Escalation |
| Cheque Returned | YES | YES | - | - | Immediate |
| PDC Issued - 14 days before | YES | YES | - | - | Standard |
| PDC Issued - 7 days before | YES | YES | - | - | Urgent |
| PDC Issued - Due Today | YES | YES | - | - | Action required |
| PDC Issued - Returned | YES | YES | - | - | Immediate |
| Lease Expiry - 90 days | YES | YES | - | - | Renewal planning |
| Lease Expiry - 30 days | YES | YES | - | - | Action required |
| Loan Instalment Due | YES | YES | - | - | 14 / 7 / 3 days |
| Maintenance Ticket Assigned | - | - | - | YES | Immediate |
| Maintenance Ticket Overdue | YES | - | - | YES | Escalation |
| Expense Pending Approval | YES | - | - | - | Immediate |
| Document Expiry Alert | YES | YES | - | - | 60 / 30 days |
| Emirates ID Expiry | YES | YES | YES | - | 90 / 30 days |
| Insurance Expiry | YES | YES | - | - | 60 / 30 days |
| System Error / Backup Failure | - | - | - | - | Admin only |

---

## 29. Backup and Disaster Recovery

### Backup Schedule
| Backup Type | Frequency | Retention | Storage |
|---|---|---|---|
| Transaction Log Backup | Every 1 hour | 7 days | Local + Cloud |
| Daily Incremental Backup | Every night at 2:00 AM | 30 days | Local + Cloud |
| Weekly Full Backup | Every Sunday at 1:00 AM | 12 weeks | Local + Cloud |
| Monthly Archive | First Sunday of month | 12 months | Cloud cold storage |
| Uploaded Files Backup | Daily sync | 30 days | Cloud object storage |

### Backup Standards
- All backups encrypted at rest (AES-256)
- Backup completion logged and alert sent on failure
- Backups stored in at least two geographic locations (on-site + cloud)
- Cloud provider: AWS S3 or Azure Blob Storage (to be confirmed)

### Recovery Targets
- Recovery Time Objective (RTO): 4 hours maximum
- Recovery Point Objective (RPO): 1 hour maximum (last hourly log backup)

### Recovery Testing
- Monthly: Restore test on isolated environment
- Quarterly: Full disaster recovery drill

### Disaster Recovery Procedure
1. Identify failure scope (database, application, server, or total)
2. Notify stakeholders immediately
3. Activate standby or cloud environment
4. Restore from latest clean backup
5. Verify data integrity (row counts, audit log completeness)
6. Switch DNS / application URL to restored environment
7. Confirm system operational with key users
8. Document incident and root cause

---

## 30. Security Standards

### Transport Security
- HTTPS only - HTTP requests redirected to HTTPS
- TLS 1.2 minimum (TLS 1.3 preferred)
- Valid SSL certificate from trusted CA - auto-renewed

### Authentication and Session
- JWT-based authentication with refresh token rotation
- Access token expiry: 15 minutes
- Refresh token expiry: 7 days
- Session timeout: 30 minutes of inactivity
- Maximum failed login attempts: 5 (then account locked for 15 minutes)
- MFA: Planned for Version 3.0

### Password Policy
- Minimum 8 characters
- Must contain uppercase, lowercase, number, and special character
- Cannot reuse last 5 passwords
- Forced change every 90 days
- Admin can force immediate password reset

### Data Security
- Sensitive fields encrypted at rest (Emirates ID, passport numbers, bank details)
- File uploads: virus-scanned, stored outside web root
- Database credentials stored in environment variables only
- Secrets management via environment variables / cloud secrets manager

### API Security
- Rate limiting: 100 requests per minute per IP, 1000 per authenticated user
- SQL injection protection: SQLAlchemy ORM with parameterized queries only
- XSS protection: All API responses use Content-Type application/json
- CORS: Whitelist only known frontend origins
- Input validation: Pydantic schemas enforce all input constraints
- File upload: Content-type validation (not just extension), size limit enforced

### Audit and Monitoring
- All authentication events logged
- All data changes logged in audit_logs table
- Suspicious activity alerts: multiple failed logins, new device access
- No sensitive data in error messages or logs

---

## 31. Performance Targets

> **PM Recommendation (v3.0):** Browser compatibility, mobile responsiveness, system availability, and file upload limits added as measurable acceptance criteria.

### Response Time Targets (API level under normal load)

| Operation | Target | Maximum |
|---|---|---|
| Dashboard load (Finance / MD) | Less than 3 seconds | 5 seconds |
| Property / Tenant list (paginated) | Less than 2 seconds | 3 seconds |
| Search results (any module) | Less than 2 seconds | 3 seconds |
| Receipt POST with PDC auto-creation | Less than 2 seconds | 4 seconds |
| PDC status change | Less than 1 second | 2 seconds |
| Expense approval | Less than 1 second | 2 seconds |
| PDF report generation | Less than 10 seconds | 30 seconds |
| AI natural language query | Less than 10 seconds | 20 seconds |
| Document upload (25 MB) | Less than 15 seconds | 30 seconds |
| OCR processing per document | Less than 30 seconds | 60 seconds |
| Alert engine daily run | Less than 5 minutes | 10 minutes |

### Scalability Targets
- Concurrent users supported: 20 initial, scalable to 100
- Database records: Up to 500,000 rows per major table without degradation
- Document storage: Up to 1 TB (cloud object storage — scalable)

### Browser Compatibility (PM Recommendation — v3.0)
| Browser | Minimum Version | Notes |
|---|---|---|
| Google Chrome | 100+ | Primary supported browser |
| Microsoft Edge | 100+ | Secondary supported browser |
| Mozilla Firefox | 100+ | Supported |
| Safari | 15+ | Supported (macOS / iOS) |
| Internet Explorer | Not supported | Deprecated — use Edge instead |

### Mobile Responsiveness (PM Recommendation — v3.0)
| Screen Size | Target Behaviour |
|---|---|
| Desktop (1280px+) | Full feature set — all tables, grids, charts visible |
| Tablet (768px — 1279px) | Optimised layout — key workflows fully usable |
| Mobile (480px — 767px) | Read-only view and basic actions — data entry on desktop preferred |
| Mobile (below 480px) | Minimum readable view — not the primary target |

> **Note:** The primary user interface is desktop/tablet. Mobile access is informational (dashboards, alerts). Heavy data entry (receipt entry, cheque grids) is desktop only.

### System Availability
| Environment | Target Uptime |
|---|---|
| Production | 99.5% per month (approx. 3.6 hours planned downtime) |
| Staging | Best effort — not SLA-bound |
| Maintenance Windows | Sundays 1:00 AM — 4:00 AM (planned downtime window) |

### File Upload Limits
| Parameter | Limit |
|---|---|
| Maximum file size per upload | 25 MB |
| Accepted formats | PDF, JPG, PNG, DOCX, XLSX |
| Maximum files per entity | 50 files |
| Total document storage (initial) | Up to 1 TB (cloud scalable) |

### Optimization Requirements
- All list endpoints use database-level pagination (no full-table loads in memory)
- Database indexes on all foreign keys and frequently filtered columns
- Dashboard KPIs use pre-aggregated views or scheduled refresh
- File serving via CDN or reverse proxy (not directly from FastAPI)

---

## 32. Reporting Catalogue

### Master Report List

| # | Report Name | Module | Format | Description |
|---|---|---|---|---|
| R01 | Property Register | Property | PDF / Excel | Complete list of properties with status |
| R02 | Unit Occupancy Report | Property | PDF / Excel | Vacancy and occupancy by property |
| R03 | Lease Expiry Report | Lease | PDF / Excel | Leases expiring within selected period |
| R04 | Lease Schedule Report | Lease | PDF / Excel | Payment schedules for active leases |
| R05 | Rental Collection Report | Finance | PDF / Excel | Receipts collected by period and property |
| R06 | PDC Received Register | Finance | PDF / Excel | All received PDCs with status |
| R07 | PDC Due Report | Finance | PDF / Excel | PDCs due within selected date range |
| R08 | Returned Cheque Report | Finance | PDF / Excel | All returned cheques with reasons |
| R09 | PDC Issued Register | Finance | PDF / Excel | All issued PDCs with status |
| R10 | Bank Commitment Report | Finance | PDF / Excel | Outstanding issued PDCs by bank account |
| R11 | Expense Analysis Report | Finance | PDF / Excel | Expenses by category / property / period |
| R12 | Shared Expense Allocation Report | Finance | PDF / Excel | Allocation breakdown per property |
| R13 | Cash Flow Forecast | Finance | PDF / Excel | Incoming vs outgoing PDCs and commitments |
| R14 | Investment Portfolio Report | Investment | PDF / Excel | Properties: purchase vs current value |
| R15 | Capital Appreciation Report | Investment | PDF / Excel | Appreciation percentage by property |
| R16 | Rental Yield Report | Investment | PDF / Excel | Net rental yield by property |
| R17 | Profitability Report | Investment | PDF / Excel | Income minus expenses per property |
| R18 | Loan Outstanding Report | Finance | PDF / Excel | All active loans with balance |
| R19 | Loan Instalment Schedule | Finance | PDF / Excel | Payment schedule by loan |
| R20 | Maintenance Summary Report | Maintenance | PDF / Excel | Tickets by status / category / cost |
| R21 | Labour Camp Occupancy Report | Labour Camp | PDF / Excel | Bed / room occupancy and utility costs |
| R22 | Audit Trail Report | Admin | PDF / Excel | All changes within selected period |
| R23 | Owner Beneficiary Report | Ownership | PDF | Income distribution per owner |
| R24 | Document Expiry Report | Documents | PDF / Excel | Documents expiring within selected period |

### Report Access by Role
| Role | Access |
|---|---|
| MD | All reports R01 to R24 |
| Accountant | R01 to R18, R20 to R22, R24 |
| Camp Supervisor | R21 only |
| Maintenance | R20 only |
| Admin | R22, R24 |

---

## 33. Dashboard Catalogue

### MD Dashboard
- Portfolio summary: Total properties, total units, occupied units, vacancy rate
- Financial summary: Total PDCs held, total PDCs issued outstanding, upcoming cash commitments
- Investment KPIs: Portfolio value, capital appreciation, rental yield, ROI
- Alert summary: Critical alerts requiring immediate action
- Recent activity feed

### Finance Dashboard
- PDCs Received panel: By status (Held / Due Soon / Submitted / Cleared / Returned)
- PDCs Issued panel: By status and payee type
- Cash flow chart: Incoming vs outgoing by week or month
- Expense summary: By category (current month)
- Loan instalment calendar: Upcoming payments

### Investment Dashboard
- 8 KPI cards: Total Purchase Value, Current Market Value, Unrealized Gain, Appreciation %, Net Rental Yield %, ROI %, Total Loan Outstanding, Total Equity
- Bar chart: Property-wise Purchase vs Current Value
- Table: Properties ranked by appreciation %
- Properties with value decline highlighted in red

### Property Dashboard
- Occupancy by property (pie or bar chart)
- Lease expiry timeline
- Vacancy trend over last 12 months
- Property-wise income vs expense comparison

### Maintenance Dashboard
- Open tickets by status: New / In Progress / Pending Parts / Completed
- Overdue tickets highlighted
- Maintenance cost trend by month
- Category breakdown (pie chart)

### Labour Camp Dashboard
- Total rooms, total beds, occupied, vacant
- Resident list with contract status
- Utility consumption by room and block
- Occupancy trend

### AI Dashboard
- Natural language query interface
- Recent query history
- Suggested questions for current alerts
- Alert summary with direct links to relevant records

---

## 34. Audit Log Standards

### Purpose
Every financial action, status change, data creation, and deletion must be recorded in the audit_logs table. Audit records are immutable - never updated or deleted.

### Exact Fields Captured

| Field | Data Type | Description |
|---|---|---|
| id | BIGINT AUTO | Unique audit record ID |
| timestamp | DATETIME | Exact server time of action (UTC) |
| user_id | INTEGER | User who performed the action |
| user_name | VARCHAR | Username snapshot at time of action |
| user_role | VARCHAR | Role at time of action |
| ip_address | VARCHAR | Client IP address |
| device_browser | VARCHAR | User-Agent string |
| module | VARCHAR | System module (e.g. PDC_RECEIVED, EXPENSE, RECEIPT) |
| action | VARCHAR | CREATE, UPDATE, DELETE, APPROVE, REVERSE, CANCEL, LOGIN, LOGOUT |
| entity_type | VARCHAR | Table name affected |
| entity_id | INTEGER | Primary key of the record changed |
| entity_reference | VARCHAR | Human-readable reference (e.g. receipt number, cheque number) |
| field_changed | VARCHAR | Specific field that changed (nullable for CREATE) |
| previous_value | TEXT | Value before change (nullable for CREATE) |
| new_value | TEXT | Value after change (nullable for DELETE) |
| reason | TEXT | Mandatory for approvals, reversals, and cancellations |
| session_id | VARCHAR | Session identifier |

### Mandatory Audit Events
- All user login and logout events
- All CREATE actions on financial records
- All UPDATE actions on financial records
- All status changes (PDC, expense, receipt)
- All approval and rejection actions
- All reversal and cancellation actions
- All deletion actions (soft deletes only)
- All file uploads and document approvals
- All system settings changes
- All user account changes (create, deactivate, role change)

---

## 35. Integration Roadmap

### Phase 1 - Current Scope (Internal Only)
- Self-contained system with no external integrations
- Manual data entry for all transactions
- PDF export for external sharing

### Phase 2 - Planned Integrations (Future Releases)

| Integration | Priority | Purpose |
|---|---|---|
| Email (SMTP / SendGrid) | High | Alert delivery, receipt copies, approval notifications |
| WhatsApp Business API | High | PDC alerts and urgent notifications |
| SMS Gateway | Medium | Critical alerts fallback |
| Ejari (RERA) | High | Tenancy contract registration and validation |
| DLD (Dubai Land Department) | High | Title deed verification and ownership transfers |
| Microsoft 365 / Outlook | Medium | Calendar sync for lease expiry and cheque dates |
| Google Workspace | Medium | Alternative to Microsoft 365 |
| Accounting ERP (Tally / Zoho / SAP) | Medium | Financial data export and journal entry sync |
| Banking APIs | Medium | Real-time cheque clearance status |
| RERA | Medium | Regulatory compliance and reporting |

### Phase 3 - Advanced Integrations (Version 3.0+)
| Integration | Purpose |
|---|---|
| DLD eServices API | Automated title deed registration |
| Property valuation APIs | Auto market value updates |
| Credit checking services | Tenant credit verification |
| Insurance APIs | Policy management and renewal |
| Payment gateway | Online rent collection |

---

## 36. Testing Strategy

### Unit Testing
- Framework: pytest (backend), Vitest (frontend)
- Coverage target: 80% minimum for all service and utility functions
- Scope: All business logic functions, validation rules, calculation methods
- Run on every commit via CI pipeline

### API Testing
- Framework: pytest with httpx and FastAPI TestClient
- Scope: All 70+ API endpoints
- Test cases per endpoint: Happy path, validation errors, auth errors, business rule violations
- Run on every commit via CI pipeline

### Integration Testing
- Scope: End-to-end workflows (e.g. create receipt, post, auto-create PDC, alert scheduled)
- Database: Separate test database with seed data
- Run on every pull request

### System Testing
- Full system walkthrough by development team before each sprint release
- All screens and workflows tested
- Cross-browser: Chrome, Edge, Firefox

### User Acceptance Testing (UAT)
- Conducted by: Accountant, PM, MD
- Based on acceptance criteria in Section 20
- Environment: Staging server with real-looking test data
- Sign-off required before production deployment

### Security Testing
- OWASP Top 10 check before production release
- SQL injection testing on all input fields
- XSS testing on all text inputs
- Authentication bypass testing
- File upload security testing

### Performance Testing
- Tool: Locust or k6
- Simulate 20 concurrent users
- Test all dashboard and report endpoints
- Verify all performance targets in Section 31 are met
- Run before each major release

### Backup and Recovery Testing
- Monthly: Restore database backup on isolated environment
- Quarterly: Full disaster recovery simulation
- Document results and recovery time

### Test Data Requirements
- Minimum 5 properties with title deeds and valuations
- Minimum 20 tenants with active leases
- Minimum 100 PDC received records across multiple statuses
- Minimum 50 PDC issued records
- Minimum 50 expense records (general and property)
- At least 1 loan with instalment schedule

---

## 37. Deployment Strategy

### Environments

| Environment | Purpose | Database | URL |
|---|---|---|---|
| Development | Active development and unit testing | SQLite local | localhost:3000 |
| Staging / UAT | Pre-production testing and user acceptance | PostgreSQL cloud | staging.aigpms.internal |
| Production | Live system | PostgreSQL managed cloud | aigpms.company.com |

### Technology Stack - Production
- Backend: FastAPI running on Gunicorn with Uvicorn workers
- Frontend: React build served via Nginx or Vercel
- Database: PostgreSQL managed cloud (AWS RDS or Azure Database)
- File Storage: Cloud object storage (AWS S3 or Azure Blob)
- Process Manager: Systemd or Docker Compose
- Reverse Proxy: Nginx

### Version Control and Branching
- Repository: Git (GitHub or GitLab)
- Branching: GitFlow
  - main = production-ready code only
  - develop = integration branch
  - feature/* = individual feature branches
  - hotfix/* = urgent production fixes
- Pull request required for all merges to develop and main
- Code review required before merge

### Release Procedure
1. Feature complete on feature/* branch
2. Pull request to develop - code review
3. Integration tests pass on develop
4. Merge develop to release/* branch
5. Deploy to staging environment
6. UAT sign-off obtained
7. Merge release/* to main
8. Tag release version (e.g. v2.1.0)
9. Deploy to production
10. Smoke test on production
11. Notify stakeholders of release

### Rollback Procedure
1. Identify issue in production
2. Decision: Hotfix or rollback?
3. If rollback: Deploy previous tagged version from main
4. Restore database backup if schema changes were involved
5. Verify system operational
6. Create incident report

---

## Sprint 15 - Document and Workflow Management Module

### Backend
- [ ] Create models/documents.py - document_categories, documents, document_versions, document_approvals, document_expiry_alerts, document_ocr_data
- [ ] Create schemas/documents.py
- [ ] Create api/endpoints/documents.py
  - [ ] POST /api/v1/documents (multipart/form-data upload)
  - [ ] GET /api/v1/documents (filtered list with search)
  - [ ] GET /api/v1/documents/{id}
  - [ ] POST /api/v1/documents/{id}/versions (new version upload)
  - [ ] POST /api/v1/documents/{id}/approve
  - [ ] GET /api/v1/documents/expiring
- [ ] Link documents to all entity types (property, tenant, lease, loan, expense, maintenance)
- [ ] Implement OCR field extraction using Google Document AI or Tesseract
- [ ] Implement document expiry alert scheduling
- [ ] Add document search to AI assistant

### Frontend
- [ ] Create pages/DocumentList.tsx - searchable, filterable document library
- [ ] Create pages/DocumentUpload.tsx - drag-and-drop upload with entity link selection
- [ ] Create pages/DocumentDetail.tsx - version history, approval status, expiry info, OCR data
- [ ] Add document attachment UI to all relevant screens (Property, Tenant, Lease, Loan, Expense, Maintenance)

---

## 38. Master Data and Configuration Module

> **PM Recommendation (v3.0):** Introduce a dedicated Master Data and Configuration module to centralize all lookup tables. This improves consistency across modules and simplifies administration.

### Purpose
The Master Data and Configuration module maintains all reference data used across the system. Every dropdown list, category selector, bank name, and approval limit in any other module draws from this centralized store. Updating a value here instantly reflects across all modules.

### Database Tables — Module 15

| Table | Purpose |
|---|---|
| master_banks | Bank master — name, SWIFT code, country, UAE branches |
| master_communities | Community and development names (e.g. Downtown Dubai, JBR, Business Bay) |
| master_emirates | Emirates and regions (Dubai, Abu Dhabi, Sharjah, Ajman, RAK, Fujairah, UAQ) |
| master_property_types | Property type categories (Apartment, Villa, Labour Camp, Commercial, Land) |
| master_expense_categories | Expense category master linked to expense_class (General or Property) |
| master_maintenance_categories | Maintenance category and priority levels |
| master_payment_methods | Payment methods (Cash, Cheque, Bank Transfer, Card, PDC, Other) |
| notification_templates | Configurable alert message templates per event type |
| ai_prompt_templates | Stored AI query templates for common business questions |
| approval_limits | Role-based approval thresholds (amount per role per transaction type) |

### Key Fields — approval_limits

| Field | Description |
|---|---|
| role_id | Role this limit applies to |
| transaction_type | EXPENSE, PDC_ISSUED, RECEIPT_POST, PAYMENT_VOUCHER |
| min_amount | Minimum amount for this limit tier |
| max_amount | Maximum amount (NULL = unlimited) |
| requires_approval_from | Role ID of approver required at this tier |
| auto_approve | True if no manual approval needed below this amount |

### REST API Endpoints — Module 15

```
GET    /api/v1/master/banks
POST   /api/v1/master/banks
PUT    /api/v1/master/banks/{id}

GET    /api/v1/master/communities
POST   /api/v1/master/communities

GET    /api/v1/master/emirates

GET    /api/v1/master/property-types
POST   /api/v1/master/property-types

GET    /api/v1/master/expense-categories
POST   /api/v1/master/expense-categories
PUT    /api/v1/master/expense-categories/{id}

GET    /api/v1/master/maintenance-categories
POST   /api/v1/master/maintenance-categories

GET    /api/v1/master/payment-methods

GET    /api/v1/master/notification-templates
PUT    /api/v1/master/notification-templates/{id}

GET    /api/v1/master/ai-prompts
POST   /api/v1/master/ai-prompts

GET    /api/v1/master/approval-limits
POST   /api/v1/master/approval-limits
PUT    /api/v1/master/approval-limits/{id}
```

### UI Screens — Module 15

| # | Screen Name | Route | Access |
|---|---|---|---|
| M15-1 | Master Data Management Hub | /admin/master-data | Admin |
| M15-2 | Banks | /admin/master-data/banks | Admin |
| M15-3 | Communities | /admin/master-data/communities | Admin |
| M15-4 | Property Types | /admin/master-data/property-types | Admin |
| M15-5 | Expense Categories | /admin/master-data/expense-categories | Admin |
| M15-6 | Maintenance Categories | /admin/master-data/maintenance-categories | Admin |
| M15-7 | Payment Methods | /admin/master-data/payment-methods | Admin |
| M15-8 | Notification Templates | /admin/master-data/notifications | Admin / MD |
| M15-9 | AI Prompt Templates | /admin/master-data/ai-prompts | Admin |
| M15-10 | Approval Limits Configuration | /admin/master-data/approval-limits | Admin / MD |

### Initial Seed Data (Sprint 1 — to be pre-loaded)

**Banks (UAE):**
Emirates NBD, Abu Dhabi Commercial Bank (ADCB), Dubai Islamic Bank (DIB), First Abu Dhabi Bank (FAB), Mashreq Bank, HSBC UAE, Standard Chartered UAE, RAK Bank, Commercial Bank of Dubai, Sharjah Islamic Bank

**Emirates:**
Dubai, Abu Dhabi, Sharjah, Ajman, Ras Al Khaimah, Fujairah, Umm Al Quwain

**Property Types:**
Apartment, Villa, Townhouse, Labour Camp, Commercial Office, Retail Unit, Warehouse, Land Plot, Penthouse, Studio

**Payment Methods:**
Cash, Post-Dated Cheque (PDC), Current-Dated Cheque, Bank Transfer, Credit Card, Debit Card, Online Payment, Other

### Development Tasks — Module 15 (Sprint 1 Extension)

#### Backend
- [ ] Create models/master_data.py — all 10 master tables
- [ ] Create schemas/master_data.py — Pydantic schemas for each table
- [ ] Create api/endpoints/master_data.py — CRUD for all tables
- [ ] Register master data router in main.py under /api/v1/master
- [ ] Create database seed script — populate initial banks, emirates, property types, payment methods

#### Frontend
- [ ] Create pages/admin/MasterDataHub.tsx — central admin panel for all lookups
- [ ] Create pages/admin/BankMaster.tsx — bank list with add/edit
- [ ] Create pages/admin/ExpenseCategoryMaster.tsx — category list with class filter
- [ ] Create pages/admin/ApprovalLimits.tsx — role-by-role threshold configuration
- [ ] Create pages/admin/NotificationTemplates.tsx — editable alert message templates
- [ ] Ensure all module dropdowns (Bank, Property Type, Community, Expense Category, Payment Method) pull from master data API — not hardcoded values

---

## 39. Version History

> This section records all major versions of the AIGPMS Implementation Plan from inception to current baseline.

| Version | Date | Summary of Changes |
|---|---|---|
| 1.0 | July 2026 | Initial plan — core modules: Property, Tenant, Lease, Receipt, Expenses, Maintenance |
| 2.0 | July 2026 | PM-approved enhancements: Title Deed, Investment Dashboard, PDC Modules (Received and Issued), Expense classification, AI alerts, Loan Management, Labour Camp |
| 2.1 | July 2026 | Extended plan: Document Management (Module 14), REST API Specification, Workflow Diagrams, UI Screen Inventory, Role Permission Matrix, Approval Workflow Standards, Notification Matrix, Backup and DR, Security Standards, Performance Targets, Reporting Catalogue, Dashboard Catalogue, Audit Log Standards, Integration Roadmap, Testing Strategy, Deployment Strategy |
| 3.0 | July 2026 | PM Final Review Incorporated: (1) Formal Approval Workflow Matrix — Process / Initiated By / Approved By, (2) Master Data and Configuration Module 15 — Banks, Communities, Emirates, Property Types, Expense Categories, Payment Methods, Notification Templates, AI Prompts, Approval Limits, (3) Document Management confirmed complete, (4) Security confirmed with MFA roadmap for v3.0, (5) Non-Functional Requirements expanded — browser compatibility, mobile responsiveness, system availability, file upload limits, (6) Sprint Plan restructured into PM-recommended 10-sprint format with milestones |

---

*Document Version: 3.0*
*Last Updated: July 2026*
*Project: AI Powered Gateway Property Management System (AIGPMS)*
*Status: PM Technically Approved — Baseline Implementation Document*
*Next Step: Software Requirements Specification (SRS) to be developed alongside this document*
