import type { ProcessedRecord, AppNotification, Priority, AlertType } from '../types';
import { ALERT_THRESHOLDS } from '../config/alertThresholds';
import { translate, type Lang, type TFn } from '../i18n/translations';
import {
  getNotificationRead,
  getNotificationCreatedAt,
  saveNotificationCreatedAt,
} from '../storage/localStore';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Stable notification ID — same SKU + location + alertType always produces the same key.
 *  This prevents duplicate notifications on every data refresh.
 *
 *  Lifecycle: if the underlying condition clears (e.g. stock is replenished), this
 *  notification simply won't be emitted by the next generateNotifications() call and
 *  disappears naturally. No explicit "resolved" step is needed for Phase 1. The orphaned
 *  read/created_at keys in localStorage are harmless. */
function makeId(sku: string, location: string, alertType: AlertType): string {
  return `notif__${sku}__${location}__${alertType}`;
}

function buildNotification(
  record: ProcessedRecord,
  alertType: AlertType,
  priority: Priority,
  message: string,
  reason: string,
): AppNotification {
  const id = makeId(record.sku, record.location, alertType);

  // Content (message, reason, priority) is always derived fresh from the current record
  // so it stays accurate even though the ID is stable across refreshes.
  // Only read state and created_at are pulled from localStorage.
  const storedCreatedAt = getNotificationCreatedAt(id);
  const created_at = storedCreatedAt ?? new Date().toISOString();
  if (!storedCreatedAt) {
    // First time this alert fires — persist the timestamp so it survives reloads.
    saveNotificationCreatedAt(id, created_at);
  }

  return {
    id,
    sku: record.sku,
    item_name: record.description || record.sku,
    alert_type: alertType,
    priority,
    message,
    reason,
    created_at,
    read: getNotificationRead(id),
    linked_record_id: record.id,
  };
}

// ─── Alert Checks ───────────────────────────────────────────────────────────

function checkLowStockAlert(record: ProcessedRecord, t: TFn): AppNotification | null {
  const { on_hand_qty, reorder_point, safety_stock } = record;

  // Reuse stockout_risk exception data when available (highest severity)
  if (record.exception_types.includes('stockout_risk')) {
    const priority: Priority = record.priority === 'critical' ? 'critical' : 'high';
    return buildNotification(
      record,
      'low_stock',
      priority,
      t('notif.stockoutMsg', { sku: record.sku }),
      t('notif.stockoutReason', { doc: record.days_of_cover ?? '?' }),
    );
  }

  // Reuse existing low_stock exception
  if (record.exception_types.includes('low_stock')) {
    const priority: Priority =
      safety_stock !== null && on_hand_qty !== null && on_hand_qty <= safety_stock ? 'high' : 'medium';
    return buildNotification(
      record,
      'low_stock',
      priority,
      t('notif.lowMsg', { sku: record.sku }),
      reorder_point !== null
        ? t('notif.lowReasonRop', { onHand: on_hand_qty, threshold: reorder_point })
        : t('notif.lowReasonSs', { onHand: on_hand_qty, threshold: safety_stock }),
    );
  }

  // Fallback: no reorder thresholds on record — use configured absolute minimum
  if (on_hand_qty !== null && reorder_point === null && safety_stock === null) {
    if (on_hand_qty <= ALERT_THRESHOLDS.LOW_STOCK_FALLBACK) {
      return buildNotification(
        record,
        'low_stock',
        'medium',
        t('notif.lowMsg', { sku: record.sku }),
        t('notif.lowReasonFallback', { onHand: on_hand_qty, min: ALERT_THRESHOLDS.LOW_STOCK_FALLBACK }),
      );
    }
  }

  return null;
}

function checkHighStockAlert(record: ProcessedRecord, t: TFn): AppNotification | null {
  const { on_hand_qty, reorder_point } = record;
  if (on_hand_qty === null) return null;

  let overstockThreshold: number;

  if (reorder_point !== null) {
    // No explicit max stock field exists in the data model. We use ROP × multiplier as a
    // rough heuristic: holding more than ~3× the reorder quantity suggests excess inventory.
    // Adjust HIGH_STOCK_ROP_MULTIPLIER in alertThresholds.ts to match your policy.
    overstockThreshold = reorder_point * ALERT_THRESHOLDS.HIGH_STOCK_ROP_MULTIPLIER;
  } else {
    overstockThreshold = ALERT_THRESHOLDS.HIGH_STOCK_FALLBACK;
  }

  if (on_hand_qty > overstockThreshold) {
    const excess = Math.round(on_hand_qty - overstockThreshold);
    return buildNotification(
      record,
      'high_stock',
      'medium',
      t('notif.overMsg', { sku: record.sku }),
      reorder_point !== null
        ? t('notif.overReasonRop', {
            onHand: on_hand_qty,
            mult: ALERT_THRESHOLDS.HIGH_STOCK_ROP_MULTIPLIER,
            threshold: overstockThreshold,
            excess,
          })
        : t('notif.overReasonFallback', { onHand: on_hand_qty, threshold: overstockThreshold, excess }),
    );
  }

  return null;
}

function checkSlowMovementAlert(record: ProcessedRecord, t: TFn): AppNotification | null {
  const { aging_days } = record;
  // aging_days is already computed by the exception engine from last_movement_date.
  //
  // Distinction from the aging *exception* (operational, fires at 30+ days):
  //   Aging     → warehouse/ops lens: item hasn't moved, consider write-off or return.
  //   Slow mvmt → commercial/planning lens: demand velocity has stalled, review the
  //               business case for holding this stock (carrying cost, capital tied up).
  // Threshold is intentionally higher (60+ days) so both can coexist without feeling
  // redundant: aging is the early operational flag, slow movement is the escalated
  // financial review trigger.
  if (aging_days === null || aging_days < ALERT_THRESHOLDS.SLOW_MOVEMENT_DAYS) return null;

  const priority: Priority = aging_days >= 90 ? 'high' : 'medium';

  return buildNotification(
    record,
    'slow_movement',
    priority,
    t('notif.slowMsg', { sku: record.sku }),
    t('notif.slowReason', { days: aging_days, threshold: ALERT_THRESHOLDS.SLOW_MOVEMENT_DAYS }),
  );
}

// ─── Main Generator ─────────────────────────────────────────────────────────

/**
 * Generates alert notifications from the current set of processed inventory records.
 *
 * - Each SKU produces at most one notification per alert type (stable ID = no duplicates).
 * - Notification content (message, reason, priority) is always fresh from the current record.
 * - Read state and created_at are preserved in localStorage across page reloads.
 * - When a condition clears, its notification is simply absent from the next result — no
 *   explicit cleanup needed.
 */
export function generateNotifications(records: ProcessedRecord[], lang: Lang = 'en'): AppNotification[] {
  const t: TFn = (key, params) => translate(lang, key, params);
  const notifications: AppNotification[] = [];

  for (const record of records) {
    // Skip records with no usable on_hand data (data quality issues handled by separate exception)
    if (record.on_hand_qty === null && !record.exception_types.includes('aging')) continue;

    const lowStock = checkLowStockAlert(record, t);
    if (lowStock) notifications.push(lowStock);

    const highStock = checkHighStockAlert(record, t);
    if (highStock) notifications.push(highStock);

    const slowMovement = checkSlowMovementAlert(record, t);
    if (slowMovement) notifications.push(slowMovement);
  }

  return notifications;
}
