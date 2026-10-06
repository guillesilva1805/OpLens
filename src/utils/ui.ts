import type { Priority, ExceptionType, Status, AlertType } from '../types';
import type { TFn, TKey } from '../i18n';

export function getPriorityBadgeClass(priority: Priority): string {
  switch (priority) {
    case 'critical': return 'badge-critical';
    case 'high': return 'badge-high';
    case 'medium': return 'badge-medium';
    case 'low': return 'badge-low';
    default: return 'badge-none';
  }
}

export function getPriorityLabel(priority: Priority, t: TFn): string {
  return t(`priority.${priority}`);
}

export function getExceptionLabel(type: ExceptionType | null, t: TFn): string {
  return type ? t(`exc.${type}`) : '—';
}

export function getExceptionColor(type: ExceptionType | null): string {
  switch (type) {
    case 'stockout_risk': return 'text-red-400';
    case 'low_stock': return 'text-orange-400';
    case 'count_mismatch': return 'text-yellow-400';
    case 'aging': return 'text-purple-400';
    case 'manual_review': return 'text-blue-400';
    default: return 'text-gray-400';
  }
}

export function getStatusClass(status: Status): string {
  switch (status) {
    case 'New': return 'status-new';
    case 'In Review': return 'status-in-review';
    case 'Waiting': return 'status-waiting';
    case 'Resolved': return 'status-resolved';
  }
}

const STATUS_KEYS: Record<Status, TKey> = {
  'New': 'status.new',
  'In Review': 'status.in_review',
  'Waiting': 'status.waiting',
  'Resolved': 'status.resolved',
};

/** Status values stay in English as storage keys; only the label is translated. */
export function getStatusLabel(status: Status, t: TFn): string {
  return t(STATUS_KEYS[status]);
}

export function formatNum(v: number | null, decimals = 0): string {
  if (v === null) return '—';
  return v.toFixed(decimals);
}

export function getAlertTypeLabel(type: AlertType, t: TFn): string {
  return t(`alertType.${type}`);
}

export function getAlertTypeColor(type: AlertType): string {
  switch (type) {
    case 'low_stock': return 'text-orange-400';
    case 'high_stock': return 'text-cyan-400';
    case 'slow_movement': return 'text-purple-400';
  }
}

export function getAlertTypeBadgeClass(type: AlertType): string {
  switch (type) {
    case 'low_stock': return 'bg-orange-900/60 text-orange-400 border border-orange-800';
    case 'high_stock': return 'bg-cyan-900/60 text-cyan-400 border border-cyan-800';
    case 'slow_movement': return 'bg-purple-900/60 text-purple-400 border border-purple-800';
  }
}
