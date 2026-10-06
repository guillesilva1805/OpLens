import { useState, useMemo, useEffect } from 'react';
import type { ProcessedRecord, ExceptionType, Priority, Status } from '../types';
import {
  getPriorityBadgeClass, getPriorityLabel, getExceptionLabel, getExceptionColor, getStatusClass, getStatusLabel, formatNum,
} from '../utils/ui';
import { useI18n, type TKey } from '../i18n';
import { saveStatus } from '../storage/localStore';

interface Props {
  records: ProcessedRecord[];
  onSelectItem: (record: ProcessedRecord) => void;
  onRecordsUpdate: (records: ProcessedRecord[]) => void;
  onBack: () => void;
}

type SortField =
  | 'sku' | 'location' | 'on_hand_qty' | 'reorder_point'
  | 'avg_daily_usage' | 'days_of_cover' | 'primary_exception_type' | 'priority' | 'status';
type SortDir = 'asc' | 'desc';

const EXCEPTION_TYPES: ExceptionType[] = [
  'stockout_risk', 'low_stock', 'count_mismatch', 'aging', 'manual_review',
];
const PRIORITIES: Priority[] = ['critical', 'high', 'medium', 'low', 'none'];
const STATUSES: Status[] = ['New', 'In Review', 'Waiting', 'Resolved'];

const PRIORITY_ORDER_MAP: Record<Priority, number> = {
  critical: 0, high: 1, medium: 2, low: 3, none: 4,
};

export default function ExceptionQueue({ records, onSelectItem, onRecordsUpdate, onBack }: Props) {
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const [filterException, setFilterException] = useState<ExceptionType | 'all'>('all');
  const [filterPriority, setFilterPriority] = useState<Priority | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<Status | 'all'>('all');
  const [showExceptionsOnly, setShowExceptionsOnly] = useState(true);
  const [sortField, setSortField] = useState<SortField>('priority');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [visibleCount, setVisibleCount] = useState(50);

  // Reset pagination when filter changes
  useEffect(() => {
    setVisibleCount(50);
  }, [search, filterException, filterPriority, filterStatus, showExceptionsOnly, sortField, sortDir]);

  const filtered = useMemo(() => {
    let result = records;

    if (showExceptionsOnly) {
      result = result.filter(r => r.exception_types.length > 0);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(r =>
        r.sku.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.location.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q)
      );
    }

    if (filterException !== 'all') {
      result = result.filter(r => r.exception_types.includes(filterException));
    }
    if (filterPriority !== 'all') {
      result = result.filter(r => r.priority === filterPriority);
    }
    if (filterStatus !== 'all') {
      result = result.filter(r => r.status === filterStatus);
    }

    // Sort
    result = [...result].sort((a, b) => {
      let aVal: string | number, bVal: string | number;
      switch (sortField) {
        case 'priority':
          aVal = PRIORITY_ORDER_MAP[a.priority];
          bVal = PRIORITY_ORDER_MAP[b.priority];
          break;
        case 'sku': aVal = a.sku; bVal = b.sku; break;
        case 'location': aVal = a.location; bVal = b.location; break;
        case 'on_hand_qty': aVal = a.on_hand_qty ?? -999; bVal = b.on_hand_qty ?? -999; break;
        case 'reorder_point': aVal = a.reorder_point ?? -999; bVal = b.reorder_point ?? -999; break;
        case 'avg_daily_usage': aVal = a.avg_daily_usage ?? -999; bVal = b.avg_daily_usage ?? -999; break;
        case 'days_of_cover': aVal = a.days_of_cover ?? 9999; bVal = b.days_of_cover ?? 9999; break;
        case 'primary_exception_type': aVal = a.primary_exception_type ?? 'zzz'; bVal = b.primary_exception_type ?? 'zzz'; break;
        case 'status': aVal = a.status; bVal = b.status; break;
        default: aVal = 0; bVal = 0;
      }
      if (typeof aVal === 'string') return sortDir === 'asc' ? aVal.localeCompare(bVal as string) : (bVal as string).localeCompare(aVal);
      return sortDir === 'asc' ? aVal - (bVal as number) : (bVal as number) - aVal;
    });

    return result;
  }, [records, search, filterException, filterPriority, filterStatus, showExceptionsOnly, sortField, sortDir]);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <span className="text-surface-500 ml-1">↕</span>;
    return <span className="text-blue-400 ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  }

  function handleStatusChange(record: ProcessedRecord, newStatus: Status) {
    saveStatus(record.sku, record.location, newStatus);
    const updated = records.map(r =>
      r.id === record.id ? { ...r, status: newStatus } : r
    );
    onRecordsUpdate(updated);
  }

  const exceptionCount = records.filter(r => r.exception_types.length > 0).length;

  return (
    <div className="max-w-screen-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="btn-ghost text-xs" id="btn-back-to-dashboard">{t('queue.back')}</button>
            <h2 className="text-xl font-bold text-white">{t('queue.title')}</h2>
            <span className="text-xs bg-surface-700 border border-surface-500 rounded-full px-3 py-1 text-muted font-mono">
              {t('queue.shown', { n: filtered.length })}
            </span>
          </div>
          <p className="text-xs text-muted mt-1 ml-0">
            {t('queue.summary', { flagged: exceptionCount, clean: records.length - exceptionCount })}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-48">
            <svg className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              id="queue-search"
              type="text"
              placeholder={t('queue.searchPlaceholder')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input w-full pl-9"
            />
          </div>

          {/* Exception filter */}
          <select
            id="filter-exception"
            value={filterException}
            onChange={e => setFilterException(e.target.value as ExceptionType | 'all')}
            className="select"
          >
            <option value="all">{t('queue.allExceptions')}</option>
            {EXCEPTION_TYPES.map(type => (
              <option key={type} value={type}>{getExceptionLabel(type, t)}</option>
            ))}
          </select>

          {/* Priority filter */}
          <select
            id="filter-priority"
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value as Priority | 'all')}
            className="select"
          >
            <option value="all">{t('queue.allPriorities')}</option>
            {PRIORITIES.map(p => (
              <option key={p} value={p}>{getPriorityLabel(p, t)}</option>
            ))}
          </select>

          {/* Status filter */}
          <select
            id="filter-status"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as Status | 'all')}
            className="select"
          >
            <option value="all">{t('queue.allStatuses')}</option>
            {STATUSES.map(s => (
              <option key={s} value={s}>{getStatusLabel(s, t)}</option>
            ))}
          </select>

          {/* Toggle exceptions only */}
          <label className="flex items-center gap-2 cursor-pointer ml-auto touch-none select-none">
            <span className="text-xs text-muted">{t('queue.exceptionsOnly')}</span>
            <div
              className={`w-9 h-5 rounded-full transition-colors ${showExceptionsOnly ? 'bg-accent' : 'bg-surface-600'}`}
            >
              <div className={`w-3.5 h-3.5 bg-white rounded-full mt-0.5 transition-transform ${showExceptionsOnly ? 'translate-x-4 ml-0.5' : 'ml-0.5'}`} />
            </div>
            {/* Invisible native checkbox for accessible and reliable toggling */}
            <input 
              type="checkbox" 
              checked={showExceptionsOnly} 
              onChange={e => setShowExceptionsOnly(e.target.checked)} 
              className="hidden" 
            />
          </label>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-600 bg-surface-800">
                {([
                  ['sku', 'queue.col.sku'],
                  ['location', 'queue.col.location'],
                  [null, 'queue.col.description'],
                  ['on_hand_qty', 'queue.col.onHand'],
                  ['reorder_point', 'queue.col.rop'],
                  ['avg_daily_usage', 'queue.col.avgDay'],
                  ['days_of_cover', 'queue.col.doc'],
                  ['primary_exception_type', 'queue.col.exception'],
                  ['priority', 'queue.col.priority'],
                  [null, 'queue.col.action'],
                  ['status', 'queue.col.status'],
                  [null, 'queue.col.followUp'],
                ] as [SortField | null, TKey][]).map(([field, labelKey]) => (
                  <th
                    key={labelKey}
                    onClick={field ? () => handleSort(field) : undefined}
                    className={`text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider whitespace-nowrap ${field ? 'cursor-pointer hover:text-gray-300 select-none' : ''}`}
                  >
                    {t(labelKey)}
                    {field && <SortIcon field={field} />}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={12} className="text-center py-16 text-muted text-sm">
                    {t('queue.noMatch')}
                  </td>
                </tr>
              ) : (
                filtered.slice(0, visibleCount).map(record => (
                  <tr
                    key={record.id}
                    onClick={() => onSelectItem(record)}
                    className={`border-b cursor-pointer transition-colors ${
                      record.status === 'Resolved'
                        ? 'bg-green-900/10 border-green-900/40 hover:bg-green-900/20 border-l-2 border-l-green-700/70'
                        : `border-surface-700 hover:bg-surface-700/40${
                            record.priority === 'critical' ? ' border-l-2 border-l-red-700'
                            : record.priority === 'high'   ? ' border-l-2 border-l-orange-700'
                            : ''
                          }`
                    }`}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-gray-300 whitespace-nowrap">{record.sku}</td>
                    <td className="px-4 py-3 text-xs text-muted whitespace-nowrap">{record.location}</td>
                    <td className="px-4 py-3 text-xs text-gray-300 max-w-40 truncate">{record.description || '—'}</td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-200 text-right">{formatNum(record.on_hand_qty)}</td>
                    <td className="px-4 py-3 text-xs font-mono text-muted text-right">{formatNum(record.reorder_point)}</td>
                    <td className="px-4 py-3 text-xs font-mono text-muted text-right">{formatNum(record.avg_daily_usage, 1)}</td>
                    <td className="px-4 py-3 text-xs font-mono text-right">
                      {record.days_of_cover !== null ? (
                        <span className={record.days_of_cover < 3 ? 'text-red-400' : record.days_of_cover < 7 ? 'text-orange-400' : 'text-gray-300'}>
                          {formatNum(record.days_of_cover, 1)}d
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {record.primary_exception_type ? (
                        <span className={`text-xs font-medium ${getExceptionColor(record.primary_exception_type)}`}>
                          {getExceptionLabel(record.primary_exception_type, t)}
                        </span>
                      ) : (
                        <span className="text-xs text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`${getPriorityBadgeClass(record.priority)} text-xs`}>
                        {getPriorityLabel(record.priority, t)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted max-w-48 truncate">{record.suggested_action}</td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <select
                        id={`status-${record.id}`}
                        value={record.status}
                        onChange={e => handleStatusChange(record, e.target.value as Status)}
                        className={`text-xs rounded px-2 py-1 border font-medium bg-transparent cursor-pointer ${getStatusClass(record.status)}`}
                      >
                        {STATUSES.map(s => <option key={s} value={s}>{getStatusLabel(s, t)}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {record.case_metadata?.recurring_issue && (
                          <span className="text-orange-400 text-xs flex-shrink-0" title={t('queue.recurringTitle')}>↻</span>
                        )}
                        {record.case_metadata?.owner && (
                          <span className="bg-surface-600 text-[10px] uppercase font-bold text-gray-300 rounded px-1.5 py-0.5" title={t('queue.ownerTitle', { owner: record.case_metadata.owner })}>
                            {record.case_metadata.owner.substring(0, 2)}
                          </span>
                        )}
                        {record.case_metadata?.root_cause && (
                           <span className="w-1.5 h-1.5 rounded-full bg-blue-500" title={t('queue.rootCauseTitle', { cause: t(`rc.${record.case_metadata.root_cause}`) })} />
                        )}
                        {record.note ? (
                          <span className="text-green-400 text-xs flex-shrink-0" title={t('queue.notesAdded')}>●</span>
                        ) : (
                          <span className="text-surface-600 text-xs flex-shrink-0">○</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {filtered.length > visibleCount && (
            <div className="flex justify-center p-4 border-t border-surface-600 bg-surface-800">
              <button 
                onClick={() => setVisibleCount(v => v + 50)} 
                className="btn-secondary text-xs"
              >
                {t('queue.showMore')}
              </button>
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-muted mt-3 text-right">
        {t('queue.footer', { shown: Math.min(filtered.length, visibleCount), total: filtered.length })}
      </p>
    </div>
  );
}
