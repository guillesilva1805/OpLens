import type { RawInventoryRecord, ProcessedRecord, ExceptionType, Priority, Status } from '../types';
import { getNote, getStatus, getCaseMetadata } from '../storage/localStore';
import { sanitizeRecords } from './preprocessor';
import { translate, type Lang, type TFn } from '../i18n/translations';

// ─── Helpers ───────────────────────────────────────────────────────────────

function toNum(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

function parseDate(val: unknown): Date | null {
  if (!val || typeof val !== 'string') return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

function daysSince(d: Date): number {
  const now = new Date('2026-03-24'); // use current date constant for determinism
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

const PRIORITY_ORDER: Priority[] = ['critical', 'high', 'medium', 'low', 'none'];

const EXCEPTION_TYPE_ORDER: ExceptionType[] = [
  'stockout_risk',
  'low_stock',
  'count_mismatch',
  'aging',
  'manual_review',
];

// ─── Exception Detection ────────────────────────────────────────────────────

interface ExceptionResult {
  type: ExceptionType;
  priority: Priority;
  reason: string;
  suggested_action: string;
}

function checkLowStock(
  on_hand_qty: number | null,
  reorder_point: number | null,
  safety_stock: number | null,
  t: TFn
): ExceptionResult | null {
  if (on_hand_qty === null) return null;
  const threshold = reorder_point ?? safety_stock;
  if (threshold === null) return null;

  if (on_hand_qty <= threshold) {
    const priority: Priority =
      safety_stock !== null && on_hand_qty <= safety_stock ? 'high' : 'medium';
    return {
      type: 'low_stock',
      priority,
      reason: reorder_point !== null
        ? t('engine.lowStock.reasonRop', { onHand: on_hand_qty, threshold: reorder_point })
        : t('engine.lowStock.reasonSs', { onHand: on_hand_qty, threshold: safety_stock }),
      suggested_action: t('engine.lowStock.action'),
    };
  }
  return null;
}

function checkStockoutRisk(
  on_hand_qty: number | null,
  avg_daily_usage: number | null,
  lead_time_days: number | null,
  t: TFn
): { result: ExceptionResult | null; days_of_cover: number | null } {
  if (on_hand_qty === null || avg_daily_usage === null || avg_daily_usage <= 0) {
    return { result: null, days_of_cover: null };
  }

  const days_of_cover = Math.round((on_hand_qty / avg_daily_usage) * 10) / 10;
  const threshold = lead_time_days ?? 7;

  if (days_of_cover < threshold) {
    const priority: Priority = days_of_cover < 3 ? 'critical' : 'high';
    return {
      result: {
        type: 'stockout_risk',
        priority,
        reason: lead_time_days !== null
          ? t('engine.stockout.reasonLead', { doc: days_of_cover, lead: lead_time_days })
          : t('engine.stockout.reasonDefault', { doc: days_of_cover }),
        suggested_action: t('engine.stockout.action'),
      },
      days_of_cover,
    };
  }
  return { result: null, days_of_cover };
}

function checkCountMismatch(
  system_qty: number | null,
  counted_qty: number | null,
  t: TFn
): ExceptionResult | null {
  if (system_qty === null || counted_qty === null) return null;
  if (system_qty === counted_qty) return null;

  const variance = Math.abs(system_qty - counted_qty);
  const pct = system_qty !== 0 ? variance / Math.abs(system_qty) : 1;
  const priority: Priority = variance > 20 || pct > 0.1 ? 'high' : 'medium';

  return {
    type: 'count_mismatch',
    priority,
    reason: t('engine.mismatch.reason', {
      system: system_qty,
      counted: counted_qty,
      variance: `${counted_qty - system_qty > 0 ? '+' : ''}${counted_qty - system_qty}`,
    }),
    suggested_action: t('engine.mismatch.action'),
  };
}

function checkAging(
  last_movement_date: string | null,
  t: TFn
): { result: ExceptionResult | null; aging_days: number | null } {
  if (!last_movement_date) return { result: null, aging_days: null };
  const d = parseDate(last_movement_date);
  if (!d) return { result: null, aging_days: null };

  const aging_days = daysSince(d);
  if (aging_days < 30) return { result: null, aging_days };

  const priority: Priority = aging_days >= 90 ? 'critical' : aging_days >= 60 ? 'high' : 'medium';
  return {
    result: {
      type: 'aging',
      priority,
      reason: t('engine.aging.reason', { days: aging_days, date: last_movement_date }),
      suggested_action: t('engine.aging.action'),
    },
    aging_days,
  };
}

function checkManualReview(record: {
  sku: string;
  location: string;
  on_hand_qty: number | null;
  system_qty: number | null;
  counted_qty: number | null;
  avg_daily_usage: number | null;
  last_movement_date: string | null;
  raw_on_hand_qty: unknown;
  raw_system_qty: unknown;
  raw_counted_qty: unknown;
  raw_avg_daily_usage: unknown;
  raw_last_movement_date: unknown;
}, t: TFn): ExceptionResult | null {
  const issues: string[] = [];

  const missingSku = !record.sku || record.sku.trim() === '';
  const missingLocation = !record.location || record.location.trim() === '';
  if (missingSku) issues.push(t('issue.missingSku'));
  if (missingLocation) issues.push(t('issue.missingLocation'));

  if (record.raw_on_hand_qty !== undefined && record.raw_on_hand_qty !== null && record.raw_on_hand_qty !== '') {
    if (record.on_hand_qty === null) issues.push(t('issue.invalidOnHand'));
    else if (record.on_hand_qty < 0) issues.push(t('issue.negativeOnHand'));
  } else {
    issues.push(t('issue.missingOnHand'));
  }

  if (record.raw_system_qty !== undefined && record.raw_system_qty !== null && record.raw_system_qty !== '') {
    if (record.system_qty !== null && record.system_qty < 0) issues.push(t('issue.negativeSystem'));
  }
  if (record.raw_counted_qty !== undefined && record.raw_counted_qty !== null && record.raw_counted_qty !== '') {
    if (record.counted_qty !== null && record.counted_qty < 0) issues.push(t('issue.negativeCounted'));
  }
  if (record.raw_avg_daily_usage !== undefined && record.raw_avg_daily_usage !== null && record.raw_avg_daily_usage !== '') {
    if (record.avg_daily_usage !== null && record.avg_daily_usage < 0) issues.push(t('issue.negativeUsage'));
  }

  if (record.raw_last_movement_date && typeof record.raw_last_movement_date === 'string' && record.raw_last_movement_date.trim() !== '') {
    if (!parseDate(record.raw_last_movement_date)) issues.push(t('issue.invalidDate'));
  }

  if (issues.length === 0) return null;

  const hasIdentityIssue = missingSku || missingLocation;
  return {
    type: 'manual_review',
    priority: hasIdentityIssue ? 'high' : 'medium',
    reason: t('engine.manual.reason', { issues: issues.join(', ') }),
    suggested_action: t('engine.manual.action'),
  };
}

// ─── Main Engine ───────────────────────────────────────────────────────────

export function processRecords(raw: RawInventoryRecord[], lang: Lang = 'en'): ProcessedRecord[] {
  // Reasons, actions and flags are written in the UI language; the rules themselves
  // (types, priorities, thresholds) do not depend on it.
  const t: TFn = (key, params) => translate(lang, key, params);

  // Sanitize first: normalize strings, flag unparseable/invalid values.
  // Exception logic runs on the cleaned data; flags are surfaced in the UI.
  const sanitized = sanitizeRecords(raw, t);
  return sanitized.map(r => {
    const on_hand_qty = toNum(r.on_hand_qty);
    const reorder_point = toNum(r.reorder_point);
    const safety_stock = toNum(r.safety_stock);
    const avg_daily_usage = toNum(r.avg_daily_usage);
    const lead_time_days = toNum(r.lead_time_days);
    const system_qty = toNum(r.system_qty);
    const counted_qty = toNum(r.counted_qty);
    const open_po_qty = toNum(r.open_po_qty);
    const last_movement_date = r.last_movement_date?.trim() || null;

    const exceptions: ExceptionResult[] = [];

    // Stockout risk + days_of_cover
    const stockoutCheck = checkStockoutRisk(on_hand_qty, avg_daily_usage, lead_time_days, t);
    const days_of_cover = stockoutCheck.days_of_cover ??
      (on_hand_qty !== null && avg_daily_usage && avg_daily_usage > 0
        ? Math.round((on_hand_qty / avg_daily_usage) * 10) / 10
        : null);
    if (stockoutCheck.result) exceptions.push(stockoutCheck.result);

    // Low stock
    const lowStockResult = checkLowStock(on_hand_qty, reorder_point, safety_stock, t);
    if (lowStockResult) exceptions.push(lowStockResult);

    // Count mismatch
    const mismatchResult = checkCountMismatch(system_qty, counted_qty, t);
    if (mismatchResult) exceptions.push(mismatchResult);

    // Aging
    const agingCheck = checkAging(last_movement_date, t);
    const aging_days = agingCheck.aging_days;
    if (agingCheck.result) exceptions.push(agingCheck.result);

    // Manual review
    const manualResult = checkManualReview({
      sku: r.sku,
      location: r.location,
      on_hand_qty,
      system_qty,
      counted_qty,
      avg_daily_usage,
      last_movement_date,
      raw_on_hand_qty: r.on_hand_qty,
      raw_system_qty: r.system_qty,
      raw_counted_qty: r.counted_qty,
      raw_avg_daily_usage: r.avg_daily_usage,
      raw_last_movement_date: r.last_movement_date,
    }, t);
    if (manualResult) exceptions.push(manualResult);

    // Determine primary exception (highest priority, then by type order)
    let primary: ExceptionResult | null = null;
    for (const ex of exceptions) {
      if (!primary) { primary = ex; continue; }
      const priComp = PRIORITY_ORDER.indexOf(ex.priority) - PRIORITY_ORDER.indexOf(primary.priority);
      if (priComp < 0) {
        primary = ex;
      } else if (priComp === 0) {
        // same priority: use EXCEPTION_TYPE_ORDER
        if (EXCEPTION_TYPE_ORDER.indexOf(ex.type) < EXCEPTION_TYPE_ORDER.indexOf(primary.type)) {
          primary = ex;
        }
      }
    }

    const overallPriority: Priority = primary ? primary.priority : 'none';
    const exception_types = [...new Set(
      [...EXCEPTION_TYPE_ORDER.filter(t => exceptions.some(e => e.type === t))]
    )] as ExceptionType[];

    const id = `${r.sku}__${r.location}`;

    return {
      sku: r.sku || '',
      location: r.location || '',
      description: (r.description as string) || '',
      category: (r.category as string) || '',
      on_hand_qty,
      reorder_point,
      safety_stock,
      avg_daily_usage,
      lead_time_days,
      system_qty,
      counted_qty,
      open_po_qty,
      last_movement_date,
      days_of_cover,
      aging_days,
      exception_types,
      primary_exception_type: primary?.type ?? null,
      priority: overallPriority,
      reason: primary?.reason ?? t('engine.none.reason'),
      suggested_action: primary?.suggested_action ?? t('engine.none.action'),
      status: getStatus(r.sku, r.location) as Status,
      note: getNote(r.sku, r.location),
      case_metadata: getCaseMetadata(r.sku, r.location),
      validation_flags: r._validation_flags,
      unit_cost: r.unit_cost,
      is_cost_estimated: r.is_cost_estimated,
      id,
    };
  });
}
