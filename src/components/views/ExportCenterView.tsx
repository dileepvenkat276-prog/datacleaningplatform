import React, { useState } from 'react';
import {
  DownloadCloud,
  FileSpreadsheet,
  FileText,
  FileCode,
  ShieldCheck,
  History,
  CheckCircle2,
  FileDown
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import {
  exportCleaningHistory,
  exportDataQualityReport,
  exportToCSV,
  exportToJSON,
  exportToTXT,
  exportToXLSX,
  exportValidationErrorReport
} from '../../utils/fileHandler';

export const ExportCenterView: React.FC = () => {
  const { dataset, qualityReport, validationErrors, history } = useData();

  const [exportSource, setExportSource] = useState<'cleaned' | 'original'>('cleaned');
  const [csvDelimiter, setCsvDelimiter] = useState<string>(',');

  if (!dataset) {
    return <div className="p-8 text-center text-slate-500">Please load a dataset to access export options.</div>;
  }

  const baseFilename = dataset.name.replace(/\s+/g, '_');
  const targetHeaders = exportSource === 'cleaned' ? dataset.headers : dataset.originalHeaders;
  const targetRows = exportSource === 'cleaned' ? dataset.rows : dataset.originalRows;

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
          <DownloadCloud className="w-6 h-6 text-brand-600 dark:text-brand-400" />
          <span>Data Export & Deliverables Center</span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Download cleaned datasets, raw ingested baselines, compliance audit trails, and quality reports.
        </p>
      </div>

      {/* Dataset State Selector */}
      <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex items-center justify-between">
        <div className="space-y-0.5">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Dataset Version to Export:</span>
          <p className="text-[11px] text-slate-400">
            Choose between your actively cleaned dataset or original raw records.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setExportSource('cleaned')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              exportSource === 'cleaned'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            Cleaned Data ({dataset.rows.length} rows)
          </button>
          <button
            onClick={() => setExportSource('original')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              exportSource === 'original'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            Original Baseline ({dataset.originalRows.length} rows)
          </button>
        </div>
      </div>

      {/* Main File Format Downloads */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {/* CSV */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">CSV Spreadsheet</h3>
              <p className="text-xs text-slate-400">Standard comma-separated format for Excel & SQL databases.</p>
            </div>
          </div>

          <button
            onClick={() => exportToCSV(targetHeaders, targetRows, `${baseFilename}_${exportSource}.csv`)}
            className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center space-x-1.5"
          >
            <FileDown className="w-4 h-4" />
            <span>Download CSV</span>
          </button>
        </div>

        {/* Excel (.xlsx) */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Microsoft Excel</h3>
              <p className="text-xs text-slate-400">Formatted workbook (.xlsx) with preserved header metadata.</p>
            </div>
          </div>

          <button
            onClick={() => exportToXLSX(targetHeaders, targetRows, `${baseFilename}_${exportSource}.xlsx`)}
            className="w-full py-2 px-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-500/20 transition-all flex items-center justify-center space-x-1.5"
          >
            <FileDown className="w-4 h-4" />
            <span>Download XLSX</span>
          </button>
        </div>

        {/* JSON */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Structured JSON</h3>
              <p className="text-xs text-slate-400">Array of clean objects for web APIs and NoSQL databases.</p>
            </div>
          </div>

          <button
            onClick={() => exportToJSON(targetHeaders, targetRows, `${baseFilename}_${exportSource}.json`)}
            className="w-full py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-500/20 transition-all flex items-center justify-center space-x-1.5"
          >
            <FileDown className="w-4 h-4" />
            <span>Download JSON</span>
          </button>
        </div>

        {/* TXT */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Delimited Text</h3>
              <p className="text-xs text-slate-400">Tab-delimited text file for terminal scripts and CLI pipelines.</p>
            </div>
          </div>

          <button
            onClick={() => exportToTXT(targetHeaders, targetRows, `${baseFilename}_${exportSource}.txt`, '\t')}
            className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all flex items-center justify-center space-x-1.5"
          >
            <FileDown className="w-4 h-4" />
            <span>Download TXT</span>
          </button>
        </div>
      </div>

      {/* Reports & Audit Deliverables */}
      <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Audit Reports & Quality Documentation</h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Quality Audit Report */}
          <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-brand-500" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Quality Inspection Report</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Detailed breakdown of the 6 dimensions, score breakdown formula, and active issue list.
              </p>
            </div>

            <button
              onClick={() => qualityReport && exportDataQualityReport(qualityReport, `${baseFilename}_quality_report.txt`)}
              disabled={!qualityReport}
              className="py-1.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-xs font-semibold flex items-center justify-center space-x-1.5"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Download Report</span>
            </button>
          </div>

          {/* Validation Error Report */}
          <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <FileSpreadsheet className="w-4 h-4 text-rose-500" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Validation Error CSV</span>
              </div>
              <p className="text-[11px] text-slate-400">
                CSV log containing every non-conforming cell value, rule violation, and row index.
              </p>
            </div>

            <button
              onClick={() => exportValidationErrorReport(validationErrors, `${baseFilename}_validation_errors.csv`)}
              disabled={validationErrors.length === 0}
              className="py-1.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-xs font-semibold flex items-center justify-center space-x-1.5 disabled:opacity-40"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Download Errors ({validationErrors.length})</span>
            </button>
          </div>

          {/* Cleaning History JSON */}
          <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <History className="w-4 h-4 text-indigo-500" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Cleaning History Log</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Complete audit trail of every operation, timestamp, and affected row/cell counts.
              </p>
            </div>

            <button
              onClick={() => exportCleaningHistory(history, `${baseFilename}_audit_history.json`)}
              className="py-1.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-xs font-semibold flex items-center justify-center space-x-1.5"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Download Audit Trail</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
