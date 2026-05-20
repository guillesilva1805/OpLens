import type { Status, EmailPreferences, CaseMetadata } from '../types';
import { DEFAULT_EMAIL_PREFS, DEFAULT_CASE_METADATA } from '../types';

const NS = 'opslens_';

function key(sku: string, location: string, field: string): string {
  return `${NS}${field}__${sku}__${location}`;
}

export function saveNote(sku: string, location: string, note: string): void {
  localStorage.setItem(key(sku, location, 'note'), note);
}

export function getNote(sku: string, location: string): string {
  return localStorage.getItem(key(sku, location, 'note')) ?? '';
}

export function saveStatus(sku: string, location: string, status: Status): void {
  localStorage.setItem(key(sku, location, 'status'), status);
}

export function getStatus(sku: string, location: string): Status {
  const stored = localStorage.getItem(key(sku, location, 'status'));
  if (stored === 'New' || stored === 'In Review' || stored === 'Waiting' || stored === 'Resolved') {
    return stored;
  }
  return 'New';
}

export function saveCaseMetadata(sku: string, location: string, data: CaseMetadata): void {
  localStorage.setItem(key(sku, location, 'case_meta'), JSON.stringify(data));
}

export function getCaseMetadata(sku: string, location: string): CaseMetadata {
  try {
    const raw = localStorage.getItem(key(sku, location, 'case_meta'));
    if (!raw) return { ...DEFAULT_CASE_METADATA };
    return { ...DEFAULT_CASE_METADATA, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_CASE_METADATA };
  }
}

// ─── Notification persistence ───────────────────────────────────────────────

export function saveNotificationRead(id: string, read: boolean): void {
  localStorage.setItem(`${NS}notif_read__${id}`, read ? '1' : '0');
}

export function getNotificationRead(id: string): boolean {
  return localStorage.getItem(`${NS}notif_read__${id}`) === '1';
}

/** Persists the first-seen timestamp for a notification so it survives refreshes. */
export function saveNotificationCreatedAt(id: string, isoDate: string): void {
  localStorage.setItem(`${NS}notif_created__${id}`, isoDate);
}

/** Returns the persisted first-seen timestamp, or null if this is the first time. */
export function getNotificationCreatedAt(id: string): string | null {
  return localStorage.getItem(`${NS}notif_created__${id}`);
}

export function clearAll(): void {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(NS)) keys.push(k);
  }
  keys.forEach(k => localStorage.removeItem(k));
}

// ─── Email Preferences persistence ─────────────────────────────────────

const EMAIL_PREFS_KEY = `${NS}email_prefs`;

export function saveEmailPreferences(prefs: EmailPreferences): void {
  localStorage.setItem(EMAIL_PREFS_KEY, JSON.stringify(prefs));
}

export function getEmailPreferences(): EmailPreferences {
  try {
    const raw = localStorage.getItem(EMAIL_PREFS_KEY);
    if (!raw) return { ...DEFAULT_EMAIL_PREFS };
    const parsed = JSON.parse(raw) as Partial<EmailPreferences>;
    // Merge with defaults so new fields added later don’t break existing stored prefs
    return { ...DEFAULT_EMAIL_PREFS, ...parsed };
  } catch {
    return { ...DEFAULT_EMAIL_PREFS };
  }
}
