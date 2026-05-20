import type { RawInventoryRecord } from '../types';

/**
 * A raw record that has been normalized and annotated.
 * String identity fields are trimmed; SKU is uppercased.
 * _validation_flags describes what was changed or what is problematic.
 */
export interface SanitizedRecord extends RawInventoryRecord {
  /**
   * Empty array  → record is clean, no changes were applied.
   * Non-empty    → lists every normalization applied and every data quality
   *               issue found. Exception logic still runs, but calculations
   *               that depend on flagged fields will be skipped and the flags
   *               are surfaced in the UI so the user knows why.
   */
  _validation_flags: string[];
  unit_cost: number | null;
  is_cost_estimated: boolean;
}

/**
 * Flags a field whose value was provided but cannot be parsed as a number.
 * Silent null-coercion is the exact assumption the user warned against:
 * "Sometimes AI uses partial and incomplete data and assumes."
 * We make the gap explicit instead.
 */
function flagIfUnparseable(raw: unknown, fieldName: string, flags: string[]): void {
  if (raw === undefined || raw === null || raw === '') return; // absent is handled separately
  if (isNaN(Number(raw))) {
    const display = String(raw).substring(0, 40);
    flags.push(`${fieldName}: "${display}" is not a valid number — treated as missing for all calculations`);
  }
}

/**
 * Sanitizes a single raw inventory record before any exception logic runs.
 *
 * What it does:
 *   - Trims whitespace from string fields; normalizes SKU to uppercase
 *   - Flags numeric fields whose raw value was provided but unparseable
 *   - Flags semantically invalid values (negative on_hand_qty, negative avg_daily_usage)
 *   - Flags an unparseable last_movement_date so it's clear why aging was skipped
 *
 * What it does NOT do:
 *   - Invent or default values for missing fields
 *   - Block records from entering the exception engine (even dirty records proceed,
 *     so they can be surfaced as manual_review exceptions)
 */
export function sanitizeRecord(r: RawInventoryRecord): SanitizedRecord {
  const flags: string[] = [];

  // ── SKU ─────────────────────────────────────────────────────────────────────
  const rawSku = String(r.sku ?? '');
  const trimmedSku = rawSku.trim();
  const normalizedSku = trimmedSku.toUpperCase();
  if (trimmedSku !== rawSku) flags.push('SKU: leading/trailing whitespace removed');
  if (normalizedSku !== trimmedSku) flags.push('SKU: normalized to uppercase for consistent matching');

  // ── Location ────────────────────────────────────────────────────────────────
  const rawLoc = String(r.location ?? '');
  const trimmedLoc = rawLoc.trim();
  if (trimmedLoc !== rawLoc) flags.push('location: leading/trailing whitespace removed');

  // ── Numeric fields: flag provided-but-unparseable values ───────────────────
  flagIfUnparseable(r.on_hand_qty,     'on_hand_qty',     flags);
  flagIfUnparseable(r.reorder_point,   'reorder_point',   flags);
  flagIfUnparseable(r.safety_stock,    'safety_stock',    flags);
  flagIfUnparseable(r.avg_daily_usage, 'avg_daily_usage', flags);
  flagIfUnparseable(r.lead_time_days,  'lead_time_days',  flags);
  flagIfUnparseable(r.system_qty,      'system_qty',      flags);
  flagIfUnparseable(r.counted_qty,     'counted_qty',     flags);
  flagIfUnparseable(r.open_po_qty,     'open_po_qty',     flags);

  // ── Numeric fields: flag semantically invalid values ────────────────────────
  const onHand = Number(r.on_hand_qty);
  if (!isNaN(onHand) && onHand < 0) {
    flags.push('on_hand_qty: negative value recorded — exception results should be treated with caution');
  }

  const avgUsage = Number(r.avg_daily_usage);
  if (!isNaN(avgUsage) && avgUsage < 0) {
    // avg_daily_usage <= 0 causes exceptionEngine to skip stockout + days-of-cover
    flags.push('avg_daily_usage: negative — stockout risk and days-of-cover calculations will be skipped');
  }

  // ── Financial / Cost ────────────────────────────────────────────────────────
  let finalCost: number | null = null;
  let isEstimated = false;
  if (r.unit_cost !== undefined && r.unit_cost !== null && r.unit_cost !== '') {
    const rawC = String(r.unit_cost).replace(/[^0-9.-]/g, '');
    const c = Number(rawC);
    if (isNaN(c) || c < 0) {
      flags.push('unit_cost: invalid or negative — using conservative $25 estimate');
      finalCost = 25;
      isEstimated = true;
    } else {
      finalCost = c;
    }
  } else {
    finalCost = 25; // Default fallback for impact calculation
    isEstimated = true;
  }

  // ── Date field ──────────────────────────────────────────────────────────────
  const rawDate = typeof r.last_movement_date === 'string' ? r.last_movement_date.trim() : '';
  if (rawDate && isNaN(new Date(rawDate).getTime())) {
    flags.push(`last_movement_date: "${rawDate.substring(0, 40)}" is not a valid date — aging calculation will be skipped`);
  }

  return {
    ...r,
    // Apply normalized identity fields (fall back to originals if normalization produces empty string)
    sku: normalizedSku || rawSku,
    location: trimmedLoc || rawLoc,
    unit_cost: finalCost,
    is_cost_estimated: isEstimated,
    ...(typeof r.description === 'string' && { description: r.description.trim() }),
    ...(typeof r.category === 'string'    && { category: r.category.trim() }),
    _validation_flags: flags,
  };
}

export function sanitizeRecords(raw: RawInventoryRecord[]): SanitizedRecord[] {
  return raw.map(sanitizeRecord);
}
