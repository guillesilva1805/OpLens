import { useState } from 'react';
import type { VerificationStatus } from '../types';
import { emailClient } from '../api/emailClient';
import { useI18n } from '../i18n';

interface Props {
  currentEmail: string;
  currentStatus: VerificationStatus;
  onSave: (email: string, status: VerificationStatus) => void;
  onClose: () => void;
}

/** Simple email regex. Backend will do real validation in Phase 2. */
function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

export default function EmailVerificationModal({ currentEmail, currentStatus, onSave, onClose }: Props) {
  const [email, setEmail] = useState(currentEmail);
  const [status, setStatus] = useState<VerificationStatus>(currentStatus);
  const [error, setError] = useState('');
  const [simulating, setSimulating] = useState(false);
  const { t } = useI18n();

  /* --- handlers --- */

  async function handleSaveEmail() {
    if (!isValidEmail(email)) {
      setError(t('email.invalid'));
      return;
    }
    setError('');
    
    // If we're setting a new email, it needs verification
    const needsVerification = email !== currentEmail;
    const nextStatus: VerificationStatus = needsVerification ? 'pending' : status;
    setStatus(nextStatus);
    onSave(email.trim(), nextStatus);

    if (needsVerification) {
      setSimulating(true);
      try {
        await emailClient.requestVerification(email.trim());
        alert(t('email.verificationSent'));
      } catch {
        setError(t('email.failedSend'));
      } finally {
        setSimulating(false);
      }
    }
  }

  async function handleResend() {
    setError('');
    setSimulating(true);
    try {
      await emailClient.requestVerification(email.trim());
      alert(t('email.resent'));
    } catch {
      setError(t('email.failedResend'));
    } finally {
      setSimulating(false);
    }
  }

  function handleClearEmail() {
    setEmail('');
    setStatus('unverified');
    onSave('', 'unverified');
  }

  /* --- status badge helpers --- */

  const badgeClass = {
    unverified: 'bg-surface-700 text-muted border-surface-500',
    pending: 'bg-yellow-900/60 text-yellow-300 border-yellow-700',
    verified: 'bg-green-900/60 text-green-300 border-green-700',
  }[status];

  const badgeLabel = {
    unverified: t('email.notSet'),
    pending: t('email.pending'),
    verified: t('email.verified'),
  }[status];

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="card w-full max-w-md mx-4 p-6 shadow-2xl animate-fade-in"
        style={{ borderColor: '#2d3748' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="email-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 id="email-modal-title" className="text-base font-semibold text-white flex items-center gap-2">
            {/* Envelope icon */}
            <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            {t('email.address')}
          </h2>
          <button onClick={onClose} className="text-muted hover:text-gray-200 transition-colors" id="email-modal-close" aria-label={t('app.close')}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Status badge */}
        <div className={`inline-flex items-center gap-1.5 border rounded-full text-xs font-medium px-2.5 py-0.5 mb-5 ${badgeClass}`}>
          {status === 'pending' && (
            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )}
          {badgeLabel}
        </div>

        {/* Input */}
        <label className="block text-xs text-muted mb-1.5 font-medium" htmlFor="email-input">
          {t('email.address')}
        </label>
        <input
          id="email-input"
          type="email"
          value={email}
          onChange={e => { setEmail(e.target.value); setError(''); }}
          placeholder="you@example.com"
          className="input w-full mb-1"
          autoComplete="email"
        />
        {error && <p className="text-red-400 text-xs mt-1 mb-2">{error}</p>}

        {/* Phase 2 notice */}
        {status === 'pending' ? (
          <div className="mt-3 mb-5 p-3 rounded-md bg-yellow-900/30 border border-yellow-700/50 text-yellow-300 text-xs leading-relaxed">
            <div className="flex items-center gap-2 mb-1.5 font-bold">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span>{t('email.sentTitle')}</span>
            </div>
            <p className="ml-6">
              {t('email.sentBody')}
            </p>
          </div>
        ) : (
          <p className="text-xs text-muted mt-2 mb-5 leading-relaxed">
            {t('email.enterAddress')}
          </p>
        )}

        {/* Action row */}

        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="email-modal-save"
            onClick={handleSaveEmail}
            disabled={simulating}
            className="btn-primary text-xs"
          >
            {simulating ? t('email.processing') : t('email.saveAddress')}
          </button>

          {status === 'pending' && (
            <button
              id="email-modal-resend"
              onClick={handleResend}
              disabled={simulating}
              className="btn-secondary text-xs"
            >
              {t('email.resendLink')}
            </button>
          )}

          {status === 'verified' && (
            <button
              id="email-modal-clear"
              onClick={handleClearEmail}
              className="btn-ghost text-xs text-red-400 hover:text-red-300"
            >
              {t('email.removeEmail')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
