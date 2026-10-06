import type { ProcessedRecord, ExceptionType, Priority } from '../types';
import { getExceptionLabel, getExceptionColor, getPriorityLabel } from '../utils/ui';
import { useI18n } from '../i18n';

interface Props {
  records: ProcessedRecord[];
  onNavigateToQueue: () => void;
  onNewDataSource: () => void;
}

const EXCEPTION_TYPES: ExceptionType[] = [
  'stockout_risk', 'low_stock', 'count_mismatch', 'aging', 'manual_review',
];

const EXCEPTION_COLORS: Record<ExceptionType, string> = {
  stockout_risk: 'bg-red-500',
  low_stock: 'bg-orange-500',
  count_mismatch: 'bg-yellow-500',
  aging: 'bg-purple-500',
  manual_review: 'bg-blue-500',
};

const PRIORITY_COLORS: Record<Priority, string> = {
  critical: 'text-red-400',
  high: 'text-orange-400',
  medium: 'text-yellow-400',
  low: 'text-green-400',
  none: 'text-gray-500',
};

export default function Dashboard({ records, onNavigateToQueue, onNewDataSource }: Props) {
  const { t, locale } = useI18n();
  const exceptions = records.filter(r => r.exception_types.length > 0);
  const critical = records.filter(r => r.priority === 'critical');
  const high = records.filter(r => r.priority === 'high');

  const breakdownCounts = EXCEPTION_TYPES.map(type => ({
    type,
    count: records.filter(r => r.exception_types.includes(type)).length,
  })).filter(x => x.count > 0);

  const maxCount = Math.max(...breakdownCounts.map(x => x.count), 1);

  const priorityBreakdown: { priority: Priority; count: number }[] = (
    [
      { priority: 'critical', count: critical.length },
      { priority: 'high', count: high.length },
      { priority: 'medium', count: records.filter(r => r.priority === 'medium').length },
      { priority: 'low', count: records.filter(r => r.priority === 'low').length },
    ] as { priority: Priority; count: number }[]
  ).filter(x => x.count > 0);

  // ── Financial Impact Metrics ─────────────────────────────────────────────────────────
  let agingValue = 0;
  let discrepancyValue = 0;
  let stockoutValue = 0;

  let actualImpact = 0;
  let estimatedImpact = 0;
  let totalActualCostRecords = 0;

  records.forEach(r => {
    const cost = r.unit_cost || 0;
    let itemImpact = 0;
    
    if (r.exception_types.includes('aging') && r.on_hand_qty != null) {
      const val = Math.max(0, r.on_hand_qty * cost);
      agingValue += val;
      itemImpact += val;
    }
    
    if (r.exception_types.includes('count_mismatch') && r.system_qty != null && r.counted_qty != null) {
      const val = Math.abs(r.system_qty - r.counted_qty) * cost;
      discrepancyValue += val;
      itemImpact += val;
    }
    
    if (r.exception_types.includes('stockout_risk') && r.reorder_point != null && r.on_hand_qty != null) {
      const val = Math.max(0, r.reorder_point - r.on_hand_qty) * cost;
      stockoutValue += val;
      itemImpact += val;
    }

    if (r.exception_types.length > 0) {
      if (r.is_cost_estimated) {
        estimatedImpact += itemImpact;
      } else {
        totalActualCostRecords++;
        actualImpact += itemImpact;
      }
    }
  });

  const totalImpact = actualImpact + estimatedImpact;
  const coveragePct = exceptions.length > 0
    ? Math.round((totalActualCostRecords / exceptions.length) * 100)
    : 0;

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

  // ── Operational Maturity Metrics ──────────────────────────────────────────────────
  const unresolvedExceptions = exceptions.filter(r => r.status !== 'Resolved');
  const withoutRootCause = unresolvedExceptions.filter(r => !r.case_metadata.root_cause).length;
  const recurringIssues = unresolvedExceptions.filter(r => r.case_metadata.recurring_issue).length;
  
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const overdueCount = unresolvedExceptions.filter(r => {
    if (!r.case_metadata.due_date) return false;
    const due = new Date(r.case_metadata.due_date);
    due.setHours(0, 0, 0, 0);
    return due < now;
  }).length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white">{t('dash.title')}</h2>
          <p className="text-sm text-muted mt-0.5">{t('dash.subtitle')} · {new Date().toLocaleDateString(locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onNewDataSource} className="btn-ghost text-xs" id="btn-new-datasource">
            {t('dash.newSource')}
          </button>
          <button onClick={onNavigateToQueue} className="btn-primary" id="btn-view-queue">
            {t('dash.viewQueue')}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label={t('dash.totalSkus')}
          value={records.length}
          sub={t('dash.inDataset')}
          icon={
            <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          }
        />
        <StatCard
          label={t('dash.withExceptions')}
          value={exceptions.length}
          sub={t('dash.pctInventory', { pct: records.length > 0 ? Math.round((exceptions.length / records.length) * 100) : 0 })}
          icon={
            <svg className="w-5 h-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
          highlight="orange"
        />
        <StatCard
          label={t('priority.critical')}
          value={critical.length}
          sub={t('dash.expediteNow')}
          icon={
            <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          highlight="red"
        />
        <StatCard
          label={t('dash.highPriority')}
          value={high.length}
          sub={t('dash.actionThisWeek')}
          icon={
            <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          }
          highlight="yellow"
        />
      </div>

      {/* Operational Maturity KPIs */}
      {exceptions.length > 0 && (
        <div className="mb-8 p-5 bg-surface-800 border border-surface-600 rounded-xl">
          <div className="flex items-center gap-3 mb-4">
            <h3 className="text-sm font-semibold text-gray-100 uppercase tracking-wider">{t('dash.opMaturity')}</h3>
            <span className="text-[10px] text-muted px-2 py-0.5 rounded-full border border-surface-600 bg-surface-700/50 uppercase tracking-wide">
              {t('dash.rootCauseWorkflow')}
            </span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label={t('dash.pendingRootCause')}
              value={withoutRootCause}
              sub={t('dash.pctUnresolved', { pct: unresolvedExceptions.length > 0 ? Math.round((withoutRootCause / unresolvedExceptions.length) * 100) : 0 })}
              icon={
                <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              highlight={withoutRootCause > 0 ? 'yellow' : undefined}
            />
            <StatCard
              label={t('dash.recurringIssues')}
              value={recurringIssues}
              sub={t('dash.repeatOffenders')}
              icon={
                <svg className="w-5 h-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              }
              highlight={recurringIssues > 0 ? 'orange' : undefined}
            />
            <StatCard
              label={t('dash.overdueActions')}
              value={overdueCount}
              sub={t('dash.missedDueDates')}
              icon={
                <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              highlight={overdueCount > 0 ? 'red' : undefined}
            />
            <StatCard
              label={t('dash.resolvedCases')}
              value={exceptions.filter(r => r.status === 'Resolved').length}
              sub={t('dash.totalClosed')}
              icon={
                <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              }
            />
          </div>
        </div>
      )}

      {/* Financial Impact KPIs */}
      {exceptions.length > 0 && (
        <div className="mb-8 p-5 bg-surface-800 border border-surface-600 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-semibold text-gray-100 uppercase tracking-wider">{t('dash.estImpact')}</h3>
              <span className="text-[10px] text-muted px-2 py-0.5 rounded-full border border-surface-600 bg-surface-700/50 uppercase tracking-wide">
                {t('dash.exposureAnalysis')}
              </span>
            </div>
            {/* Cost Coverage Indicator */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted">{t('dash.costCoverage')}</span>
              <div className="flex items-center gap-1.5 font-mono">
                <span className={coveragePct === 100 ? "text-green-400 font-bold" : "text-gray-300"}>{t('dash.pctActual', { pct: coveragePct })}</span>
                <span className="text-muted">/</span>
                <span className={coveragePct < 100 ? "text-yellow-500 font-bold" : "text-gray-500"}>{t('dash.pctEstimated', { pct: 100 - coveragePct })}</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label={t('dash.totalValueExposed')}
              value={formatCurrency(totalImpact)}
              sub={estimatedImpact > 0 ? t('dash.includesEstimated', { amount: formatCurrency(estimatedImpact) }) : t('dash.actualBasis')}
              icon={
                <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              highlight="red"
            />
            <StatCard
              label={t('dash.stockoutExposure')}
              value={formatCurrency(stockoutValue)}
              sub={t('dash.replacementValue')}
              icon={
                <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                </svg>
              }
            />
            <StatCard
              label={t('dash.discrepancy')}
              value={formatCurrency(discrepancyValue)}
              sub={t('dash.lostFound')}
              icon={
                <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              }
            />
            <StatCard
              label={t('dash.agingCapital')}
              value={formatCurrency(agingValue)}
              sub={t('dash.capitalTiedUp')}
              icon={
                <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
          </div>
          <p className="text-xs text-muted mt-4">
            {t('dash.impactDisclaimer')}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Exception type breakdown */}
        <div className="card p-6">
          <h3 className="text-sm font-semibold text-gray-200 mb-5 uppercase tracking-wider">{t('dash.byType')}</h3>
          {breakdownCounts.length === 0 ? (
            <p className="text-sm text-muted text-center py-8">{t('dash.noExceptions')}</p>
          ) : (
            <div className="space-y-3">
              {breakdownCounts.map(({ type, count }) => (
                <div key={type}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-sm font-medium ${getExceptionColor(type)}`}>{getExceptionLabel(type, t)}</span>
                    <span className="text-sm text-gray-400 font-mono">{count}</span>
                  </div>
                  <div className="h-2 bg-surface-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${EXCEPTION_COLORS[type]} transition-all duration-500`}
                      style={{ width: `${(count / maxCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Priority distribution */}
        <div className="card p-6">
          <h3 className="text-sm font-semibold text-gray-200 mb-5 uppercase tracking-wider">{t('dash.byPriority')}</h3>
          {priorityBreakdown.length === 0 ? (
            <p className="text-sm text-muted text-center py-8">{t('dash.noExceptions')}</p>
          ) : (
            <div className="space-y-4">
              {priorityBreakdown.map(({ priority, count }) => (
                <div key={priority} className="flex items-center gap-4">
                  <span className={`text-sm font-semibold w-16 flex-shrink-0 ${PRIORITY_COLORS[priority]}`}>{getPriorityLabel(priority, t)}</span>
                  <div className="flex-1 h-6 bg-surface-700 rounded overflow-hidden">
                    <div
                      className="h-full flex items-center justify-end pr-2"
                      style={{
                        width: `${(count / (exceptions.length || 1)) * 100}%`,
                        background: priority === 'critical' ? '#7f1d1d50' : priority === 'high' ? '#7c2d1250' : priority === 'medium' ? '#71350050' : '#14532d50',
                        borderRight: `2px solid ${priority === 'critical' ? '#ef4444' : priority === 'high' ? '#f97316' : priority === 'medium' ? '#eab308' : '#22c55e'}`,
                      }}
                    >
                      <span className={`text-xs font-mono ${PRIORITY_COLORS[priority]}`}>{count}</span>
                    </div>
                  </div>
                </div>
              ))}
              <div className="pt-2 border-t border-surface-600 mt-2">
                <div className="flex items-center justify-between text-xs text-muted">
                  <span>{t('dash.cleanSkus')}</span>
                  <span className="font-mono text-green-400">{records.length - exceptions.length}</span>
                </div>
              </div>
            </div>
          )}

          {/* Quick action */}
          {critical.length > 0 && (
            <button
              onClick={onNavigateToQueue}
              className="mt-5 w-full btn-primary text-center text-sm"
              id="btn-review-critical"
            >
              {t(critical.length === 1 ? 'dash.reviewCriticalOne' : 'dash.reviewCriticalMany', { n: critical.length })}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label, value, sub, icon, highlight,
}: {
  label: string;
  value: number | string;
  sub: string;
  icon: React.ReactNode;
  highlight?: 'red' | 'orange' | 'yellow';
}) {
  const borderColorMap: Record<string, string> = {
    red: 'border-red-800/50',
    orange: 'border-orange-800/50',
    yellow: 'border-yellow-800/50',
  };
  const borderColor = highlight ? (borderColorMap[highlight] ?? '') : '';

  const glowBgMap: Record<string, string> = {
    red: 'bg-red-900/10',
    orange: 'bg-orange-900/10',
    yellow: 'bg-yellow-900/10',
  };
  const glowBg = highlight ? (glowBgMap[highlight] ?? '') : '';

  return (
    <div className={`card p-5 ${borderColor} ${glowBg}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-lg bg-surface-700 flex items-center justify-center">{icon}</div>
      </div>
      <p className="text-3xl font-bold text-white font-mono mb-1">{value}</p>
      <p className="text-xs text-gray-400 font-medium">{label}</p>
      <p className="text-xs text-muted mt-0.5">{sub}</p>
    </div>
  );
}
