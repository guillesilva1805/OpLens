---
name: inventory-exception-engine
description: Detects and classifies inventory exceptions from structured SKU data. Returns enriched records with exception types, priority, reason, and suggested action. Use this skill whenever inventory records need to be scanned for operational issues that require human attention.
---

# Inventory Exception Engine Skill

## When to Use This Skill

Use this skill when:
- A set of inventory records needs to be evaluated for operational exceptions
- You need to produce a prioritized queue of items requiring attention
- You are building or modifying the OpsLens exception detection logic
- You need to validate exception logic rules or add a new exception type

---

## Expected Input Fields

| Field | Type | Required | Description |
|---|---|---|---|
| sku | string | yes | Unique product identifier |
| location | string | yes | Warehouse or bin location |
| description | string | no | Human-readable product name |
| category | string | no | Product category |
| on_hand_qty | number | yes | Current on-hand inventory quantity |
| reorder_point | number | no | Quantity at which reorder is triggered |
| safety_stock | number | no | Minimum buffer stock quantity |
| avg_daily_usage | number | no | Average units consumed per day |
| lead_time_days | number | no | Days from order to receipt |
| system_qty | number | no | System-recorded quantity |
| counted_qty | number | no | Physically counted quantity |
| open_po_qty | number | no | Quantity on open purchase orders |
| last_movement_date | string (ISO date) | no | Date of last inventory movement |

**Minimum viable import:** sku, location, on_hand_qty

---

## Five Exception Types

### 1. Low Stock (`low_stock`)

**Trigger:** `on_hand_qty <= reorder_point`
- If `reorder_point` is missing, use `safety_stock` if available as the threshold.
- If both are missing, do not flag as low stock.

**Priority:** medium (default), high if `on_hand_qty <= safety_stock`

**Reason pattern:** "On hand ({X}) is at or below reorder point ({Y})"

**Suggested action:** "Create replenishment order or expedite open PO"

---

### 2. Stockout Risk (`stockout_risk`)

**Trigger:**
- Compute `days_of_cover = on_hand_qty / avg_daily_usage` when `avg_daily_usage > 0`
- Flag if `days_of_cover < lead_time_days`
- If `lead_time_days` is missing, flag if `days_of_cover < 7`

**Priority:** high (default), critical if `days_of_cover < 3`

**Reason pattern:** "Days of cover ({X} days) is less than lead time ({Y} days)"

**Suggested action:** "Expedite replenishment — stockout risk within lead time window"

---

### 3. Count Mismatch (`count_mismatch`)

**Trigger:** `system_qty` and `counted_qty` both exist AND `system_qty !== counted_qty`

**Priority:** medium (default), high if absolute variance > 10% of system_qty or > 20 units

**Reason pattern:** "System qty ({X}) does not match counted qty ({Y}) — variance of {Z} units"

**Suggested action:** "Investigate discrepancy and perform recount or inventory adjustment"

---

### 4. Aging / No Movement (`aging`)

**Trigger:** Days since `last_movement_date` exceeds threshold
- 30+ days → medium
- 60+ days → high
- 90+ days → critical

**Priority:** See thresholds above.

**Reason pattern:** "No movement recorded for {N} days (last: {date})"

**Suggested action:** "Review for markdown, return, or write-off"

---

### 5. Manual Review Needed (`manual_review`)

**Trigger:** Any of the following:
- `on_hand_qty` is missing, negative, or non-numeric
- `sku` or `location` is empty or missing
- `last_movement_date` is present but unparseable
- `system_qty` or `counted_qty` is negative
- `avg_daily_usage` is negative
- Any internally inconsistent values

**Priority:** medium by default; high if `sku` or `location` is missing or invalid.

**Reason pattern:** "Record has {list of issues} — data quality review required"

**Suggested action:** "Correct data entry issues before acting on this record"

---

## Priority Logic

| Priority | Description |
|---|---|
| critical | Immediate action required — stockout imminent or 90+ day aging |
| high | Urgent — approaching stockout, large variance, or 60+ day aging |
| medium | Needs attention soon |
| low | Informational — no action required at this time |

When multiple exceptions are present, the `primary_exception_type` is chosen by the highest-priority exception. If priorities are tied, prefer in this order: stockout_risk > low_stock > count_mismatch > aging > manual_review.

---

## Output Shape

Each processed record must return:

```ts
{
  // All original fields preserved
  ...originalRecord,

  // Derived metrics
  days_of_cover?: number,         // on_hand_qty / avg_daily_usage
  aging_days?: number,            // days since last_movement_date

  // Exception output
  exception_types: string[],      // e.g. ["low_stock", "stockout_risk"]
  primary_exception_type: string, // highest-priority exception type
  priority: 'critical' | 'high' | 'medium' | 'low' | 'none',
  reason: string,                 // human-readable explanation
  suggested_action: string,       // recommended next step

  // Follow-up tracking (from localStorage)
  status: 'New' | 'In Review' | 'Waiting' | 'Resolved',
  note: string,
}
```

Records with zero exceptions should still be returned with `exception_types: []`, `priority: 'none'`, and `reason: 'No exceptions detected'`.

---

## Design Constraints

- **Simple and explainable**: Every exception must have a clear, readable reason string.
- **Auditable**: Rules must be deterministic and traceable to their inputs.
- **Ops-friendly**: Avoid ML, scoring models, or probabilistic flags. Use threshold-based logic only.
- **Graceful with missing data**: Never throw on missing optional fields. Silently skip rules that require unavailable inputs.
- **No side effects**: The engine is a pure function — takes records in, returns enriched records out.
- **Separation of concerns**: The engine does not touch UI, localStorage, or routing. Persistence is handled separately.
