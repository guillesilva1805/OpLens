import { Component, type ReactNode } from 'react';
import { I18nContext } from '../i18n';

interface Props { children: ReactNode }
interface State { error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  static contextType = I18nContext;
  declare context: React.ContextType<typeof I18nContext>;

  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-surface-900 flex items-center justify-center px-4">
          <div className="card p-8 max-w-md w-full text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-900/40 border border-red-700/50 flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-white font-semibold">{this.context.t('error.title')}</h2>
            <p className="text-xs text-muted font-mono break-all">{this.state.error.message}</p>
            <button
              className="btn-primary text-sm"
              onClick={() => { this.setState({ error: null }); window.location.reload(); }}
            >
              {this.context.t('error.reload')}
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
