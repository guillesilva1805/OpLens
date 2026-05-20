/**
 * Alert threshold configuration for OpsLens notifications.
 * Adjust these values to match your inventory policy.
 */
export const ALERT_THRESHOLDS = {
  // ── Low Stock ──────────────────────────────────────────────────────────────
  // Fallback minimum when no reorder_point or safety_stock exists on the record
  LOW_STOCK_FALLBACK: 10,

  // ── High Stock / Overstock ─────────────────────────────────────────────────
  // When a reorder_point exists, flag if on_hand exceeds ROP × this multiplier
  // (proxy for max stock when no explicit max_stock field is present)
  HIGH_STOCK_ROP_MULTIPLIER: 3,
  // When no reorder_point exists at all, flag if on_hand exceeds this absolute value
  HIGH_STOCK_FALLBACK: 200,

  // ── Slow Movement ──────────────────────────────────────────────────────────
  // Flag items that have had no recorded movement for this many days
  SLOW_MOVEMENT_DAYS: 60,
} as const;
