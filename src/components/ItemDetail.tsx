import { useState, useEffect } from 'react';
import type { ProcessedRecord, Status, CaseMetadata, RootCauseCategory } from '../types';
import { DEFAULT_CASE_METADATA } from '../types';
import {
  getPriorityBadgeClass, getPriorityLabel, getExceptionLabel, getExceptionColor,
  getStatusClass, formatNum,
} from '../utils/ui';
import { saveNote, saveStatus, saveCaseMetadata } from '../storage/localStore';

interface Props {
  record: ProcessedRecord;
  onClose: () => void;
  onUpdate: (updated: ProcessedRecord) => void;
}

const STATUSES: Status[] = ['New', 'In Review', 'Waiting', 'Resolved'];

export default function ItemDetail({ record, onClose, onUpdate }: Props) {
  const [note, setNote] = useState(record.note);
  const [status, setStatus] = useState<Status>(record.status);
  const [meta, setMeta] = useState<CaseMetadata>(record.case_metadata ?? DEFAULT_CASE_METADATA);
  const [saveStatusStr, setSaveStatusStr] = useState<'idle' | 'saving' | 'saved'>('idle');

  useEffect(() => {
    setNote(record.note);
    setStatus(record.status);
    setMeta(record.case_metadata ?? DEFAULT_CASE_METADATA);
    setSaveStatusStr('idle');
  }, [record.id]);

  function triggerSave() {
    setSaveStatusStr('saving');
    setTimeout(() => {
      setSaveStatusStr('saved');
      setTimeout(() => setSaveStatusStr('idle'), 2000);
    }, 400);
  }

  function handleNoteChange(val: string) {
    setNote(val);
    saveNote(record.sku, record.location, val);
    onUpdate({ ...record, note: val, status });
    triggerSave();
  }

  function handleStatusChange(val: Status) {
    setStatus(val);
    saveStatus(record.sku, record.location, val);
    onUpdate({ ...record, status: val, note });
    triggerSave();
  }

  function handleMetaChange(updates: Partial<CaseMetadata>) {
    const updated = { ...meta, ...updates };
    setMeta(updated);
    saveCaseMetadata(record.sku, record.location, updated);
    onUpdate({ ...record, case_metadata: updated, note, status });
    triggerSave();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className={`relative w-full max-w-lg bg-surface-800 flex flex-col h-full overflow-y-auto shadow-2xl border-l ${
          status === 'Resolved' ? 'border-green-700/50' : 'border-surface-600'
        }`}
        onClick={e => e.stopPropagation()}
        id="item-detail-panel"
      >
        {/* Panel header */}
        <div className="p-5 border-b border-surface-600 flex-shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted mb-1 font-mono">{record.location}</p>
              <h3 className="text-lg font-bold text-white">{record.sku}</h3>
              {record.description && (
                <p className="text-sm text-gray-400 mt-0.5">{record.description}</p>
              )}
              {record.category && (
                <span className="text-xs text-muted bg-surface-700 border border-surface-500 rounded px-2 py-0.5 inline-block mt-2">
                  {record.category}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="btn-ghost p-2 -mr-1 mt-0"
              id="btn-close-detail"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Resolved banner */}
          {status === 'Resolved' && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-900/25 border border-green-700/40">
              <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm text-green-300 font-medium">Marked as resolved — exception details kept for reference</span>
            </div>
          )}

          {/* Priority + status */}
          <div className="flex items-center gap-3">
            <span className={`${getPriorityBadgeClass(record.priority)} text-xs px-3 py-1`}>
              {getPriorityLabel(record.priority)} Priority
            </span>
            <select
              id="detail-status-select"
              value={status}
              onChange={e => handleStatusChange(e.target.value as Status)}
              className={`text-xs rounded px-2 py-1 border font-medium bg-transparent cursor-pointer ${getStatusClass(status)}`}
            >
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Preprocessing notes — only shown when data quality issues were found during sanitization */}
          {record.validation_flags.length > 0 && (
            <Section title="Preprocessing Notes">
              <div className="space-y-1.5">
                {record.validation_flags.map((flag, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-yellow-500 text-xs flex-shrink-0 mt-0.5">⚠</span>
                    <span className="text-xs text-yellow-400/90 leading-relaxed">{flag}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted mt-2 pt-2 border-t border-surface-700/50">
                Fields affected above were normalized before exception logic ran. Calculations depending on those fields may be limited or skipped.
              </p>
            </Section>
          )}

          {/* Exception types */}
          <Section title="Exception Details">
            {record.exception_types.length === 0 ? (
              <p className="text-sm text-green-400">✓ No exceptions detected</p>
            ) : (
              <div className="space-y-3">
                {record.exception_types.map(type => (
                  <div key={type} className="flex items-center gap-2">
                    <span className={`text-xs font-semibold ${getExceptionColor(type)} w-36 flex-shrink-0`}>
                      {getExceptionLabel(type)}
                    </span>
                    <span className="text-xs text-muted">
                      {type === record.primary_exception_type ? '← primary' : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Why flagged */}
          {record.primary_exception_type && (
            <Section title="Why This Was Flagged">
              <p className="text-sm text-gray-300 leading-relaxed">{record.reason}</p>
            </Section>
          )}

          {/* Suggested action */}
          {record.primary_exception_type && (
            <Section title="Suggested Action">
              <div className="flex items-start gap-3 bg-accent-muted/30 border border-accent/20 rounded-lg p-3">
                <svg className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-blue-200">{record.suggested_action}</p>
              </div>
            </Section>
          )}

          {/* Computed metrics */}
          <Section title="Calculated Metrics">
            <div className="grid grid-cols-2 gap-3">
              {record.days_of_cover !== null && (
                <MetricCard
                  label="Days of Cover"
                  value={`${formatNum(record.days_of_cover, 1)} days`}
                  sub={record.lead_time_days !== null ? `vs ${record.lead_time_days}d lead time` : 'vs 7d default'}
                  warn={record.days_of_cover < (record.lead_time_days ?? 7)}
                />
              )}
              {record.aging_days !== null && (
                <MetricCard
                  label="Days Since Movement"
                  value={`${record.aging_days} days`}
                  sub={record.last_movement_date ?? ''}
                  warn={record.aging_days >= 30}
                />
              )}
              {record.system_qty !== null && record.counted_qty !== null && record.system_qty !== record.counted_qty && (
                <MetricCard
                  label="Count Variance"
                  value={`${record.counted_qty - record.system_qty > 0 ? '+' : ''}${record.counted_qty - record.system_qty} units`}
                  sub={`System: ${record.system_qty} · Counted: ${record.counted_qty}`}
                  warn={true}
                />
              )}
            </div>
          </Section>

          {/* Estimated Business Impact */}
          {(record.primary_exception_type === 'aging' || record.primary_exception_type === 'stockout_risk' || record.primary_exception_type === 'count_mismatch') && (
            <Section title="Estimated Business Impact">
              <div className="rounded-lg p-4 border bg-surface-700/50 border-surface-600 flex justify-between items-center relative overflow-hidden">
                <div className="absolute top-0 right-0 p-1 opacity-10">
                  <svg className="w-16 h-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="relative z-10 hidden sm:block">
                  <p className="text-xs text-muted mb-1 uppercase tracking-wider font-semibold">
                    {record.primary_exception_type === 'aging' && 'Capital at Risk'}
                    {record.primary_exception_type === 'stockout_risk' && 'Shortage Value'}
                    {record.primary_exception_type === 'count_mismatch' && 'Variance Value'}
                  </p>
                  <p className="text-2xl font-bold font-mono text-gray-100">
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
                      record.primary_exception_type === 'aging' ? (record.on_hand_qty || 0) * (record.unit_cost || 0) :
                      record.primary_exception_type === 'stockout_risk' ? Math.max(0, (record.reorder_point || 0) - (record.on_hand_qty || 0)) * (record.unit_cost || 0) :
                      Math.abs((record.system_qty || 0) - (record.counted_qty || 0)) * (record.unit_cost || 0)
                    )}
                  </p>
                </div>
                <div className="relative z-10 text-right">
                  <div className="flex items-center gap-1.5 justify-end mb-1">
                    {record.is_cost_estimated ? (
                      <span className="text-[10px] uppercase font-bold text-yellow-500 border border-yellow-700/50 rounded px-1.5 py-0.5 bg-yellow-900/30">
                        Estimated Fallback
                      </span>
                    ) : (
                      <span className="text-[10px] uppercase font-bold text-green-400 border border-green-700/50 rounded px-1.5 py-0.5 bg-green-900/30">
                        Actual Unit Cost
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-mono text-gray-400">
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(record.unit_cost || 0)} / unit
                  </p>
                </div>
              </div>
            </Section>
          )}

          {/* Inventory data */}
          <Section title="Inventory Record">
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              <DataRow label="On Hand" value={formatNum(record.on_hand_qty)} />
              <DataRow label="Reorder Point" value={formatNum(record.reorder_point)} />
              <DataRow label="Safety Stock" value={formatNum(record.safety_stock)} />
              <DataRow label="Avg Daily Usage" value={formatNum(record.avg_daily_usage, 2)} />
              <DataRow label="Lead Time" value={record.lead_time_days !== null ? `${record.lead_time_days}d` : '—'} />
              <DataRow label="Open PO Qty" value={formatNum(record.open_po_qty)} />
              <DataRow label="System Qty" value={formatNum(record.system_qty)} />
              <DataRow label="Counted Qty" value={formatNum(record.counted_qty)} />
              <DataRow label="Last Movement" value={record.last_movement_date ?? '—'} />
            </div>
          </Section>

          {/* Investigation & Action (Root Cause Workflow) */}
          <Section
            title="Investigation & Action"
            rightAccessory={
              <span className={`text-[10px] font-mono transition-opacity duration-300 ${saveStatusStr === 'saved' ? 'opacity-100 text-green-400' : saveStatusStr === 'saving' ? 'opacity-100 text-gray-400' : 'opacity-0'}`}>
                {saveStatusStr === 'saved' ? '✓ Saved' : 'Saving...'}
              </span>
            }
          >
            <div className="space-y-4">
              {/* Row 1: Root Cause & Owner */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-muted mb-1">Root Cause</label>
                  <select
                    value={meta.root_cause || ''}
                    onChange={e => handleMetaChange({ root_cause: (e.target.value || null) as RootCauseCategory })}
                    className="select w-full"
                  >
                    <option value="">Select root cause…</option>
                    <option value="counting_error">Counting Error</option>
                    <option value="receiving_delay">Receiving Delay</option>
                    <option value="master_data_issue">Master Data Issue</option>
                    <option value="damaged_inventory">Damaged Inventory</option>
                    <option value="supplier_short_shipment">Supplier Short Shipment</option>
                    <option value="picking_error">Picking Error</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1">Owner</label>
                  <input
                    type="text"
                    value={meta.owner}
                    onChange={e => handleMetaChange({ owner: e.target.value })}
                    placeholder="e.g. jdoe"
                    className="input w-full text-sm"
                  />
                </div>
              </div>

              {/* Row 2: Due Date & Recurring */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-muted mb-1">Due Date</label>
                  <input
                    type="date"
                    value={meta.due_date}
                    onChange={e => handleMetaChange({ due_date: e.target.value })}
                    className="input w-full text-sm"
                  />
                </div>
                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <div
                      onClick={() => handleMetaChange({ recurring_issue: !meta.recurring_issue })}
                      className={`w-9 h-5 rounded-full transition-colors cursor-pointer ${meta.recurring_issue ? 'bg-orange-500' : 'bg-surface-600'}`}
                    >
                      <div className={`w-3.5 h-3.5 bg-white rounded-full mt-0.5 transition-transform ${meta.recurring_issue ? 'translate-x-4 ml-0.5' : 'ml-0.5'}`} />
                    </div>
                    <span className="text-xs text-muted">Recurring Issue</span>
                  </label>
                </div>
              </div>

              {/* Recurring Reason (Conditional) */}
              {meta.recurring_issue && (
                <div className="bg-orange-900/10 border border-orange-800/30 rounded p-3">
                  <label className="block text-xs text-orange-400/80 mb-1">Why is this recurring?</label>
                  <input
                    type="text"
                    value={meta.recurring_reason}
                    onChange={e => handleMetaChange({ recurring_reason: e.target.value })}
                    placeholder="e.g. Supplier habitually ships short..."
                    className="input w-full text-sm border-orange-800/50 focus:border-orange-500/50"
                  />
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-xs text-muted mb-1">Root Cause Notes</label>
                <textarea
                  id="detail-note-field"
                  value={note}
                  onChange={e => handleNoteChange(e.target.value)}
                  placeholder="Add details about the investigation… (auto-saved)"
                  className="input w-full h-20 resize-none text-sm"
                />
              </div>

              {/* Actions */}
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-xs text-muted mb-1">Corrective Action</label>
                  <input
                    type="text"
                    value={meta.corrective_action}
                    onChange={e => handleMetaChange({ corrective_action: e.target.value })}
                    placeholder="Immediate fix…"
                    className="input w-full text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1">Prevention Action</label>
                  <input
                    type="text"
                    value={meta.prevention_action}
                    onChange={e => handleMetaChange({ prevention_action: e.target.value })}
                    placeholder="Long-term fix…"
                    className="input w-full text-sm"
                  />
                </div>
              </div>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children, rightAccessory }: { title: string; children: React.ReactNode; rightAccessory?: React.ReactNode }) {
  return (
    <div>
      <div className="flex justify-between items-end mb-3">
        <p className="text-xs font-semibold text-muted uppercase tracking-wider">{title}</p>
        {rightAccessory}
      </div>
      {children}
    </div>
  );
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-surface-700/50">
      <span className="text-xs text-muted">{label}</span>
      <span className="text-xs font-mono text-gray-300">{value}</span>
    </div>
  );
}

function MetricCard({ label, value, sub, warn }: { label: string; value: string; sub: string; warn?: boolean }) {
  return (
    <div className={`rounded-lg p-3 border ${warn ? 'bg-red-900/15 border-red-800/40' : 'bg-surface-700 border-surface-600'}`}>
      <p className="text-xs text-muted mb-1">{label}</p>
      <p className={`text-lg font-bold font-mono ${warn ? 'text-red-400' : 'text-gray-200'}`}>{value}</p>
      {sub && <p className="text-xs text-muted mt-0.5">{sub}</p>}
    </div>
  );
}
