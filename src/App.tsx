import { useState, useEffect } from 'react';
import './index.css';
import type { ProcessedRecord, RawInventoryRecord, ViewType, AppNotification, EmailPreferences } from './types';
import { processRecords } from './engine/exceptionEngine';
import { generateNotifications } from './engine/notificationEngine';
import { saveNotificationRead, getEmailPreferences, saveEmailPreferences } from './storage/localStore';
import Navbar from './components/Navbar';
import ImportScreen from './components/ImportScreen';
import Dashboard from './components/Dashboard';
import ExceptionQueue from './components/ExceptionQueue';
import ItemDetail from './components/ItemDetail';
import NotificationsPanel from './components/NotificationsPanel';
import EmailPreferencesPanel from './components/EmailPreferences';
import EmailVerificationModal from './components/EmailVerificationModal';
import { emailClient } from './api/emailClient';

export default function App() {
  const [view, setView] = useState<ViewType>('import');
  const [records, setRecords] = useState<ProcessedRecord[]>([]);
  const [dataSource, setDataSource] = useState<'demo' | 'csv' | null>(null);
  const [selectedItem, setSelectedItem] = useState<ProcessedRecord | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // ─── Email prefs ───────────────────────────────────────────────────────────
  // Initialise synchronously from localStorage — no backend needed for Phase 1
  const [emailPrefs, setEmailPrefs] = useState<EmailPreferences>(() => getEmailPreferences());
  const [showEmailSettings, setShowEmailSettings] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);

  function handleEmailPrefsChange(prefs: EmailPreferences) {
    setEmailPrefs(prefs);
    saveEmailPreferences(prefs);
  }

  // Regenerate notifications whenever records change.
  // Read state is preserved via localStorage (stable IDs per SKU+location+alertType).
  useEffect(() => {
    setNotifications(generateNotifications(records));
  }, [records]);

  function handleDataLoaded(raw: RawInventoryRecord[], source: 'demo' | 'csv') {
    const processed = processRecords(raw);
    setRecords(processed);
    setDataSource(source);
    setView('dashboard');
    setSelectedItem(null);

    // Trigger critical exception emails for the loaded batch.
    // The backend handles deduplication and user preference filtering.
    if (emailPrefs && emailPrefs.verificationStatus === 'verified') {
      processed.forEach(record => {
        if (record.primary_exception_type) {
          emailClient.triggerCriticalException(
            record.sku,
            record.location,
            record.primary_exception_type,
            record.reason,
            record.priority
          ).catch((e) => console.error('Silent exception trigger error:', e));
        }
      });
    }
  }

  function handleNewDataSource() {
    setView('import');
    setRecords([]);
    setDataSource(null);
    setSelectedItem(null);
    setNotifications([]);
  }

  function handleSelectItem(record: ProcessedRecord) {
    setSelectedItem(record);
  }

  function handleCloseDetail() {
    setSelectedItem(null);
  }

  function handleUpdateRecord(updated: ProcessedRecord) {
    setRecords(prev => prev.map(r => r.id === updated.id ? updated : r));
    setSelectedItem(updated);
  }

  function handleMarkRead(id: string) {
    saveNotificationRead(id, true);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }

  function handleMarkAllRead() {
    notifications.forEach(n => saveNotificationRead(n.id, true));
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }

  /** Navigate to the exception queue and open the linked record detail. */
  function handleOpenRecordFromNotification(linkedRecordId: string) {
    const record = records.find(r => r.id === linkedRecordId);
    if (record) {
      setView('queue');
      setSelectedItem(record);
    }
  }

  const exceptionCount = records.filter(r => r.exception_types.length > 0).length;
  const unreadAlertCount = notifications.filter(n => !n.read).length;
  const emailVerified = emailPrefs ? emailPrefs.verificationStatus === 'verified' : false;

  return (
    <div className="min-h-screen flex flex-col bg-surface-900">
      <Navbar
        currentView={view}
        dataSource={dataSource}
        recordCount={records.length}
        exceptionCount={exceptionCount}
        unreadAlertCount={unreadAlertCount}
        emailVerified={emailVerified}
        onNavigate={setView}
        onNewDataSource={handleNewDataSource}
        onOpenEmailSettings={() => setShowEmailSettings(true)}
      />

      <main className="flex-1 overflow-hidden">
        {view === 'import' && (
          <ImportScreen onDataLoaded={handleDataLoaded} />
        )}

        {view === 'dashboard' && dataSource && (
          <div className="h-full overflow-y-auto">
            <Dashboard
              records={records}
              onNavigateToQueue={() => setView('queue')}
              onNewDataSource={handleNewDataSource}
            />
          </div>
        )}

        {view === 'queue' && dataSource && (
          <div className="h-full overflow-y-auto">
            <ExceptionQueue
              records={records}
              onSelectItem={handleSelectItem}
              onRecordsUpdate={setRecords}
              onBack={() => setView('dashboard')}
            />
          </div>
        )}

        {view === 'notifications' && dataSource && (
          <div className="h-full overflow-y-auto">
            <NotificationsPanel
              notifications={notifications}
              onMarkRead={handleMarkRead}
              onMarkAllRead={handleMarkAllRead}
              onOpenRecord={handleOpenRecordFromNotification}
              onBack={() => setView('dashboard')}
            />
          </div>
        )}
      </main>

      {selectedItem && (
        <ItemDetail
          record={selectedItem}
          onClose={handleCloseDetail}
          onUpdate={handleUpdateRecord}
        />
      )}

      {/* ── Email settings slide-over ─────────────────────────────────────── */}
      {showEmailSettings && (
        <div className="fixed inset-0 z-40 flex justify-end">
          {/* backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowEmailSettings(false)}
          />
          {/* panel */}
          <div className="relative w-full max-w-sm bg-surface-900 border-l border-surface-600 flex flex-col shadow-2xl z-10">
            {/* panel header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-600 flex-shrink-0">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Email notifications
              </h2>
              <button
                id="email-settings-close"
                onClick={() => setShowEmailSettings(false)}
                className="text-muted hover:text-gray-200 transition-colors"
                aria-label="Close"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {/* Phase 2 banner */}
            <div className="mx-5 mt-4 px-3 py-2 rounded-md bg-green-900/30 border border-green-700/50 text-green-300 text-xs flex items-start gap-2">
              <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span><strong>Phase 2 – Active backend.</strong> Preferences sync to server. Emails trigger on critical exceptions if opted in.</span>
            </div>
            {/* scrollable body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {emailPrefs && (
                <EmailPreferencesPanel
                  prefs={emailPrefs}
                  onChange={handleEmailPrefsChange}
                  onOpenEmailModal={() => setShowEmailModal(true)}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Email verification modal ──────────────────────────────────────── */}
      {showEmailModal && emailPrefs && (
        <EmailVerificationModal
          currentEmail={emailPrefs.email}
          currentStatus={emailPrefs.verificationStatus}
          onSave={(email, verificationStatus) => {
            // Note: actual trigger goes via Modal explicitly on Phase 2, this is just for optimistic state
            handleEmailPrefsChange({ ...emailPrefs, email, verificationStatus });
          }}
          onClose={() => setShowEmailModal(false)}
        />
      )}
    </div>

  );
}
