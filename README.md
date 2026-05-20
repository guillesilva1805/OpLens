# OpsLens — Inventory Exception Tracker

A compact, browser-based tool for surfacing inventory exceptions, prioritizing follow-up, and reducing manual review overhead in warehouse operations.

Built as a portfolio project to demonstrate practical operations tooling: exception detection logic, prioritized queuing, and lightweight process discipline — all without a backend.

---

## What It Does

OpsLens scans an inventory dataset and flags every SKU that requires attention. It tells the operator **what is wrong**, **why it was flagged**, and **what to do next**.

| Exception | Description |
|---|---|
| **Stockout Risk** | Days of cover < supplier lead time — order now or face a stockout |
| **Low Stock** | On-hand quantity at or below reorder point or safety stock |
| **Count Mismatch** | Physical count differs from system record — investigate or adjust |
| **Aging / No Movement** | No inventory movement in 30, 60, or 90+ days — review for markdown or write-off |
| **Manual Review** | Data quality issues: missing, invalid, or negative field values |

---

## Key Features

- **Prioritized exception queue** — Critical → High → Medium, with sortable columns and inline status updates
- **Search and filter** — By exception type, priority, status, or free-text SKU/description
- **Item detail panel** — Full record view, calculated metrics (days of cover, aging days), and suggested next action
- **Follow-up tracking** — Per-SKU notes and status (New / In Review / Waiting / Resolved) saved to browser localStorage
- **CSV import** — Upload your own data; the engine parses, validates, and processes it client-side
- **Demo dataset** — 28 SKUs covering all five exception types, ready to explore in seconds

---

## Architecture

| Layer | Choice |
|---|---|
| Framework | React 18 + TypeScript |
| Build | Vite 4 |
| Styling | Tailwind CSS 3 |
| CSV parsing | PapaParse |
| Persistence | localStorage (browser) |
| Backend | None |

Pure client-side. No server, no database, no authentication. Data never leaves the browser.

---

## Exception Engine

The engine applies five deterministic, threshold-based rules to each SKU record. Rules are evaluated independently, so a single SKU can carry multiple exceptions. The highest-priority exception drives the primary flag.

**Stockout Risk** is triggered when `on_hand_qty / avg_daily_usage < lead_time_days`. Critical if days of cover < 3.

**Low Stock** is triggered when `on_hand_qty ≤ reorder_point` (or safety stock when reorder point is absent). High priority if at or below safety stock level.

**Count Mismatch** is triggered when `system_qty ≠ counted_qty`. High priority when variance exceeds 10% or 20 units.

**Aging** is triggered when `last_movement_date` is 30+ days ago. Medium at 30 days, high at 60, critical at 90+.

**Manual Review** is triggered by data quality problems: missing on_hand_qty, negative values, invalid dates, or missing SKU/location.

---

## CSV Format

Required columns: `sku`, `location`, `on_hand_qty`

Optional columns (enable additional exception rules): `description`, `category`, `reorder_point`, `safety_stock`, `avg_daily_usage`, `lead_time_days`, `system_qty`, `counted_qty`, `open_po_qty`, `last_movement_date`

Column names are normalized to lowercase. Extra columns are ignored.

---

## Running Locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. Click **Use Demo Data** to start immediately.

---

## Project Context

Built to demonstrate practical operations judgment — not just coding ability.

The focus was on building something operationally credible: rules that make sense to a warehouse manager, output that is explainable and auditable, and a workflow that fits how daily exception reviews actually happen.

**What this is:** A lightweight internal ops tool. Simple. Focused. Useful.

**What this is not:** An ERP, a WMS, an AI product, or a startup pitch.
