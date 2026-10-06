import type { ViewType } from '../types';
import { useI18n, type Lang } from '../i18n';
import gsMark from '../assets/gs-mark.png';

const LANGS: Lang[] = ['es', 'en'];

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
  const { t, lang, setLang } = useI18n();
  return (
    <nav className="bg-surface-800 border-b border-surface-600 px-4 py-0 flex-shrink-0">
      <div className="max-w-screen-2xl mx-auto flex items-center h-12">
        {/* Logo */}
        <button
          onClick={() => onNewDataSource()}
          className="flex items-center gap-2.5 mr-8 group"
          id="nav-logo"
        >
          <img
            src={gsMark}
            alt="Guillermo Silva"
            className="w-8 h-8 rounded-md bg-white ring-1 ring-surface-600 group-hover:ring-accent transition-shadow"
          />
          <span className="text-sm font-bold text-white tracking-tight">OpsLens</span>
        </button>

        {/* Nav items (only when data is loaded) */}
        {dataSource && (
          <div className="flex items-center gap-1">
            <NavItem
              label={t('nav.dashboard')}
              active={currentView === 'dashboard'}
              onClick={() => onNavigate('dashboard')}
              id="nav-dashboard"
            />
            <NavItem
              label={`${t('nav.queue')} ${exceptionCount > 0 ? `(${exceptionCount})` : ''}`}
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
              <span className="text-surface-500 mr-1">{dataSource === 'demo' ? t('nav.demoData') : t('nav.csvUpload')} ·</span>
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
              title={t('nav.alerts')}
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
            title={t('nav.emailSettings')}
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
              {t('nav.newSession')}
            </button>
          )}

          {/* Language switch */}
          <div
            className="flex items-center rounded-md border border-surface-600 bg-surface-700 p-0.5"
            role="group"
            aria-label={t('nav.language')}
            id="nav-language"
          >
            {LANGS.map(code => (
              <button
                key={code}
                id={`nav-lang-${code}`}
                onClick={() => setLang(code)}
                aria-pressed={lang === code}
                className={`px-2 py-0.5 rounded text-xs font-semibold uppercase transition-colors ${
                  lang === code ? 'bg-accent text-white' : 'text-muted hover:text-gray-200'
                }`}
              >
                {code}
              </button>
            ))}
          </div>
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
