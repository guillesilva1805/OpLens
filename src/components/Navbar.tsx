import type { ViewType } from '../types';

interface Props {
  currentView: ViewType;
  dataSource: 'demo' | 'csv' | null;
  recordCount: number;
  exceptionCount: number;
  unreadAlertCount: number;
  emailVerified: boolean;
  onNavigate: (view: ViewType) => void;
  onNewDataSource: () => void;
  onOpenEmailSettings: () => void;
}

export default function Navbar({ currentView, dataSource, recordCount, exceptionCount, unreadAlertCount, emailVerified, onNavigate, onNewDataSource, onOpenEmailSettings }: Props) {
  return (
    <nav className="bg-surface-800 border-b border-surface-600 px-4 py-0 flex-shrink-0">
      <div className="max-w-screen-2xl mx-auto flex items-center h-12">
        {/* Logo */}
        <button
          onClick={() => onNewDataSource()}
          className="flex items-center gap-2.5 mr-8 group"
          id="nav-logo"
        >
          <div className="w-7 h-7 bg-accent rounded flex items-center justify-center group-hover:bg-accent-hover transition-colors">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <span className="text-sm font-bold text-white tracking-tight">OpsLens</span>
        </button>

        {/* Nav items (only when data is loaded) */}
        {dataSource && (
          <div className="flex items-center gap-1">
            <NavItem
              label="Dashboard"
              active={currentView === 'dashboard'}
              onClick={() => onNavigate('dashboard')}
              id="nav-dashboard"
            />
            <NavItem
              label={`Exception Queue ${exceptionCount > 0 ? `(${exceptionCount})` : ''}`}
              active={currentView === 'queue'}
              onClick={() => onNavigate('queue')}
              id="nav-queue"
            />
          </div>
        )}

        {/* Right side meta */}
        <div className="ml-auto flex items-center gap-3">
          {dataSource && (
            <span className="text-xs text-muted hidden sm:block">
              <span className="text-surface-500 mr-1">{dataSource === 'demo' ? 'Demo data' : 'CSV upload'} ·</span>
              <span className="font-mono">{recordCount} SKUs</span>
            </span>
          )}

          {/* Alerts bell */}
          {dataSource && (
            <button
              onClick={() => onNavigate('notifications')}
              className={`relative p-1.5 rounded-md transition-colors ${
                currentView === 'notifications'
                  ? 'text-white bg-surface-700'
                  : 'text-muted hover:text-gray-300 hover:bg-surface-700'
              }`}
              title="Alerts"
              id="nav-notifications"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadAlertCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-accent rounded-full flex items-center justify-center text-white font-bold px-0.5" style={{ fontSize: '9px' }}>
                  {unreadAlertCount > 99 ? '99+' : unreadAlertCount}
                </span>
              )}
            </button>
          )}

          {/* Email settings button – always visible so user can configure any time */}
          <button
            onClick={onOpenEmailSettings}
            className="relative p-1.5 rounded-md transition-colors text-muted hover:text-gray-300 hover:bg-surface-700"
            title="Email notification settings"
            id="nav-email-settings"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            {emailVerified && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full" />
            )}
          </button>

          {dataSource && (
            <button
              onClick={onNewDataSource}
              className="btn-ghost text-xs"
              id="nav-new-datasource"
            >
              New Session
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

function NavItem({ label, active, onClick, id }: { label: string; active: boolean; onClick: () => void; id: string }) {
  return (
    <button
      id={id}
      onClick={onClick}
      className={`relative text-xs font-medium px-3 py-1.5 transition-colors ${
        active
          ? 'text-white'
          : 'text-muted hover:text-gray-300'
      }`}
    >
      {label}
      {active && (
        <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-accent rounded-full" />
      )}
    </button>
  );
}
