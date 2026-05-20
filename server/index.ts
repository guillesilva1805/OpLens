import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import {
  getPreferences,
  savePreferences,
  hasSentCriticalExceptionRecently,
  trackSentCriticalException,
  readDb
} from './db.js';
import {
  sendVerificationEmail,
  sendTestEmail,
  sendCriticalExceptionEmail,
  sendDailySummaryEmail
} from './mail.js';

const app = express();
app.use(cors());
app.use(express.json());

// ─── 1. Preferences ──────────────────────────────────────────────

app.get('/api/preferences', (req, res) => {
  const prefs = getPreferences();
  // Strip secure token from response for safety
  const { verificationToken, ...safePrefs } = prefs;
  res.json(safePrefs);
});

app.post('/api/preferences', (req, res) => {
  const incoming = req.body;
  // Make sure we never overwrite verificationStatus blindly
  const existing = getPreferences();
  if (incoming.email !== existing.email) {
    incoming.verificationStatus = 'unverified';
    savePreferences({ verificationToken: null });
  }

  // Dont allow client to overwrite secure token explicitly
  delete incoming.verificationToken;
  delete incoming.verificationTokenExpiresAt;

  savePreferences(incoming);
  
  const prefs = getPreferences();
  const { verificationToken, verificationTokenExpiresAt, ...safePrefs } = prefs;
  res.json(safePrefs);
});

// ─── 2. Verification Flow ────────────────────────────────────────

app.post('/api/verify/request', async (req, res) => {
  const { email } = req.body;
  
  // Generate secure token
  const token = crypto.randomBytes(32).toString('hex');
  const ONE_HOUR_MS = 60 * 60 * 1000;
  
  savePreferences({
    email,
    verificationStatus: 'pending',
    verificationToken: token,
    verificationTokenExpiresAt: Date.now() + ONE_HOUR_MS
  });

  try {
    await sendVerificationEmail(email, token);
    res.json({ success: true });
  } catch (err: any) {
    console.error('Error sending verification email:', err);
    res.status(500).json({ error: 'Failed to send verification email' });
  }
});

app.post('/api/verify/confirm', (req, res) => {
  const { email, token } = req.body;
  const prefs = getPreferences();

  if (prefs.email !== email || prefs.verificationToken !== token) {
    return res.status(400).json({ error: 'Invalid token' });
  }

  if (prefs.verificationTokenExpiresAt && Date.now() > prefs.verificationTokenExpiresAt) {
    return res.status(400).json({ error: 'Token has expired' });
  }

  // Token is valid and has not expired -> verify and burn token (single-use)
  savePreferences({
    verificationStatus: 'verified',
    verificationToken: null,
    verificationTokenExpiresAt: null
  });
  
  res.json({ success: true, verified: true });
});

// ─── 3. Test Email ───────────────────────────────────────────────

app.post('/api/test-email', async (req, res) => {
  const prefs = getPreferences();
  if (prefs.verificationStatus !== 'verified') {
    return res.status(403).json({ error: 'Email must be verified first' });
  }

  try {
    await sendTestEmail(prefs.email);
    res.json({ success: true });
  } catch (err: any) {
    console.error('Failed to send test email:', err);
    res.status(500).json({ error: 'Failed to send test email' });
  }
});

// ─── 4. Critical Exception Trigger (Deduplicated) ────────────────

app.post('/api/trigger-critical', async (req, res) => {
  const { sku, location, exceptionType, reason, priority } = req.body;
  const prefs = getPreferences();

  if (prefs.verificationStatus !== 'verified') {
    return res.status(403).json({ error: 'Email not verified' });
  }
  
  // Respect user preferences completely:
  if (prefs.criticalOnly && priority !== 'critical') {
    return res.json({ success: true, skipped: 'Priority not critical' });
  }
  if (!prefs.exceptionTypes.includes(exceptionType)) {
    return res.json({ success: true, skipped: 'Exception type not opted in' });
  }

  // Deduplication check
  if (hasSentCriticalExceptionRecently(sku, location, exceptionType)) {
    return res.json({ success: true, skipped: 'Already notified within 24h' });
  }

  try {
    await sendCriticalExceptionEmail(prefs.email, sku, location, exceptionType, reason);
    trackSentCriticalException(sku, location, exceptionType);
    res.json({ success: true, sent: true });
  } catch (err) {
    console.error('Failed sending critical email:', err);
    res.status(500).json({ error: 'Failed to send exception email' });
  }
});

// ─── 5. Daily Summary Scaffold ───────────────────────────────────

app.post('/api/daily-summary', async (req, res) => {
  /*
   * In a real deployment (Vercel Cron/AWS EventBridge):
   * This endpoint is invoked via a schedule (e.g. 0 8 * * *).
   * It would gather the DB state, check if today is a scheduledDay for the user,
   * then filter active exceptions and generate an email.
   * 
   * For Phase 2 local/test run: the front-end sends the summary payload representing "now".
   */
  const { exceptionCount, listSnippetHtml } = req.body;
  const prefs = getPreferences();

  if (prefs.verificationStatus !== 'verified' || !prefs.dailySummaryEnabled) {
    return res.status(403).json({ error: 'Not enabled or verified' });
  }

  try {
    await sendDailySummaryEmail(prefs.email, exceptionCount, listSnippetHtml);
    res.json({ success: true, sent: true });
  } catch (err) {
    console.error('Failed sending daily summary:', err);
    res.status(500).json({ error: 'Failed to send daily summary email' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`[Backend] OpsLens Email API running on http://localhost:${PORT}`);
});
