import React, { useState, useMemo } from 'react';
import {
  Copy,
  AlertTriangle,
  Type,
  Binary,
  Calendar,
  Activity,
  Trash2,
  CheckCircle2,
  Wand2,
  HelpCircle,
  Scissors,
  Combine,
  Search,
  Filter,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { DataType, Row } from '../../types/dataset';
import { useData } from '../../context/DataContext';
import {
  cleanTextColumn,
  convertColumnDataType,
  detectOutliers,
  dropColumnsByMissingThreshold,
  dropRowsByMissingThreshold,
  extractDateParts,
  fillMissingValues,
  findAndReplaceText,
  findEmptyEntities,
  findExactDuplicates,
  findFuzzyDuplicates,
  formatDateTo,
  handleOutliers,
  mergeColumns,
  MissingFillStrategy,
  OutlierRecord,
  removeEmptyRowsAndColumns,
  removeExactDuplicates,
  splitColumn,
  standardizeDates,
  TargetDateFormat,
  TextCaseType
} from '../../utils/cleaningOps';
import { DataGrid } from '../common/DataGrid';

type CleanSubTool = 'duplicates' | 'missing' | 'text' | 'types' | 'dates' | 'outliers' | 'empty';

export const CleaningStudioView: React.FC = () => {
  const { dataset, applyDatasetChange, notify } = useData();
  const [activeTool, setActiveTool] = useState<CleanSubTool>('duplicates');

  const headers = dataset?.headers || [];
  const rows = dataset?.rows || [];

  // ==========================================
  // 1. DUPLICATE MANAGER STATE
  // ==========================================
  const [duplicateSubsetCols, setDuplicateSubsetCols] = useState<string[]>([]);
  const [duplicateKeep, setDuplicateKeep] = useState<'first' | 'last'>('first');
  const [fuzzyThreshold, setFuzzyThreshold] = useState<number>(0.85);

  const exactDupes = useMemo(() => {
    if (!dataset) return { duplicateIndices: [], totalDuplicates: 0 };
    return findExactDuplicates(headers, rows, duplicateSubsetCols);
  }, [dataset, headers, rows, duplicateSubsetCols]);

  const fuzzyDupes = useMemo(() => {
    if (!dataset || rows.length === 0) return [];
    return findFuzzyDuplicates(headers, rows, duplicateSubsetCols, fuzzyThreshold);
  }, [dataset, headers, rows, duplicateSubsetCols, fuzzyThreshold]);

  const handleRemoveExactDuplicates = () => {
    if (!dataset) return;
    const res = removeExactDuplicates(headers, rows, duplicateKeep, duplicateSubsetCols);
    applyDatasetChange(
      headers,
      res.newRows,
      'Remove Exact Duplicates',
      'cleaning',
      `Removed ${res.removedCount} duplicate record(s) keeping ${duplicateKeep} occurrence.`,
      res.removedCount,
      res.removedCount * headers.length
    );
  };

  // ==========================================
  // 2. MISSING DATA MANAGER STATE
  // ==========================================
  const [missingCol, setMissingCol] = useState<string>(headers[0] || '');
  const [fillStrategy, setFillStrategy] = useState<MissingFillStrategy>('median');
  const [customFillValue, setCustomFillValue] = useState<string>('');
  const [dropRowThreshold, setDropRowThreshold] = useState<number>(50);
  const [dropColThreshold, setDropColThreshold] = useState<number>(60);

  const missingStatsPerCol = useMemo(() => {
    const map: Record<string, { count: number; pct: number }> = {};
    headers.forEach(h => {
      const count = rows.filter(r => r[h] === null || r[h] === undefined || String(r[h]).trim() === '').length;
      map[h] = {
        count,
        pct: rows.length > 0 ? Math.round((count / rows.length) * 100) : 0
      };
    });
    return map;
  }, [headers, rows]);

  const handleFillMissing = () => {
    if (!dataset || !missingCol) return;
    const res = fillMissingValues(missingCol, rows, fillStrategy, customFillValue);
    applyDatasetChange(
      headers,
      res.newRows,
      `Impute Missing: ${missingCol}`,
      'cleaning',
      `Filled ${res.filledCount} empty cell(s) in "${missingCol}" using ${fillStrategy}.`,
      res.filledCount,
      res.filledCount
    );
  };

  const handleDropRowsByThreshold = () => {
    if (!dataset) return;
    const res = dropRowsByMissingThreshold(headers, rows, dropRowThreshold);
    applyDatasetChange(
      headers,
      res.newRows,
      'Drop Sparse Rows',
      'cleaning',
      `Removed ${res.droppedCount} row(s) exceeding ${dropRowThreshold}% missing fields.`,
      res.droppedCount,
      res.droppedCount * headers.length
    );
  };

  const handleDropColsByThreshold = () => {
    if (!dataset) return;
    const res = dropColumnsByMissingThreshold(headers, rows, dropColThreshold);
    applyDatasetChange(
      res.newHeaders,
      res.newRows,
      'Drop Sparse Columns',
      'cleaning',
      `Removed ${res.droppedColumns.length} column(s) exceeding ${dropColThreshold}% missing values: ${res.droppedColumns.join(', ')}.`,
      rows.length,
      res.droppedColumns.length * rows.length
    );
  };

  // ==========================================
  // 3. TEXT CLEANING STUDIO STATE
  // ==========================================
  const [textCol, setTextCol] = useState<string>(headers[0] || '');
  const [trimSpaces, setTrimSpaces] = useState(true);
  const [textCasing, setTextCasing] = useState<TextCaseType | 'none'>('title');
  const [removeSpecial, setRemoveSpecial] = useState(false);
  const [removeDigits, setRemoveDigits] = useState(false);
  const [removePunct, setRemovePunct] = useState(false);

  // Find & Replace
  const [findPattern, setFindPattern] = useState('');
  const [replaceTarget, setReplaceTarget] = useState('');
  const [isRegexSearch, setIsRegexSearch] = useState(false);

  // Split / Merge
  const [splitColName, setSplitColName] = useState(headers[0] || '');
  const [splitDelimiter, setSplitDelimiter] = useState(' ');
  const [splitNewCols, setSplitNewCols] = useState('First_Name, Last_Name');

  const [mergeColsList, setMergeColsList] = useState<string[]>([]);
  const [mergeSeparator, setMergeSeparator] = useState(' ');
  const [mergeTargetCol, setMergeTargetCol] = useState('Full_Name_Merged');

  const handleCleanText = () => {
    if (!dataset || !textCol) return;
    const res = cleanTextColumn(textCol, rows, {
      trimExtraSpaces: trimSpaces,
      casing: textCasing === 'none' ? undefined : textCasing,
      removeSpecialChars: removeSpecial,
      removeNumbers: removeDigits,
      removePunctuation: removePunct
    });
    applyDatasetChange(
      headers,
      res.newRows,
      `Text Clean: ${textCol}`,
      'cleaning',
      `Cleaned text in "${textCol}", modifying ${res.modifiedCount} cell(s).`,
      res.modifiedCount,
      res.modifiedCount
    );
  };

  const handleFindReplace = () => {
    if (!dataset || !textCol || !findPattern) return;
    const res = findAndReplaceText(textCol, rows, findPattern, replaceTarget, isRegexSearch);
    applyDatasetChange(
      headers,
      res.newRows,
      `Find & Replace: ${textCol}`,
      'cleaning',
      `Replaced occurrences of "${findPattern}" with "${replaceTarget}" (${res.modifiedCount} cells).`,
      res.modifiedCount,
      res.modifiedCount
    );
  };

  const handleSplitColumn = () => {
    if (!dataset || !splitColName) return;
    const newNames = splitNewCols.split(',').map(s => s.trim()).filter(Boolean);
    const res = splitColumn(splitColName, headers, rows, splitDelimiter, newNames);
    applyDatasetChange(
      res.newHeaders,
      res.newRows,
      `Split Column: ${splitColName}`,
      'transformation',
      `Split column "${splitColName}" into [${newNames.join(', ')}] using delimiter "${splitDelimiter}".`,
      rows.length,
      rows.length * newNames.length
    );
  };

  const handleMergeColumns = () => {
    if (!dataset || mergeColsList.length < 2 || !mergeTargetCol.trim()) return;
    const res = mergeColumns(mergeColsList, headers, rows, mergeSeparator, mergeTargetCol);
    applyDatasetChange(
      res.newHeaders,
      res.newRows,
      `Merge Columns into ${mergeTargetCol}`,
      'transformation',
      `Merged columns [${mergeColsList.join(', ')}] with separator "${mergeSeparator}".`,
      rows.length,
      rows.length
    );
  };

  // ==========================================
  // 4. DATA TYPE CONVERTER STATE
  // ==========================================
  const [typeCol, setTypeCol] = useState<string>(headers[0] || '');
  const [targetType, setTargetType] = useState<DataType>('integer');

  const suggestedType = useMemo(() => {
    if (!dataset || !typeCol) return 'text';
    const meta = dataset.columnsMeta.find(m => m.name === typeCol);
    return meta?.inferredType || 'text';
  }, [dataset, typeCol]);

  const handleConvertType = () => {
    if (!dataset || !typeCol) return;
    const res = convertColumnDataType(typeCol, rows, targetType);

    if (res.failedCount > 0) {
      notify(
        'warning',
        `Converted ${res.successCount} cells. Warning: ${res.failedCount} cells could not be parsed as ${targetType}.`
      );
    }

    applyDatasetChange(
      headers,
      res.newRows,
      `Convert Data Type: ${typeCol} -> ${targetType}`,
      'cleaning',
      `Converted column "${typeCol}" to ${targetType}. (${res.successCount} successful, ${res.failedCount} preserved unchanged).`,
      res.successCount,
      res.successCount
    );
  };

  // ==========================================
  // 5. DATE & TIME CLEANER STATE
  // ==========================================
  const [dateCol, setDateCol] = useState<string>(
    headers.find(h => h.toLowerCase().includes('date')) || headers[0] || ''
  );
  const [dateFormat, setDateFormat] = useState<TargetDateFormat>('YYYY-MM-DD');
  const [extractYear, setExtractYear] = useState(true);
  const [extractMonth, setExtractMonth] = useState(true);
  const [extractDay, setExtractDay] = useState(true);
  const [extractWeekday, setExtractWeekday] = useState(true);

  const handleStandardizeDates = () => {
    if (!dataset || !dateCol) return;
    const res = standardizeDates(dateCol, rows, dateFormat);
    applyDatasetChange(
      headers,
      res.newRows,
      `Standardize Dates: ${dateCol}`,
      'cleaning',
      `Standardized ${res.formattedCount} date(s) to ${dateFormat} (${res.invalidCount} unparseable).`,
      res.formattedCount,
      res.formattedCount
    );
  };

  const handleExtractDateComponents = () => {
    if (!dataset || !dateCol) return;
    const res = extractDateParts(dateCol, headers, rows, {
      year: extractYear,
      month: extractMonth,
      day: extractDay,
      weekday: extractWeekday
    });
    applyDatasetChange(
      res.newHeaders,
      res.newRows,
      `Extract Date Components: ${dateCol}`,
      'transformation',
      `Extracted year/month/day/weekday components from "${dateCol}".`,
      rows.length,
      rows.length * 4
    );
  };

  // ==========================================
  // 6. OUTLIER DETECTION STATE
  // ==========================================
  const [outlierCol, setOutlierCol] = useState<string>(
    headers.find(h => h.toLowerCase().includes('salary') || h.toLowerCase().includes('age')) || headers[0] || ''
  );
  const [outlierMethod, setOutlierMethod] = useState<'IQR' | 'Z-Score'>('IQR');
  const [outlierMultiplier, setOutlierMultiplier] = useState<number>(1.5);
  const [selectedOutliers, setSelectedOutliers] = useState<Set<string>>(new Set());

  const outlierDetectionResult = useMemo(() => {
    if (!dataset || !outlierCol) return { outliers: [], stats: { min: 0, max: 0, mean: 0, median: 0, q1: 0, q3: 0, iqr: 0, stdDev: 0 } };
    return detectOutliers(outlierCol, rows, outlierMethod, outlierMultiplier);
  }, [dataset, outlierCol, rows, outlierMethod, outlierMultiplier]);

  // Select all outliers by default when detection runs
  React.useEffect(() => {
    const ids = new Set(outlierDetectionResult.outliers.map(o => o.rowId));
    setSelectedOutliers(ids);
  }, [outlierDetectionResult]);

  const handleExecuteOutlierAction = (action: 'remove_rows' | 'replace_mean' | 'replace_median' | 'replace_null' | 'clamp') => {
    if (!dataset || selectedOutliers.size === 0) return;

    if (!window.confirm(`Are you sure you want to apply action "${action}" to ${selectedOutliers.size} outlier records?`)) {
      return;
    }

    const res = handleOutliers(
      outlierCol,
      rows,
      Array.from(selectedOutliers),
      action,
      {
        mean: outlierDetectionResult.stats.mean,
        median: outlierDetectionResult.stats.median,
        lowerBound: outlierDetectionResult.outliers[0]?.lowerBound,
        upperBound: outlierDetectionResult.outliers[0]?.upperBound
      }
    );

    applyDatasetChange(
      headers,
      res.newRows,
      `Resolve Outliers: ${outlierCol}`,
      'cleaning',
      `Applied "${action}" to ${res.affectedCount} outlier records in column "${outlierCol}".`,
      res.affectedCount,
      res.affectedCount
    );
  };

  // ==========================================
  // 7. EMPTY DATA CLEANER STATE
  // ==========================================
  const emptyAnalysis = useMemo(() => {
    if (!dataset) return { completelyEmptyRowIndices: [], completelyEmptyColumns: [], singleValueColumns: [] };
    return findEmptyEntities(headers, rows);
  }, [dataset, headers, rows]);

  const handleCleanEmptyEntities = (opts: { removeEmptyRows: boolean; removeEmptyCols: boolean; removeSingleValCols?: boolean }) => {
    if (!dataset) return;
    const res = removeEmptyRowsAndColumns(headers, rows, opts);
    applyDatasetChange(
      res.newHeaders,
      res.newRows,
      'Clean Empty & Constant Data',
      'cleaning',
      `Removed ${res.removedRowsCount} completely empty row(s) and ${res.removedCols.length} empty/constant column(s): ${res.removedCols.join(', ')}.`,
      res.removedRowsCount,
      res.removedRowsCount * headers.length
    );
  };

  if (!dataset) {
    return (
      <div className="p-8 text-center text-slate-500">
        Please load a dataset to use the cleaning tools.
      </div>
    );
  }

  const subToolTabs = [
    { id: 'duplicates', label: '1. Duplicate Manager', icon: Copy, badge: exactDupes.totalDuplicates },
    { id: 'missing', label: '2. Missing Data', icon: AlertTriangle },
    { id: 'text', label: '3. Text Studio', icon: Type },
    { id: 'types', label: '4. Data Types', icon: Binary },
    { id: 'dates', label: '5. Date & Time', icon: Calendar },
    { id: 'outliers', label: '6. Outlier Detection', icon: Activity, badge: outlierDetectionResult.outliers.length },
    { id: 'empty', label: '7. Empty Data Cleaner', icon: Trash2, badge: emptyAnalysis.completelyEmptyRowIndices.length }
  ];

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <Wand2 className="w-6 h-6 text-brand-600 dark:text-brand-400" />
            <span>Advanced Data Cleaning Suite</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Professional precision tools for deduplication, imputation, formatting, date standardization, and anomaly remediation.
          </p>
        </div>
      </div>

      {/* Sub-tool Selector Pills */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800">
        {subToolTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTool === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTool(tab.id as CleanSubTool)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center space-x-2 transition-all ${
                isActive
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                    isActive ? 'bg-white text-brand-700' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================= */}
      {/* 1. DUPLICATE MANAGER                                      */}
      {/* ========================================================= */}
      {activeTool === 'duplicates' && (
        <div className="space-y-6 animate-in fade-in-50 duration-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Control Panel */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
                <Copy className="w-4 h-4 text-brand-500" />
                <span>Exact Duplicate Manager</span>
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Keep Occurrence
                  </label>
                  <select
                    value={duplicateKeep}
                    onChange={e => setDuplicateKeep(e.target.value as any)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
                  >
                    <option value="first">Keep First Occurrence (Standard)</option>
                    <option value="last">Keep Last Occurrence</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Columns to Check for Duplicates
                  </label>
                  <div className="max-h-36 overflow-y-auto space-y-1 p-2 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-xs">
                    <label className="flex items-center space-x-2 font-semibold text-slate-700 dark:text-slate-300 pb-1 border-b border-slate-100 dark:border-slate-800">
                      <input
                        type="checkbox"
                        checked={duplicateSubsetCols.length === 0}
                        onChange={() => setDuplicateSubsetCols([])}
                        className="rounded text-brand-600"
                      />
                      <span>All Columns (Full Record Match)</span>
                    </label>
                    {headers.map(h => (
                      <label key={h} className="flex items-center space-x-2 text-slate-600 dark:text-slate-400">
                        <input
                          type="checkbox"
                          checked={duplicateSubsetCols.includes(h)}
                          onChange={e => {
                            if (e.target.checked) {
                              setDuplicateSubsetCols([...duplicateSubsetCols, h]);
                            } else {
                              setDuplicateSubsetCols(duplicateSubsetCols.filter(c => c !== h));
                            }
                          }}
                          className="rounded text-brand-600"
                        />
                        <span>{h}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 mb-3 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Exact Duplicates:</span>
                      <strong className="text-rose-600 dark:text-rose-400 font-mono text-sm">
                        {exactDupes.totalDuplicates} rows
                      </strong>
                    </div>
                  </div>

                  <button
                    onClick={handleRemoveExactDuplicates}
                    disabled={exactDupes.totalDuplicates === 0}
                    className="w-full py-2 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold shadow-md shadow-rose-500/20 transition-all flex items-center justify-center space-x-2"
                  >
                    <span>Remove {exactDupes.totalDuplicates} Duplicate Records</span>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Fuzzy Matching Detector */}
            <div className="md:col-span-2 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-indigo-500" />
                    <span>Fuzzy Duplicate Matcher (Levenshtein Distance)</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Discovers approximate duplicate records caused by typos, spelling variances, or formatting errors.
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Threshold: {Math.round(fuzzyThreshold * 100)}%
                  </span>
                  <input
                    type="range"
                    min="0.70"
                    max="0.95"
                    step="0.05"
                    value={fuzzyThreshold}
                    onChange={e => setFuzzyThreshold(Number(e.target.value))}
                    className="w-24 accent-brand-600"
                  />
                </div>
              </div>

              {fuzzyDupes.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-800/20">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    No fuzzy duplicate pairs detected at {Math.round(fuzzyThreshold * 100)}% similarity.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-80 overflow-y-auto">
                  {fuzzyDupes.map((grp, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border border-indigo-500/20 bg-indigo-50/50 dark:bg-indigo-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-indigo-600 dark:text-indigo-400">
                            Pair #{idx + 1} ({Math.round(grp.similarity * 100)}% Match)
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-700 dark:text-indigo-300">
                            Matched on: {grp.matchedColumns.join(', ') || 'fields'}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                          <div className="bg-white/60 dark:bg-slate-900/60 p-2 rounded border border-slate-200 dark:border-slate-800">
                            <strong>Row #{grp.originalIndex + 1}:</strong> {String(grp.row[headers[1]] || grp.row[headers[0]])}
                          </div>
                          <div className="bg-white/60 dark:bg-slate-900/60 p-2 rounded border border-slate-200 dark:border-slate-800">
                            <strong>Row #{grp.matchedIndex + 1}:</strong> {String(grp.matchedRow[headers[1]] || grp.matchedRow[headers[0]])}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          const updated = rows.filter(r => r._id !== grp.matchedRow._id);
                          applyDatasetChange(
                            headers,
                            updated,
                            'Remove Fuzzy Duplicate',
                            'cleaning',
                            `Removed fuzzy duplicate record #${grp.matchedIndex + 1}.`,
                            1,
                            headers.length
                          );
                        }}
                        className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold whitespace-nowrap self-end sm:self-center"
                      >
                        Remove Row #{grp.matchedIndex + 1}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. MISSING DATA MANAGER                                   */}
      {/* ========================================================= */}
      {activeTool === 'missing' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-in fade-in-50 duration-200">
          {/* Imputation Box */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>Column Imputation & Value Filling</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Target Column
                </label>
                <select
                  value={missingCol}
                  onChange={e => setMissingCol(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
                >
                  {headers.map(h => {
                    const st = missingStatsPerCol[h];
                    return (
                      <option key={h} value={h}>
                        {h} ({st?.count || 0} missing, {st?.pct || 0}%)
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Filling Strategy
                </label>
                <select
                  value={fillStrategy}
                  onChange={e => setFillStrategy(e.target.value as MissingFillStrategy)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
                >
                  <option value="median">Median (Recommended for numerical columns with outliers)</option>
                  <option value="mean">Arithmetic Mean (For standard continuous data)</option>
                  <option value="mode">Mode (Most frequent category/text)</option>
                  <option value="zero">Zero (0)</option>
                  <option value="forward">Forward Fill (Carry forward last known value)</option>
                  <option value="backward">Backward Fill (Backfill next known value)</option>
                  <option value="custom">Custom Specified Value</option>
                </select>
              </div>

              {fillStrategy === 'custom' && (
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Enter Custom Value
                  </label>
                  <input
                    type="text"
                    value={customFillValue}
                    onChange={e => setCustomFillValue(e.target.value)}
                    placeholder="e.g. Unknown or 0"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                </div>
              )}

              <button
                onClick={handleFillMissing}
                disabled={!missingCol || (missingStatsPerCol[missingCol]?.count || 0) === 0}
                className="w-full py-2 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-brand-500/20 transition-all flex items-center justify-center space-x-2"
              >
                <span>Impute Missing in "{missingCol}"</span>
                <Wand2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Missing Threshold Pruning */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
              <Trash2 className="w-4 h-4 text-rose-500" />
              <span>Threshold-based Elimination</span>
            </h3>

            {/* Drop Rows by Missing % */}
            <div className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Drop Rows by Missing %:</span>
                <span className="font-mono text-brand-600 font-bold">{dropRowThreshold}% missing</span>
              </div>
              <input
                type="range"
                min="20"
                max="90"
                step="5"
                value={dropRowThreshold}
                onChange={e => setDropRowThreshold(Number(e.target.value))}
                className="w-full accent-brand-600"
              />
              <button
                onClick={handleDropRowsByThreshold}
                className="w-full py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
              >
                Drop Rows with &gt; {dropRowThreshold}% missing fields
              </button>
            </div>

            {/* Drop Columns by Missing % */}
            <div className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Drop Columns by Missing %:</span>
                <span className="font-mono text-brand-600 font-bold">{dropColThreshold}% missing</span>
              </div>
              <input
                type="range"
                min="30"
                max="95"
                step="5"
                value={dropColThreshold}
                onChange={e => setDropColThreshold(Number(e.target.value))}
                className="w-full accent-brand-600"
              />
              <button
                onClick={handleDropColsByThreshold}
                className="w-full py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
              >
                Drop Columns with &gt; {dropColThreshold}% missing values
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. TEXT CLEANING STUDIO                                   */}
      {/* ========================================================= */}
      {activeTool === 'text' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 animate-in fade-in-50 duration-200">
          {/* Casing & Cleanup */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
              <Type className="w-4 h-4 text-brand-500" />
              <span>Standardize Text & Case</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Target Text Column
                </label>
                <select
                  value={textCol}
                  onChange={e => setTextCol(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
                >
                  {headers.map(h => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Letter Casing
                </label>
                <select
                  value={textCasing}
                  onChange={e => setTextCasing(e.target.value as any)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
                >
                  <option value="title">Title Case (e.g. John Doe)</option>
                  <option value="uppercase">UPPERCASE (e.g. JOHN DOE)</option>
                  <option value="lowercase">lowercase (e.g. john doe)</option>
                  <option value="sentence">Sentence case (e.g. John doe)</option>
                  <option value="none">Preserve Existing Case</option>
                </select>
              </div>

              <div className="space-y-1.5 pt-1 text-xs">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={trimSpaces}
                    onChange={e => setTrimSpaces(e.target.checked)}
                    className="rounded text-brand-600"
                  />
                  <span>Trim extra spaces and multiple spaces</span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={removeSpecial}
                    onChange={e => setRemoveSpecial(e.target.checked)}
                    className="rounded text-brand-600"
                  />
                  <span>Strip non-alphanumeric special characters</span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={removeDigits}
                    onChange={e => setRemoveDigits(e.target.checked)}
                    className="rounded text-brand-600"
                  />
                  <span>Remove numbers/digits</span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={removePunct}
                    onChange={e => setRemovePunct(e.target.checked)}
                    className="rounded text-brand-600"
                  />
                  <span>Remove punctuation marks</span>
                </label>
              </div>

              <button
                onClick={handleCleanText}
                className="w-full py-2 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-500/20 transition-all"
              >
                Apply Text Clean
              </button>
            </div>
          </div>

          {/* Find & Replace */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
              <Search className="w-4 h-4 text-emerald-500" />
              <span>Find & Replace Text</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Search String / Regex
                </label>
                <input
                  type="text"
                  placeholder="e.g. USA or [0-9]+"
                  value={findPattern}
                  onChange={e => setFindPattern(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Replacement
                </label>
                <input
                  type="text"
                  placeholder="e.g. United States"
                  value={replaceTarget}
                  onChange={e => setReplaceTarget(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <label className="flex items-center space-x-2 text-xs">
                <input
                  type="checkbox"
                  checked={isRegexSearch}
                  onChange={e => setIsRegexSearch(e.target.checked)}
                  className="rounded text-brand-600"
                />
                <span>Treat search string as Regular Expression (Regex)</span>
              </label>

              <button
                onClick={handleFindReplace}
                disabled={!findPattern}
                className="w-full py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold transition-all"
              >
                Execute Replace
              </button>
            </div>
          </div>

          {/* Split & Merge Columns */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
              <Scissors className="w-4 h-4 text-indigo-500" />
              <span>Split / Merge Columns</span>
            </h3>

            {/* Split */}
            <div className="space-y-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Split Single Column</span>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={splitColName}
                  onChange={e => setSplitColName(e.target.value)}
                  className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800"
                >
                  {headers.map(h => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Delimiter (e.g. space or ,)"
                  value={splitDelimiter}
                  onChange={e => setSplitDelimiter(e.target.value)}
                  className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800"
                />
              </div>
              <input
                type="text"
                placeholder="New Column Names (comma separated)"
                value={splitNewCols}
                onChange={e => setSplitNewCols(e.target.value)}
                className="w-full px-2 py-1 rounded border border-slate-200 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800"
              />
              <button
                onClick={handleSplitColumn}
                className="w-full py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
              >
                Apply Column Split
              </button>
            </div>

            {/* Merge */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Merge Multiple Columns</span>
              <div className="max-h-24 overflow-y-auto space-y-1 p-1.5 rounded border border-slate-100 dark:border-slate-800 text-[11px]">
                {headers.map(h => (
                  <label key={h} className="flex items-center space-x-1.5">
                    <input
                      type="checkbox"
                      checked={mergeColsList.includes(h)}
                      onChange={e => {
                        if (e.target.checked) setMergeColsList([...mergeColsList, h]);
                        else setMergeColsList(mergeColsList.filter(c => c !== h));
                      }}
                      className="rounded text-brand-600"
                    />
                    <span>{h}</span>
                  </label>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Separator (e.g. space or ,)"
                  value={mergeSeparator}
                  onChange={e => setMergeSeparator(e.target.value)}
                  className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800"
                />
                <input
                  type="text"
                  placeholder="Target Column Name"
                  value={mergeTargetCol}
                  onChange={e => setMergeTargetCol(e.target.value)}
                  className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800"
                />
              </div>
              <button
                onClick={handleMergeColumns}
                disabled={mergeColsList.length < 2}
                className="w-full py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold"
              >
                Merge Selected Columns
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. DATA TYPE CONVERTER                                    */}
      {/* ========================================================= */}
      {activeTool === 'types' && (
        <div className="max-w-2xl mx-auto p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4 animate-in fade-in-50 duration-200">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
            <Binary className="w-4 h-4 text-brand-500" />
            <span>Robust Data Type Conversion Engine</span>
          </h3>

          <div className="space-y-4">
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Select Column to Convert
              </label>
              <select
                value={typeCol}
                onChange={e => setTypeCol(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
              >
                {headers.map(h => (
                  <option key={h} value={h}>
                    {h} (Current: {dataset.columnsMeta.find(m => m.name === h)?.inferredType})
                  </option>
                ))}
              </select>
            </div>

            <div className="p-3.5 rounded-xl bg-brand-500/10 border border-brand-500/20 text-xs text-brand-950 dark:text-brand-200 flex items-center justify-between">
              <div>
                <span className="font-semibold">AI Inferred Type:</span>{' '}
                <strong className="uppercase">{suggestedType}</strong>
              </div>
              <button
                onClick={() => setTargetType(suggestedType)}
                className="px-2.5 py-1 rounded bg-brand-600 text-white text-[11px] font-semibold hover:bg-brand-700"
              >
                Use Suggestion
              </button>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Target Data Type
              </label>
              <select
                value={targetType}
                onChange={e => setTargetType(e.target.value as DataType)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
              >
                <option value="integer">Integer (Whole numbers: 1, 25, 100)</option>
                <option value="decimal">Decimal (Floating point: 12.50, 99.99)</option>
                <option value="date">Date (Standardized ISO: YYYY-MM-DD)</option>
                <option value="boolean">Boolean (true / false)</option>
                <option value="text">Text / String</option>
                <option value="category">Categorical</option>
              </select>
            </div>

            <button
              onClick={handleConvertType}
              className="w-full py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-500/20 transition-all"
            >
              Convert Column Type & Validate
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. DATE & TIME CLEANER                                    */}
      {/* ========================================================= */}
      {activeTool === 'dates' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-in fade-in-50 duration-200">
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-brand-500" />
              <span>Standardize Date Formatting</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Date Column
                </label>
                <select
                  value={dateCol}
                  onChange={e => setDateCol(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
                >
                  {headers.map(h => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Target Date Format
                </label>
                <select
                  value={dateFormat}
                  onChange={e => setDateFormat(e.target.value as TargetDateFormat)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
                >
                  <option value="YYYY-MM-DD">ISO Standard (YYYY-MM-DD) - Recommended</option>
                  <option value="MM/DD/YYYY">US Format (MM/DD/YYYY)</option>
                  <option value="DD/MM/YYYY">European Format (DD/MM/YYYY)</option>
                  <option value="YYYY/MM/DD">Japan / ISO Slash (YYYY/MM/DD)</option>
                </select>
              </div>

              <button
                onClick={handleStandardizeDates}
                className="w-full py-2 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-500/20 transition-all"
              >
                Standardize All Dates
              </button>
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-indigo-500" />
              <span>Date Feature Engineering</span>
            </h3>

            <p className="text-xs text-slate-500">
              Extract individual calendar elements into new dedicated columns for time-series and demographic analysis.
            </p>

            <div className="space-y-2 text-xs">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={extractYear}
                  onChange={e => setExtractYear(e.target.checked)}
                  className="rounded text-brand-600"
                />
                <span>Extract Year (e.g. 2023)</span>
              </label>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={extractMonth}
                  onChange={e => setExtractMonth(e.target.checked)}
                  className="rounded text-brand-600"
                />
                <span>Extract Month Number (1 - 12)</span>
              </label>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={extractDay}
                  onChange={e => setExtractDay(e.target.checked)}
                  className="rounded text-brand-600"
                />
                <span>Extract Day of Month (1 - 31)</span>
              </label>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={extractWeekday}
                  onChange={e => setExtractWeekday(e.target.checked)}
                  className="rounded text-brand-600"
                />
                <span>Extract Day of Week (Monday - Sunday)</span>
              </label>
            </div>

            <button
              onClick={handleExtractDateComponents}
              className="w-full py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all"
            >
              Generate Extracted Columns
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 6. OUTLIER DETECTION (IQR & Z-Score)                       */}
      {/* ========================================================= */}
      {activeTool === 'outliers' && (
        <div className="space-y-6 animate-in fade-in-50 duration-200">
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-amber-500" />
                  <span>Numerical Outlier & Anomaly Inspector</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Statistical bounding via Interquartile Range (IQR) or Standard Deviations (Z-score). Outliers are never removed without explicit review.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <select
                  value={outlierCol}
                  onChange={e => setOutlierCol(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
                >
                  {headers.map(h => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>

                <select
                  value={outlierMethod}
                  onChange={e => setOutlierMethod(e.target.value as any)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
                >
                  <option value="IQR">IQR (Tukey's Fences)</option>
                  <option value="Z-Score">Z-Score (Std Deviations)</option>
                </select>

                <div className="flex items-center space-x-1 text-xs">
                  <span className="text-slate-400">Factor:</span>
                  <input
                    type="number"
                    step="0.5"
                    min="1.0"
                    max="4.0"
                    value={outlierMultiplier}
                    onChange={e => setOutlierMultiplier(Number(e.target.value))}
                    className="w-16 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Stats Summary Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 pt-2">
              <div className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Outliers Flagged</span>
                <p className="text-sm font-extrabold text-amber-600 dark:text-amber-400 mt-0.5">
                  {outlierDetectionResult.outliers.length} records
                </p>
              </div>
              <div className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Mean</span>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">{outlierDetectionResult.stats.mean}</p>
              </div>
              <div className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Median</span>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">{outlierDetectionResult.stats.median}</p>
              </div>
              <div className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Q1 (25%)</span>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">{outlierDetectionResult.stats.q1}</p>
              </div>
              <div className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Q3 (75%)</span>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">{outlierDetectionResult.stats.q3}</p>
              </div>
              <div className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase">IQR</span>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">{outlierDetectionResult.stats.iqr}</p>
              </div>
              <div className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Std Dev (σ)</span>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">{outlierDetectionResult.stats.stdDev}</p>
              </div>
            </div>

            {/* Outliers Review List & Action Buttons */}
            {outlierDetectionResult.outliers.length > 0 ? (
              <div className="space-y-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-2 text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Selected Outliers ({selectedOutliers.size}):
                    </span>
                    <button
                      onClick={() =>
                        setSelectedOutliers(
                          selectedOutliers.size === outlierDetectionResult.outliers.length
                            ? new Set()
                            : new Set(outlierDetectionResult.outliers.map(o => o.rowId))
                        )
                      }
                      className="text-brand-600 underline text-xs"
                    >
                      {selectedOutliers.size === outlierDetectionResult.outliers.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleExecuteOutlierAction('clamp')}
                      className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 text-xs font-semibold"
                    >
                      Clamp to Boundary
                    </button>
                    <button
                      onClick={() => handleExecuteOutlierAction('replace_median')}
                      className="px-3 py-1 rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400 hover:bg-brand-500/20 text-xs font-semibold"
                    >
                      Replace with Median ({outlierDetectionResult.stats.median})
                    </button>
                    <button
                      onClick={() => handleExecuteOutlierAction('remove_rows')}
                      className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
                    >
                      Delete {selectedOutliers.size} Outlier Rows
                    </button>
                  </div>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-2">
                  {outlierDetectionResult.outliers.map(out => (
                    <div
                      key={out.rowId}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs transition-colors ${
                        selectedOutliers.has(out.rowId)
                          ? 'border-amber-500/30 bg-amber-500/10'
                          : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30'
                      }`}
                    >
                      <label className="flex items-center space-x-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedOutliers.has(out.rowId)}
                          onChange={e => {
                            const next = new Set(selectedOutliers);
                            if (e.target.checked) next.add(out.rowId);
                            else next.delete(out.rowId);
                            setSelectedOutliers(next);
                          }}
                          className="rounded text-brand-600"
                        />
                        <div>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            Row #{out.rowIndex + 1}: Value ={' '}
                            <span className="text-amber-600 dark:text-amber-400 font-mono text-sm font-black">
                              {out.rawValue}
                            </span>
                          </span>
                          <span className="text-[11px] text-slate-400 ml-2">
                            Bound: [{out.lowerBound} to {out.upperBound}] • Dist Score: {out.score}
                          </span>
                        </div>
                      </label>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          out.severity === 'extreme'
                            ? 'bg-rose-500/20 text-rose-600'
                            : 'bg-amber-500/20 text-amber-600'
                        }`}
                      >
                        {out.severity} Anomaly
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-500">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                No statistical outliers detected in "{outlierCol}".
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 7. EMPTY DATA CLEANER                                     */}
      {/* ========================================================= */}
      {activeTool === 'empty' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 animate-in fade-in-50 duration-200">
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
              <Trash2 className="w-4 h-4 text-rose-500" />
              <span>Empty Rows Purge</span>
            </h3>

            <p className="text-xs text-slate-500">
              Identifies records where every single attribute cell is completely blank, null, or empty whitespace.
            </p>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-400">Empty Rows Discovered:</span>
              <strong className="text-rose-600 font-mono text-sm">
                {emptyAnalysis.completelyEmptyRowIndices.length} rows
              </strong>
            </div>

            <button
              onClick={() => handleCleanEmptyEntities({ removeEmptyRows: true, removeEmptyCols: false })}
              disabled={emptyAnalysis.completelyEmptyRowIndices.length === 0}
              className="w-full py-2 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold transition-all"
            >
              Purge All Empty Rows
            </button>
          </div>

          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
              <Trash2 className="w-4 h-4 text-amber-500" />
              <span>Empty Columns Purge</span>
            </h3>

            <p className="text-xs text-slate-500">
              Columns where 100% of cells across all rows contain no information.
            </p>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-400">100% Blank Columns:</span>
              <strong className="text-amber-600 font-mono text-sm">
                {emptyAnalysis.completelyEmptyColumns.length} columns
              </strong>
            </div>

            <button
              onClick={() => handleCleanEmptyEntities({ removeEmptyRows: false, removeEmptyCols: true })}
              disabled={emptyAnalysis.completelyEmptyColumns.length === 0}
              className="w-full py-2 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold transition-all"
            >
              Remove Empty Columns
            </button>
          </div>

          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
              <Trash2 className="w-4 h-4 text-indigo-500" />
              <span>Zero-Variance Columns</span>
            </h3>

            <p className="text-xs text-slate-500">
              Columns that contain only one repeated constant value (e.g. constant status flag), providing zero variance.
            </p>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">Constant Columns:</span>
                <strong className="text-indigo-600 font-mono text-sm">
                  {emptyAnalysis.singleValueColumns.length}
                </strong>
              </div>
              {emptyAnalysis.singleValueColumns.map(s => (
                <div key={s.column} className="text-[11px] text-slate-500 truncate">
                  "{s.column}" = "{s.value}"
                </div>
              ))}
            </div>

            <button
              onClick={() => handleCleanEmptyEntities({ removeEmptyRows: false, removeEmptyCols: false, removeSingleValCols: true })}
              disabled={emptyAnalysis.singleValueColumns.length === 0}
              className="w-full py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold transition-all"
            >
              Remove Single-Value Columns
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
