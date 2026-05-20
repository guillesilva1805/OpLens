import { useState } from 'react';
import type { AppNotification, AlertType, Priority } from '../types';
import {
  getAlertTypeLabel,
  getAlertTypeColor,
  getAlertTypeBadgeClass,
  getPriorityBadgeClass,
  getPriorityLabel,
} from '../utils/ui';

interface Props {
  notifications: AppNotification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onOpenRecord: (linkedRecordId: string) => void;
  onBack: () => void;
}

const ALERT_TYPE_OPTIONS: { value: AlertType | 'all'; label: string }[] = [
  { value: 'all', label: 'All Types' },
  { value: 'low_stock', label: 'Low Stock' },
  { value: 'high_stock', label: 'Overstock' },
  { value: 'slow_movement', label: 'Slow Movement' },
];

const PRIORITY_OPTIONS: { value: Priority | 'all'; label: string }[] = [
  { value: 'all', label: 'All Priorities' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
];

export default function NotificationsPanel({
  notifications,
  onMarkRead,
  onMarkAllRead,
  onOpenRecord,
  onBack,
}: Props) {
  const [filterType, setFilterType] = useState<AlertType | 'all'>('all');
  const [filterPriority, setFilterPriority] = useState<Priority | 'all'>('all');
  const [showReadToo, setShowReadToo] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  const filtered = notifications
    .filter(n => filterType === 'all' || n.alert_type === filterType)
    .filter(n => filterPriority === 'all' || n.priority === filterPriority)
    .filter(n => showReadToo || !n.read);

  // Unread first, then by priority, then by created_at
  const PRIORITY_ORDER: Priority[] = ['critical', 'high', 'medium', 'low', 'none'];
  const sorted = [...filtered].sort((a, b) => {
    if (a.read !== b.read) return a.read ? 1 : -1;
    const pd = PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority);
    if (pd !== 0) return pd;
    return b.created_at.localeCompare(a.created_at);
  });

  const unreadFiltered = sorted.filter(n => !n.read);
  const readFiltered = sorted.filter(n => n.read);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="btn-ghost text-xs">
            ← Back
          </button>
          <div>
            <h2 className="text-2xl font-bold text-white">Alerts</h2>
            <p className="text-sm text-muted mt-0.5">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'} · low stock, overstock & slow movement
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <button onClick={onMarkAllRead} className="btn-ghost text-xs">
            Mark all as read
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value as AlertType | 'all')}
          className="select text-xs py-1.5"
        >
          {ALERT_TYPE_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          value={filterPriority}
          onChange={e => setFilterPriority(e.target.value as Priority | 'all')}
          className="select text-xs py-1.5"
        >
          {PRIORITY_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-xs text-muted cursor-pointer ml-auto">
          <input
            type="checkbox"
            checked={showReadToo}
            onChange={e => setShowReadToo(e.target.checked)}
            className="accent-accent"
          />
          Show read
        </label>
      </div>

      {/* Empty state */}
      {sorted.length === 0 && (
        <div className="card p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-surface-700 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-300">
            {notifications.length === 0 ? 'No alerts for current inventory' : 'No alerts match the active filters'}
          </p>
          <p className="text-xs text-muted mt-1">
            {!showReadToo && notifications.some(n => n.read) && 'Toggle "Show read" to see dismissed alerts.'}
          </p>
        </div>
      )}

      {/* Unread section */}
      {unreadFiltered.length > 0 && (
        <section className="mb-6">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2 px-1">
            Unread ({unreadFiltered.length})
          </h3>
          <div className="space-y-2">
            {unreadFiltered.map(n => (
              <NotificationRow
                key={n.id}
                notification={n}
                onMarkRead={onMarkRead}
                onOpenRecord={onOpenRecord}
              />
            ))}
          </div>
        </section>
      )}

      {/* Read section */}
      {showReadToo && readFiltered.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2 px-1">
            Read ({readFiltered.length})
          </h3>
          <div className="space-y-2 opacity-60">
            {readFiltered.map(n => (
              <NotificationRow
                key={n.id}
                notification={n}
                onMarkRead={onMarkRead}
                onOpenRecord={onOpenRecord}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ─── Individual row ──────────────────────────────────────────────────────────

function NotificationRow({
  notification: n,
  onMarkRead,
  onOpenRecord,
}: {
  notification: AppNotification;
  onMarkRead: (id: string) => void;
  onOpenRecord: (id: string) => void;
}) {
  return (
    <div className={`card p-4 flex items-start gap-3 transition-opacity ${n.read ? 'opacity-60' : ''}`}>
      {/* Unread dot */}
      <div className="flex-shrink-0 mt-1">
        {n.read ? (
          <div className="w-2 h-2 rounded-full bg-surface-600" />
        ) : (
          <div className="w-2 h-2 rounded-full bg-accent" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${getAlertTypeBadgeClass(n.alert_type)}`}>
            {getAlertTypeLabel(n.alert_type)}
          </span>
          <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${getPriorityBadgeClass(n.priority)}`}>
            {getPriorityLabel(n.priority)}
          </span>
          <span className={`text-sm font-semibold truncate ${getAlertTypeColor(n.alert_type)}`}>
            {n.sku}
          </span>
          {n.item_name !== n.sku && (
            <span className="text-xs text-muted truncate">{n.item_name}</span>
          )}
        </div>
        <p className="text-sm text-gray-200 font-medium">{n.message}</p>
        <p className="text-xs text-muted mt-0.5 leading-relaxed">{n.reason}</p>
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 flex items-center gap-1">
        {n.linked_record_id && (
          <button
            onClick={() => onOpenRecord(n.linked_record_id!)}
            className="btn-ghost text-xs py-1 px-2"
            title="Open exception record"
          >
            Open →
          </button>
        )}
        {!n.read && (
          <button
            onClick={() => onMarkRead(n.id)}
            className="btn-ghost text-xs py-1 px-2 text-muted"
            title="Mark as read"
          >
            ✓
          </button>
        )}
      </div>
    </div>
  );
}
