import type { EmailPreferences, EmailExceptionType, DayOfWeek } from '../types';
import { emailClient } from '../api/emailClient';

interface Props {
  prefs: EmailPreferences;
  onChange: (prefs: EmailPreferences) => void;
  onOpenEmailModal: () => void;
}

const DAY_LABELS: { day: DayOfWeek; label: string; short: string }[] = [
  { day: 0, label: 'Sunday',    short: 'S' },
  { day: 1, label: 'Monday',    short: 'M' },
  { day: 2, label: 'Tuesday',   short: 'T' },
  { day: 3, label: 'Wednesday', short: 'W' },
  { day: 4, label: 'Thursday',  short: 'T' },
  { day: 5, label: 'Friday',    short: 'F' },
  { day: 6, label: 'Saturday',  short: 'S' },
];

const EXCEPTION_TYPE_LABELS: { type: EmailExceptionType; label: string; color: string }[] = [
  { type: 'low_stock',      label: 'Low Stock',       color: 'text-orange-400' },
  { type: 'stockout_risk',  label: 'Stockout Risk',   color: 'text-red-400'    },
  { type: 'count_mismatch', label: 'Count Mismatch',  color: 'text-yellow-400' },
  { type: 'aging',          label: 'Aging / No Move', color: 'text-blue-400'   },
  { type: 'manual_review',  label: 'Manual Review',   color: 'text-purple-400' },
];

export default function EmailPreferences({ prefs, onChange, onOpenEmailModal }: Props) {
  /* ─── helpers ─── */

  function set<K extends keyof EmailPreferences>(field: K, value: EmailPreferences[K]) {
    onChange({ ...prefs, [field]: value });
  }

  function toggleDay(day: DayOfWeek) {
    const next = prefs.scheduledDays.includes(day)
      ? prefs.scheduledDays.filter(d => d !== day)
      : [...prefs.scheduledDays, day].sort((a, b) => a - b) as DayOfWeek[];
    set('scheduledDays', next);
  }

  function toggleExceptionType(type: EmailExceptionType) {
    const next = prefs.exceptionTypes.includes(type)
      ? prefs.exceptionTypes.filter((t: EmailExceptionType) => t !== type)
      : [...prefs.exceptionTypes, type];
    set('exceptionTypes', next as EmailExceptionType[]);
  }

  /* ─── status badge ─── */

  const emailBadge = {
    unverified: { label: 'Not set',              cls: 'bg-surface-700 text-muted border-surface-500' },
    pending:    { label: 'Pending verification', cls: 'bg-yellow-900/60 text-yellow-300 border-yellow-700' },
    verified:   { label: '✓ Verified',           cls: 'bg-green-900/60 text-green-300 border-green-700' },
  }[prefs.verificationStatus];

  const isVerified = prefs.verificationStatus === 'verified';

  return (
    <div className="space-y-6">

      {/* ── Email address card ── */}
      <section className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Notification email
          </h3>
          <span className={`inline-flex items-center border rounded-full text-xs font-medium px-2.5 py-0.5 ${emailBadge.cls}`}>
            {emailBadge.label}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 bg-surface-700 border border-surface-500 rounded-md px-3 py-2 text-sm text-gray-200 font-mono truncate min-w-0">
            {prefs.email || <span className="text-muted italic">No email set</span>}
          </div>
          {isVerified && (
            <button
              onClick={() => {
                emailClient.sendTestEmail().then(() => alert('Test email sent!')).catch(e => alert(e.message));
              }}
              className="btn-secondary px-2.5 py-2 text-xs flex-shrink-0"
              title="Send an immediate test email"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          )}
          <button
            id="email-prefs-edit-btn"
            onClick={onOpenEmailModal}
            className="btn-secondary text-xs flex-shrink-0"
          >
            {prefs.email ? 'Change' : 'Add email'}
          </button>
        </div>

        {!isVerified && prefs.email && (
          <p className="text-yellow-400 text-xs mt-2 flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Email requires verification before notifications can be sent.
          </p>
        )}
      </section>

      {/* ── Daily summary card ── */}
      <section className="card p-5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Daily summary digest
          </h3>

          {/* Toggle */}
          <button
            id="email-prefs-digest-toggle"
            onClick={() => set('dailySummaryEnabled', !prefs.dailySummaryEnabled)}
            disabled={!isVerified}
            title={!isVerified ? 'Verify your email first' : undefined}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              prefs.dailySummaryEnabled && isVerified ? 'bg-accent' : 'bg-surface-600'
            } ${!isVerified ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
              prefs.dailySummaryEnabled && isVerified ? 'translate-x-4' : 'translate-x-0.5'
            }`} />
          </button>
        </div>
        <p className="text-xs text-muted mb-4">Receive a scheduled email with the full exception list.</p>

        {/* Days of week */}
        <div className="mb-4">
          <label className="block text-xs text-muted font-medium mb-2">Send on days</label>
          <div className="flex gap-1.5 flex-wrap">
            {DAY_LABELS.map(({ day, label, short }) => {
              const active = prefs.scheduledDays.includes(day);
              return (
                <button
                  key={day}
                  id={`email-prefs-day-${day}`}
                  onClick={() => toggleDay(day)}
                  disabled={!isVerified || !prefs.dailySummaryEnabled}
                  title={label}
                  className={`w-8 h-8 rounded-full text-xs font-semibold border transition-colors ${
                    active && isVerified && prefs.dailySummaryEnabled
                      ? 'bg-accent text-white border-accent'
                      : 'bg-surface-700 text-muted border-surface-500 hover:border-surface-400'
                  } ${(!isVerified || !prefs.dailySummaryEnabled) ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  {short}
                </button>
              );
            })}
          </div>
        </div>

        {/* Delivery time */}
        <div>
          <label htmlFor="email-prefs-time" className="block text-xs text-muted font-medium mb-1.5">
            Delivery time
          </label>
          <div className="flex items-center gap-2">
            <input
              id="email-prefs-time"
              type="time"
              value={prefs.scheduledTime}
              onChange={e => set('scheduledTime', e.target.value)}
              disabled={!isVerified || !prefs.dailySummaryEnabled}
              className={`input w-32 ${(!isVerified || !prefs.dailySummaryEnabled) ? 'opacity-40 cursor-not-allowed' : ''}`}
            />
            <span className="text-xs text-surface-400">
              {Intl.DateTimeFormat().resolvedOptions().timeZone}
            </span>
          </div>
        </div>
      </section>

      {/* ── Exception filters card ── */}
      <section className="card p-5">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-1">
          <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          Exception filters
        </h3>
        <p className="text-xs text-muted mb-4">Choose which exception types trigger notification emails.</p>

        {/* Critical only toggle */}
        <div className="flex items-center justify-between mb-4 p-3 bg-surface-700/50 rounded-md border border-surface-600">
          <div>
            <p className="text-xs font-medium text-gray-200">Critical priority only</p>
            <p className="text-xs text-muted mt-0.5">Skip medium and low-priority exceptions.</p>
          </div>
          <button
            id="email-prefs-critical-toggle"
            onClick={() => set('criticalOnly', !prefs.criticalOnly)}
            disabled={!isVerified}
            title={!isVerified ? 'Verify your email first' : undefined}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              prefs.criticalOnly && isVerified ? 'bg-red-600' : 'bg-surface-600'
            } ${!isVerified ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
              prefs.criticalOnly && isVerified ? 'translate-x-4' : 'translate-x-0.5'
            }`} />
          </button>
        </div>

        {/* Exception type checkboxes */}
        <div className="space-y-2">
          {EXCEPTION_TYPE_LABELS.map(({ type, label, color }) => {
            const checked = prefs.exceptionTypes.includes(type);
            return (
              <label
                key={type}
                htmlFor={`email-prefs-exception-${type}`}
                className={`flex items-center gap-3 p-2.5 rounded-md border cursor-pointer transition-colors ${
                  checked && isVerified
                    ? 'bg-surface-700/70 border-surface-500'
                    : 'bg-surface-700/30 border-surface-600/50'
                } ${!isVerified ? 'opacity-40 cursor-not-allowed' : 'hover:bg-surface-700/60'}`}
              >
                <input
                  id={`email-prefs-exception-${type}`}
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleExceptionType(type)}
                  disabled={!isVerified}
                  className="accent-accent w-3.5 h-3.5 flex-shrink-0"
                />
                <span className={`text-xs font-medium ${color}`}>{label}</span>
              </label>
            );
          })}
        </div>
      </section>
    </div>
  );
}
