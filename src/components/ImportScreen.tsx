import React, { useRef, useState } from 'react';
import Papa from 'papaparse';
import type { RawInventoryRecord } from '../types';
import demoInventory from '../data/demoInventory';
import { useI18n } from '../i18n';
import gsLogo from '../assets/gs-logo.png';

interface Props {
  onDataLoaded: (records: RawInventoryRecord[], source: 'demo' | 'csv') => void;
}

const REQUIRED_COLUMNS = ['sku', 'location', 'on_hand_qty'];
const OPTIONAL_COLUMNS = [
  'description', 'category', 'reorder_point', 'safety_stock',
  'avg_daily_usage', 'lead_time_days', 'system_qty', 'counted_qty',
  'open_po_qty', 'last_movement_date',
];

export default function ImportScreen({ onDataLoaded }: Props) {
  const { t } = useI18n();
  const [isDragging, setIsDragging] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parseWarnings, setParseWarnings] = useState<string[]>([]);
  const [parsedInfo, setParsedInfo] = useState<{ rows: number; cols: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleDemoData() {
    setParseError(null);
    setParseWarnings([]);
    setParsedInfo(null);
    onDataLoaded(demoInventory, 'demo');
  }

  function processFile(file: File) {
    setParseError(null);
    setParseWarnings([]);
    setParsedInfo(null);

    if (!file.name.endsWith('.csv')) {
      setParseError(t('import.errOnlyCsv'));
      return;
    }

    Papa.parse<RawInventoryRecord>(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      complete: (result) => {
        const cols = result.meta.fields ?? [];
        const warnings: string[] = [];

        const missingRequired = REQUIRED_COLUMNS.filter(c => !cols.map(c => c.toLowerCase().trim()).includes(c));
        if (missingRequired.length > 0) {
          setParseError(t('import.errMissingRequired', { missing: missingRequired.join(', '), cols: REQUIRED_COLUMNS.join(', ') }));
          return;
        }

        const detectedOptional = OPTIONAL_COLUMNS.filter(c => cols.map(c => c.toLowerCase().trim()).includes(c));
        const missingOptional = OPTIONAL_COLUMNS.filter(c => !cols.map(c => c.toLowerCase().trim()).includes(c));

        if (missingOptional.length > 0) {
          warnings.push(t('import.warnMissingOptional', { cols: missingOptional.join(', ') }));
        }

        if (result.data.length === 0) {
          setParseError(t('import.errNoRows'));
          return;
        }

        // Normalize column names to lowercase
        const normalized: RawInventoryRecord[] = result.data.map((row: Record<string, unknown>) => {
          const norm: Record<string, unknown> = {};
          for (const key of Object.keys(row)) {
            norm[key.toLowerCase().trim()] = row[key];
          }
          return norm as RawInventoryRecord;
        });

        setParseWarnings(warnings);
        setParsedInfo({ rows: normalized.length, cols: [...REQUIRED_COLUMNS, ...detectedOptional] });

        setTimeout(() => {
          onDataLoaded(normalized, 'csv');
        }, 1200);
      },
      error: (err) => {
        setParseError(t('import.errParse', { msg: err.message }));
      },
    });
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 bg-accent-muted border border-accent/30 rounded-full px-4 py-1.5 text-xs text-blue-300 font-medium mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
          {t('import.badge')}
        </div>
        <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">
          OpsLens
        </h1>
        <p className="text-muted text-base max-w-sm mx-auto leading-relaxed">
          {t('import.tagline')}
        </p>
      </div>

      <div className="w-full max-w-2xl space-y-4">
        {/* Demo data button */}
        <button
          id="btn-use-demo-data"
          onClick={handleDemoData}
          className="w-full card p-6 text-left hover:border-accent/50 hover:bg-surface-700 transition-all duration-200 group"
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0 group-hover:bg-accent/30 transition-colors">
              <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-white font-semibold">{t('import.useDemo')}</span>
                <span className="text-xs bg-blue-900/60 text-blue-300 border border-blue-700/50 rounded px-2 py-0.5">{t('import.recommended')}</span>
              </div>
              <p className="text-sm text-muted">
                {t('import.demoDesc')}
              </p>
            </div>
            <svg className="w-5 h-5 text-muted group-hover:text-accent transition-colors flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 border-t border-surface-600"></div>
          <span className="text-xs text-muted uppercase tracking-wider">{t('import.orUpload')}</span>
          <div className="flex-1 border-t border-surface-600"></div>
        </div>

        {/* CSV Dropzone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={`
            card p-8 text-center cursor-pointer transition-all duration-200
            ${isDragging
              ? 'border-accent bg-accent-muted/20'
              : 'hover:border-surface-500 hover:bg-surface-700/50'
            }
          `}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            id="csv-upload-input"
            onChange={handleFileChange}
          />
          <div className="w-12 h-12 rounded-xl bg-surface-700 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <p className="text-sm text-gray-300 font-medium mb-1">
            {isDragging ? t('import.dropHere') : t('import.dropOrBrowse')}
          </p>
          <p className="text-xs text-muted">{t('import.requiredCols', { cols: REQUIRED_COLUMNS.join(', ') })}</p>
        </div>

        {/* Parse error */}
        {parseError && (
          <div className="card p-4 border-red-800/60 bg-red-900/20">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm text-red-300 font-medium">{t('import.parseError')}</p>
                <p className="text-xs text-red-400 mt-0.5">{parseError}</p>
              </div>
            </div>
          </div>
        )}

        {/* Parse warnings */}
        {parseWarnings.length > 0 && (
          <div className="card p-4 border-yellow-800/50 bg-yellow-900/10">
            <p className="text-xs text-yellow-400 font-medium mb-1">{t('import.warnings')}</p>
            {parseWarnings.map((w, i) => (
              <p key={i} className="text-xs text-yellow-500">{w}</p>
            ))}
          </div>
        )}

        {/* Parse success */}
        {parsedInfo && (
          <div className="card p-4 border-green-800/50 bg-green-900/10">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm text-green-300 font-medium">{t('import.fileAccepted')}</p>
                <p className="text-xs text-green-500">{t('import.parsedInfo', { rows: parsedInfo.rows, cols: parsedInfo.cols.length })}</p>
              </div>
            </div>
          </div>
        )}

        {/* Column reference */}
        <div className="card p-5">
          <p className="text-xs text-muted font-medium uppercase tracking-wider mb-3">{t('import.expectedCols')}</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
            {[...REQUIRED_COLUMNS.map(c => ({ col: c, req: true })),
              ...OPTIONAL_COLUMNS.map(c => ({ col: c, req: false }))].map(({ col, req }) => (
              <div key={col} className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${req ? 'bg-blue-400' : 'bg-surface-500'}`}></span>
                <code className="text-xs font-mono text-gray-300">{col}</code>
                {req && <span className="text-xs text-blue-500">{t('import.required')}</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Author credit */}
        <div className="flex flex-col items-center gap-3 pt-6">
          <span className="text-xs text-muted uppercase tracking-wider">{t('import.builtBy')}</span>
          <img src={gsLogo} alt="Guillermo Silva — IA Aplicada" className="w-28 h-28" />
        </div>
      </div>
    </div>
  );
}
