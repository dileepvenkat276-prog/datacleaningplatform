import React, { useState } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  FileText,
  FileCode,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Layers,
  Settings2
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import {
  FileImportPreview,
  finalizeImport,
  formatFileSize,
  parseFileForPreview
} from '../../utils/fileHandler';

export const UploadCenterView: React.FC = () => {
  const { loadNewDataset, loadSampleData, setActiveTab, notify } = useData();

  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<FileImportPreview | null>(null);

  // Import options
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [delimiter, setDelimiter] = useState<string>(',');
  const [headerRowIndex, setHeaderRowIndex] = useState<number>(0);
  const [encoding, setEncoding] = useState<string>('UTF-8');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setErrorMsg(null);
    if (!file) return;

    // Check size limit: 50MB
    if (file.size > 50 * 1024 * 1024) {
      setErrorMsg('File exceeds maximum supported size (50 MB).');
      return;
    }

    setLoading(true);
    try {
      const prev = await parseFileForPreview(file);
      setPreview(prev);
      if (prev.sheets && prev.sheets.length > 0) {
        setSelectedSheet(prev.sheets[0]);
      }
      if (prev.detectedDelimiter) {
        setDelimiter(prev.detectedDelimiter);
      }
    } catch (err: any) {
      setErrorMsg(`Failed to parse file: ${err.message || 'Unknown format error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmImport = () => {
    if (!preview) return;

    try {
      const { headers, rows } = finalizeImport(preview, {
        selectedSheet,
        delimiter,
        headerRowIndex
      });

      if (rows.length === 0 || headers.length === 0) {
        setErrorMsg('The selected configuration resulted in 0 rows or columns. Please verify header row and delimiter.');
        return;
      }

      loadNewDataset(
        preview.fileName.replace(/\.[^/.]+$/, ''),
        preview.fileName,
        headers,
        rows
      );

      setActiveTab('preview');
    } catch (err: any) {
      setErrorMsg(`Import confirmation error: ${err.message || 'Unknown error'}`);
    }
  };

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
          Dataset Import Center
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Upload and configure your dataset. All data processing occurs 100% locally in your browser for privacy.
        </p>
      </div>

      {/* Dropzone */}
      <div
        onDragOver={e => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={e => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
          }
        }}
        className={`relative rounded-3xl border-2 border-dashed p-8 md:p-12 text-center transition-all ${
          isDragging
            ? 'border-brand-500 bg-brand-500/5 scale-[1.01]'
            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/60'
        }`}
      >
        <input
          type="file"
          id="fileInput"
          accept=".csv,.xlsx,.xls,.json,.txt"
          onChange={e => {
            if (e.target.files && e.target.files[0]) {
              handleFile(e.target.files[0]);
            }
          }}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />

        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center shadow-inner">
            <UploadCloud className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Drag & Drop your dataset here, or <span className="text-brand-600 dark:text-brand-400 underline">browse</span>
            </p>
            <p className="text-xs text-slate-400">
              Supported formats: CSV, Excel (.xlsx, .xls), JSON, Tab/Delimited TXT (up to 50 MB)
            </p>
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              <FileSpreadsheet className="w-3 h-3 text-emerald-500 mr-1" /> CSV / Excel
            </span>
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              <FileCode className="w-3 h-3 text-amber-500 mr-1" /> JSON
            </span>
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              <FileText className="w-3 h-3 text-indigo-500 mr-1" /> TXT
            </span>
          </div>
        </div>
      </div>

      {/* Or Quick Demo Sample */}
      <div className="flex items-center justify-between p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5">
        <div className="flex items-center space-x-3">
          <Sparkles className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Want to test without uploading?</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Load our comprehensive sample customer dataset containing duplicate rows, missing values, outliers, and dirty formatting.
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            loadSampleData();
            setActiveTab('preview');
          }}
          className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-sm transition-colors flex items-center space-x-1.5 whitespace-nowrap"
        >
          <span>Load Demo Dataset</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Error Message */}
      {errorMsg && (
        <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* File Preview & Configuration Modal / Panel */}
      {preview && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">{preview.fileName}</h3>
                <p className="text-xs text-slate-400">
                  {formatFileSize(preview.fileSize)} • Est. {preview.totalEstimatedRows.toLocaleString()} rows • {preview.headers.length} columns detected
                </p>
              </div>
            </div>

            <button
              onClick={handleConfirmImport}
              className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-500/20 transition-all flex items-center space-x-2"
            >
              <span>Confirm & Load Dataset</span>
              <CheckCircle2 className="w-4 h-4" />
            </button>
          </div>

          {/* Configuration Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {/* Sheet Selection if Excel */}
            {preview.sheets && preview.sheets.length > 0 && (
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Select Worksheet
                </label>
                <select
                  value={selectedSheet}
                  onChange={e => setSelectedSheet(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
                >
                  {preview.sheets.map(s => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Delimiter Selection if CSV / TXT */}
            {(preview.format === 'csv' || preview.format === 'txt') && (
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Delimiter
                </label>
                <select
                  value={delimiter}
                  onChange={e => setDelimiter(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
                >
                  <option value=",">Comma (,)</option>
                  <option value=";">Semicolon (;)</option>
                  <option value="&#9;">Tab (\t)</option>
                  <option value="|">Pipe (|)</option>
                </select>
              </div>
            )}

            {/* Header Row Index */}
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                Header Row
              </label>
              <select
                value={headerRowIndex}
                onChange={e => setHeaderRowIndex(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
              >
                <option value={0}>Row 1 (First Line)</option>
                <option value={1}>Row 2</option>
                <option value={2}>Row 3</option>
              </select>
            </div>

            {/* Character Encoding */}
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                Encoding
              </label>
              <select
                value={encoding}
                onChange={e => setEncoding(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
              >
                <option value="UTF-8">UTF-8 (Standard)</option>
                <option value="ISO-8859-1">ISO-8859-1 (Latin1)</option>
                <option value="windows-1252">Windows-1252</option>
              </select>
            </div>
          </div>

          {/* Sample Table Preview */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Sample Data Preview (First {preview.sampleRows.length} Rows)
            </span>
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 max-h-60">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0 text-slate-700 dark:text-slate-200">
                  <tr>
                    {preview.headers.map(h => (
                      <th key={h} className="py-2 px-3 border-r border-slate-200 dark:border-slate-700 whitespace-nowrap font-bold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {preview.sampleRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      {preview.headers.map(h => (
                        <td key={h} className="py-1.5 px-3 border-r border-slate-100 dark:border-slate-800 whitespace-nowrap text-slate-600 dark:text-slate-300">
                          {String(row[h] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
