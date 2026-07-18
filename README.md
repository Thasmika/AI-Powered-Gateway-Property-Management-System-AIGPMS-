# AI Powered Gateway Property Management System (AIGPMS)

Welcome to the **AI Powered Gateway Property Management System (AIGPMS)**. 

AIGPMS is a full-stack enterprise platform designed to manage a comprehensive real estate portfolio. Evolving beyond a traditional Property Management System, it serves as a complete **Real Estate Investment Management Platform** with AI-driven insights.

## 🏢 System Overview

The platform manages real estate operations across five key pillars:
- **Operational:** Tenancy, rental collection, maintenance, and labour camp management.
- **Financial:** Comprehensive Post-Dated Cheque (PDC) management (received and issued), expense tracking, loan management, and payment vouchers.
- **Legal:** Title deeds, ownership records, and beneficiary allocations.
- **Investment:** Portfolio valuation, capital appreciation, and ROI analysis.
- **AI-Powered:** Smart alerts, natural language queries, and investment analysis using the Google Gemini API.

## 🛠️ Technology Stack

### Backend
- **Framework:** FastAPI (Python)
- **ORM:** SQLAlchemy 2.0
- **Database:** SQLite (Development) / PostgreSQL (Production)
- **Migrations:** Alembic
- **Authentication:** JWT (python-jose)
- **Background Jobs:** APScheduler
- **AI Integration:** Google Gemini API

### Frontend
- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite
- **UI Library:** Material UI (MUI) v5
- **Routing:** React Router v6
- **HTTP Client:** Axios
- **Charting:** Recharts / MUI X Charts

## 🚀 Key Modules
1. **Property Master:** Core property and unit records.
2. **Title Deed & Investment:** Legal identities and investment KPI dashboards (ROI, Capital Appreciation).
3. **Ownership & Beneficiaries:** Co-owner shares and income distribution.
4. **Tenants & Leases:** Lease version control and payment schedules.
5. **Rental Collection:** Multi-cheque receipt vouchers.
6. **PDC Received & Issued Registers:** Independent lifecycle tracking for financial instruments.
7. **Expense & Maintenance Management:** General/Property expenses and maintenance ticketing.
8. **Finance & Loans:** Loan instalments linked to PDC issuance.
9. **Labour Camp Management:** Capacity, occupancy, and utility billing.
10. **AI Assistant & Alerts:** Proactive notifications and natural language data querying.

## 🔒 Security & Access
Role-based access control (RBAC) ensures data security across different levels of management, including Managing Director (MD), Accountant, Camp Supervisor, Maintenance Staff, and Administrator roles. The system features an immutable audit log for all financial and property records.

---
*Developed for optimal property and investment management.*
