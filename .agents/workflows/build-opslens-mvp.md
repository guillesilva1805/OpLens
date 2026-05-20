---
description: Build OpsLens — Inventory Exception & Replenishment Tracker MVP
---

# OpsLens MVP Build Workflow

## Product Summary
OpsLens is a compact, client-side inventory exception tracking tool. It helps operations teams identify SKUs with low stock, stockout risk, count mismatches, aging inventory, or data quality issues. It is not an ERP, WMS, or AI product — it is a practical, operationally credible portfolio tool.

## Architecture Decision
- React + TypeScript
- Vite (smallest practical scaffold)
- Tailwind CSS
- client-side CSV parsing (PapaParse)
- localStorage for notes and statuses
- No backend

---

## Step 1 — Scaffold the App

```bash
npx -y create-vite@4.4.1 . --template react-ts
npm install
npm install -D tailwindcss@3 postcss autoprefixer
npx tailwindcss init -p
npm install papaparse @types/papaparse
```

Configure tailwind.config.js to include src/**/* paths.
Add Tailwind directives to src/index.css.

---

## Step 2 — Implement Demo Data

Create `src/data/demoInventory.ts` with 25–40 representative SKU records.
Cover all five exception types in the data.
Include records with missing fields to trigger manual review.

---

## Step 3 — Implement the Exception Engine

Use `.agents/skills/inventory-exception-engine/SKILL.md` as the specification.

Create `src/engine/exceptionEngine.ts`:
- Accept raw inventory records
- Apply five exception rules in order
- Compute derived metrics (days_of_cover, etc.)
- Return enriched records with: exception_types, primary_exception_type, priority, reason, suggested_action

---

## Step 4 — Build the Data Import Screen

Create `src/components/ImportScreen.tsx`:
- "Use Demo Data" button
- CSV file upload via drag-drop or file picker
- PapaParse for client-side parsing
- Show column mapping feedback
- Show validation warnings for missing or invalid fields
- On success, pass records to the exception engine and navigate to the dashboard

---

## Step 5 — Build the Dashboard

Create `src/components/Dashboard.tsx`:
- Total SKUs card
- Total exceptions card
- Critical exceptions card
- High-priority count card
- Exception type breakdown (bar or simple list)
- Navigation to exception queue

---

## Step 6 — Build the Exception Queue

Create `src/components/ExceptionQueue.tsx`:
- Table with: SKU, location, description, on hand, reorder point, avg daily usage, days of cover, primary exception, priority, reason, suggested action, status, note indicator
- Search input (filters across SKU, description, location)
- Filter by exception type and priority
- Sort by any column
- Quick status update in-row (dropdown: New / In Review / Waiting / Resolved)
- Click row to open item detail

---

## Step 7 — Build the Item Detail Panel

Create `src/components/ItemDetail.tsx` (side panel or modal):
- Full record fields
- Exception types and primary exception
- Derived metrics (days of cover, aging days)
- Reason and suggested action
- Status dropdown
- Free-text note field
- Note auto-saves to localStorage

---

## Step 8 — Persistence Layer

Create `src/storage/localStore.ts`:
- saveNote(sku, location, note)
- saveStatus(sku, location, status)
- getNote(sku, location)
- getStatus(sku, location)
- Uses localStorage with a namespaced key per SKU+location

---

## Step 9 — Wire Everything Together

Update `src/App.tsx` to manage:
- active data source (demo or uploaded)
- processed exception records
- navigation between Import, Dashboard, Queue, Detail

---

## Step 10 — Validate End-to-End

- [ ] App runs with `npm run dev`
- [ ] Demo data loads and processes correctly
- [ ] All five exception types appear in output
- [ ] CSV upload parses and processes correctly
- [ ] Dashboard stats are accurate
- [ ] Filtering, search, and sorting work
- [ ] Item detail panel opens and shows correct data
- [ ] Notes save and reload from localStorage
- [ ] Status updates persist across page refresh
- [ ] No console errors in happy paths

---

## Step 11 — Polish for Portfolio/Demo

- Ensure consistent styling (dark ops-style theme)
- Add empty state messages
- Add loading/parsing feedback
- Review responsiveness (desktop-first is acceptable)
- Verify README accurately reflects the live app
