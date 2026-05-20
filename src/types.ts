// Types for OpsLens Inventory Exception Tracker

export interface RawInventoryRecord {
  sku: string;
  location: string;
  description?: string;
  category?: string;
  on_hand_qty?: number | string;
  reorder_point?: number | string;
  safety_stock?: number | string;
  avg_daily_usage?: number | string;
  lead_time_days?: number | string;
  system_qty?: number | string;
  counted_qty?: number | string;
  open_po_qty?: number | string;
  last_movement_date?: string | null;
  unit_cost?: number | string | null;
  [key: string]: unknown;
}

export type ExceptionType =
  | 'low_stock'
  | 'stockout_risk'
  | 'count_mismatch'
  | 'aging'
  | 'manual_review';

export type Priority = 'critical' | 'high' | 'medium' | 'low' | 'none';

export type Status = 'New' | 'In Review' | 'Waiting' | 'Resolved';

export type RootCauseCategory = 
  | 'counting_error' 
  | 'receiving_delay' 
  | 'master_data_issue' 
  | 'damaged_inventory' 
  | 'supplier_short_shipment' 
  | 'picking_error' 
  | 'other'
  | null;

export interface CaseMetadata {
  root_cause: RootCauseCategory;
  root_cause_notes: string;
  owner: string;
  due_date: string;
  corrective_action: string;
  prevention_action: string;
  recurring_issue: boolean;
  recurring_reason: string;
}

export const DEFAULT_CASE_METADATA: CaseMetadata = {
  root_cause: null,
  root_cause_notes: '',
  owner: '',
  due_date: '',
  corrective_action: '',
  prevention_action: '',
  recurring_issue: false,
  recurring_reason: '',
};

export interface ProcessedRecord {
  // Original fields (normalized)
  sku: string;
  location: string;
  description: string;
  category: string;
  on_hand_qty: number | null;
  reorder_point: number | null;
  safety_stock: number | null;
  avg_daily_usage: number | null;
  lead_time_days: number | null;
  system_qty: number | null;
  counted_qty: number | null;
  open_po_qty: number | null;
  last_movement_date: string | null;
  unit_cost: number | null;
  is_cost_estimated: boolean;

  // Derived metrics
  days_of_cover: number | null;
  aging_days: number | null;

  // Exception output
  exception_types: ExceptionType[];
  primary_exception_type: ExceptionType | null;
  priority: Priority;
  reason: string;
  suggested_action: string;

  // Follow-up (from localStorage)
  status: Status;
  note: string;
  case_metadata: CaseMetadata;

  // Preprocessing annotations (from preprocessor.ts, runs before exception logic)
  // Empty = clean record. Non-empty = lists what was normalized or is problematic.
  validation_flags: string[];

  // Unique key
  id: string;
}

export type ViewType = 'import' | 'dashboard' | 'queue' | 'detail' | 'notifications';

// ─── Notifications ──────────────────────────────────────────────────────────

export type AlertType = 'low_stock' | 'high_stock' | 'slow_movement';

export interface AppNotification {
  /** Stable ID: `notif__${sku}__${location}__${alert_type}` — prevents duplicates on refresh */
  id: string;
  sku: string;
  item_name: string;
  alert_type: AlertType;
  priority: Priority;
  /** Short headline shown in the notification list */
  message: string;
  /** Detailed explanation of why the alert was triggered */
  reason: string;
  created_at: string;
  read: boolean;
  /** Links back to the ProcessedRecord so the user can open the exception detail */
  linked_record_id: string | null;
}

// ─── Email Preferences (Phase 1 – local persistence only) ───────────────────

export type VerificationStatus = 'unverified' | 'pending' | 'verified';

/** Which exception types the user wants emailed */
export type EmailExceptionType = 'low_stock' | 'stockout_risk' | 'count_mismatch' | 'aging' | 'manual_review';

/** Days of the week (0 = Sunday … 6 = Saturday) */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface EmailPreferences {
  /** The address the user entered */
  email: string;
  /** Current verification state */
  verificationStatus: VerificationStatus;
  /** Whether the daily-summary digest is enabled */
  dailySummaryEnabled: boolean;
  /** Days on which the digest should be sent */
  scheduledDays: DayOfWeek[];
  /** 24-hour local time string, e.g. "08:00" */
  scheduledTime: string;
  /** If true, only critical-priority exceptions are included in emails */
  criticalOnly: boolean;
  /** Which exception types trigger an email */
  exceptionTypes: EmailExceptionType[];
}

export const DEFAULT_EMAIL_PREFS: EmailPreferences = {
  email: '',
  verificationStatus: 'unverified',
  dailySummaryEnabled: false,
  scheduledDays: [1, 3, 5], // Mon, Wed, Fri
  scheduledTime: '08:00',
  criticalOnly: false,
  exceptionTypes: ['low_stock', 'stockout_risk', 'count_mismatch', 'aging', 'manual_review'],
};
