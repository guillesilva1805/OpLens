/**
 * PROD WARNING: This is a minimum-viable file-based persistence layer used ONLY 
 * for local Phase 2 demo purposes to avoid setting up a real Postgres database.
 * In production, migrate this to a real database (e.g., Supabase, RDS, Mongo).
 */
import fs from 'fs';
import path from 'path';

export interface EmailPreferences {
  email: string;
  verificationStatus: 'unverified' | 'pending' | 'verified';
  verificationToken?: string | null;
  verificationTokenExpiresAt?: number | null; // UNIX timestamp
  dailySummaryEnabled: boolean;
  scheduledDays: number[];
  scheduledTime: string;
  criticalOnly: boolean;
  exceptionTypes: string[];
}

interface DbSchema {
  preferences: EmailPreferences;
  // Keeps track of when an exception was last emailed. Key: ExceptionType_SKU_Location
  sentCriticalExceptions: Record<string, string>; 
}

const DB_PATH = path.join(process.cwd(), 'server', 'db.json');

const DEFAULT_PREFS: EmailPreferences = {
  email: '',
  verificationStatus: 'unverified',
  dailySummaryEnabled: false,
  scheduledDays: [1, 3, 5],
  scheduledTime: '08:00',
  criticalOnly: false,
  exceptionTypes: ['low_stock', 'stockout_risk', 'count_mismatch', 'aging', 'manual_review']
};

export function readDb(): DbSchema {
  if (!fs.existsSync(DB_PATH)) {
    return { preferences: { ...DEFAULT_PREFS }, sentCriticalExceptions: {} };
  }
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  } catch (e) {
    return { preferences: { ...DEFAULT_PREFS }, sentCriticalExceptions: {} };
  }
}

export function writeDb(data: DbSchema) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

export function getPreferences(): EmailPreferences {
  return readDb().preferences;
}

export function savePreferences(prefs: Partial<EmailPreferences>) {
  const db = readDb();
  db.preferences = { ...db.preferences, ...prefs };
  writeDb(db);
  return db.preferences;
}

export function trackSentCriticalException(sku: string, location: string, exceptionType: string) {
  const db = readDb();
  const key = `${exceptionType}_${sku}_${location}`;
  db.sentCriticalExceptions[key] = new Date().toISOString();
  writeDb(db);
}

export function hasSentCriticalExceptionRecently(sku: string, location: string, exceptionType: string): boolean {
  const db = readDb();
  const key = `${exceptionType}_${sku}_${location}`;
  const lastSentStr = db.sentCriticalExceptions[key];
  if (!lastSentStr) return false;
  
  const lastSent = new Date(lastSentStr).getTime();
  const now = Date.now();
  // Throttle: don't send the same critical exception email for the same SKU/location within 24 hours
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  return now - lastSent < TWENTY_FOUR_HOURS;
}
