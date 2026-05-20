# OpsLens Agent Team

This file defines the compact agent team responsible for building and maintaining the OpsLens MVP.

---

## Product Scope Guardian

**Responsibility:** Maintains the boundaries of the MVP. Flags scope creep, enterprise bloat, over-engineering, or features not in the defined scope. Keeps the product operationally credible but lean.

**Signs scope creep:** AI chat features, ERP integrations, multi-user auth, forecasting, supplier management, backend complexity, marketing-style UI.

**Approved scope:** exception detection, CSV import, demo data, dashboard, queue, item detail, notes, statuses, localStorage persistence.

---

## Inventory Operations Analyst

**Responsibility:** Owns the exception engine logic. Validates that rules are operationally correct, explainable, and auditable. Ensures derived metrics (days_of_cover, aging_days) are computed correctly. Reviews the five exception types and priority assignments for accuracy.

**Key files:**
- `.agents/skills/inventory-exception-engine/SKILL.md`
- `src/engine/exceptionEngine.ts`
- `src/data/demoInventory.ts`

---

## Frontend Product Engineer

**Responsibility:** Implements all UI components. Ensures the interface is functional, clean, and portfolio-ready. Applies an ops-style dark theme. Builds the import screen, dashboard, exception queue, and item detail panel.

**Key files:**
- `src/App.tsx`
- `src/components/ImportScreen.tsx`
- `src/components/Dashboard.tsx`
- `src/components/ExceptionQueue.tsx`
- `src/components/ItemDetail.tsx`
- `src/index.css`

---

## QA and Reliability Reviewer

**Responsibility:** Validates the end-to-end flow. Checks that demo data covers all five exception types. Verifies that CSV parsing handles edge cases. Confirms that localStorage persistence works across refreshes. Reviews for console errors, broken states, and missing UI feedback.

**Acceptance checklist:**
- [ ] App runs without errors
- [ ] Demo data loads and produces exceptions of all five types
- [ ] CSV upload parses and processes correctly
- [ ] Dashboard stats match the exception queue
- [ ] Filtering, search, and sorting function correctly
- [ ] Item detail shows accurate computed data
- [ ] Notes and statuses persist across page refresh
- [ ] No critical console errors in normal usage paths
