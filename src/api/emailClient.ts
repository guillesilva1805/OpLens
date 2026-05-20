import type { EmailPreferences } from '../types';

const API_BASE = '/api';

export const emailClient = {
  async getPreferences(): Promise<EmailPreferences> {
    const res = await fetch(`${API_BASE}/preferences`);
    if (!res.ok) throw new Error('Failed to fetch preferences');
    return res.json();
  },

  async savePreferences(prefs: Partial<EmailPreferences>): Promise<EmailPreferences> {
    const res = await fetch(`${API_BASE}/preferences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(prefs)
    });
    if (!res.ok) throw new Error('Failed to save preferences');
    return res.json();
  },

  async requestVerification(email: string): Promise<void> {
    const res = await fetch(`${API_BASE}/verify/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    if (!res.ok) throw new Error('Failed to request verification');
  },

  async confirmVerification(email: string, token: string): Promise<void> {
    const res = await fetch(`${API_BASE}/verify/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, token })
    });
    if (!res.ok) throw new Error('Verification failed. Token may be invalid or expired.');
  },

  async sendTestEmail(): Promise<void> {
    const res = await fetch(`${API_BASE}/test-email`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Failed to send test email');
  },

  async triggerCriticalException(sku: string, location: string, exceptionType: string, reason: string, priority: string): Promise<void> {
    const res = await fetch(`${API_BASE}/trigger-critical`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sku, location, exceptionType, reason, priority })
    });
    if (!res.ok) throw new Error('Failed to trigger exception email');
  },

  async triggerDailySummary(exceptionCount: number, listSnippetHtml: string): Promise<void> {
    const res = await fetch(`${API_BASE}/daily-summary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exceptionCount, listSnippetHtml })
    });
    if (!res.ok) throw new Error('Failed to send daily summary');
  }
};
