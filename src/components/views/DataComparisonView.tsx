import React from 'react';
import {
  GitCompare,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Copy,
  Layers,
  CheckCircle2,
  Table,
  Sparkles
} from 'lucide-react';
import { useData } from '../../context/DataContext';

export const DataComparisonView: React.FC = () => {
  const { dataset, comparisonDiff } = useData();

  if (!dataset || !comparisonDiff) {
    return <div className="p-8 text-center text-slate-500">Please load a dataset to view comparisons.</div>;
  }

  const {
    originalRowsCount,
    currentRowsCount,
    rowDelta,
    originalColumnsCount,
    currentColumnsCount,
    originalMissingCount,
    currentMissingCount,
    missingDelta,
    removedDuplicatesCount,
    modifiedCellsCount,
    originalQualityScore,
    currentQualityScore,
    addedColumns,
    removedColumns,
    changedRowsList
  } = comparisonDiff;

  const qualityDelta = currentQualityScore - originalQualityScore;

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
          <GitCompare className="w-6 h-6 text-brand-600 dark:text-brand-400" />
          <span>Before vs After Data Comparison</span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Precision diff and audit between the original ingested state and your current transformed dataset.
        </p>
      </div>

      {/* Quality Score Comparison Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-brand-400">Quality Index Evolution</span>
          <h2 className="text-xl font-bold">Health Score Progression</h2>
          <p className="text-xs text-slate-400 max-w-md">
            Calculated across all heuristic checks including completeness, validity, and uniqueness.
          </p>
        </div>

        <div className="flex items-center space-x-6">
          <div className="text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Original Score</span>
            <span className="text-3xl font-black text-slate-300">{originalQualityScore}%</span>
          </div>

          <ArrowRight className="w-6 h-6 text-brand-400" />

          <div className="text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Current Score</span>
            <span className="text-3xl font-black text-emerald-400">{currentQualityScore}%</span>
          </div>

          <div className="pl-4 border-l border-white/10 text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Net Gain</span>
            <span className={`text-2xl font-extrabold ${qualityDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {qualityDelta >= 0 ? `+${qualityDelta}%` : `${qualityDelta}%`}
            </span>
          </div>
        </div>
      </div>

      {/* Side by Side Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Row Counts */}
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-1.5">
          <span className="text-xs font-semibold text-slate-500">Record Volume</span>
          <div className="flex items-baseline space-x-2">
            <span className="text-xl font-extrabold text-slate-800 dark:text-slate-100">{currentRowsCount}</span>
            <span className="text-xs text-slate-400">was {originalRowsCount}</span>
          </div>
          <p className="text-[11px] font-bold text-brand-600 dark:text-brand-400">
            {rowDelta >= 0 ? `+${rowDelta} rows` : `${rowDelta} rows removed`}
          </p>
        </div>

        {/* Missing Values */}
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-1.5">
          <span className="text-xs font-semibold text-slate-500">Missing Data Cells</span>
          <div className="flex items-baseline space-x-2">
            <span className="text-xl font-extrabold text-slate-800 dark:text-slate-100">{currentMissingCount}</span>
            <span className="text-xs text-slate-400">was {originalMissingCount}</span>
          </div>
          <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
            {missingDelta <= 0 ? `${Math.abs(missingDelta)} cells resolved` : `+${missingDelta} blanks added`}
          </p>
        </div>

        {/* Removed Duplicates */}
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-1.5">
          <span className="text-xs font-semibold text-slate-500">Duplicates Removed</span>
          <div className="text-xl font-extrabold text-slate-800 dark:text-slate-100">{removedDuplicatesCount}</div>
          <p className="text-[11px] text-slate-400">redundant rows purged</p>
        </div>

        {/* Modified Cells */}
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-1.5">
          <span className="text-xs font-semibold text-slate-500">Total Modified Cells</span>
          <div className="text-xl font-extrabold text-slate-800 dark:text-slate-100">{modifiedCellsCount}</div>
          <p className="text-[11px] text-slate-400">values repaired or cleaned</p>
        </div>
      </div>

      {/* Column Schema Delta */}
      {(addedColumns.length > 0 || removedColumns.length > 0) && (
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Schema Attributes Delta</h3>
          <div className="flex flex-wrap gap-2 text-xs">
            {addedColumns.map(c => (
              <span key={c} className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-mono">
                + Added: {c}
              </span>
            ))}
            {removedColumns.map(c => (
              <span key={c} className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-700 dark:text-rose-300 font-mono">
                - Removed: {c}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Granular Record-by-Record Changes List */}
      <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
            <Table className="w-4 h-4 text-brand-500" />
            <span>Granular Record Changes Audit ({changedRowsList.length} rows modified)</span>
          </h3>
          <span className="text-xs text-slate-400">Sample of modified records</span>
        </div>

        {changedRowsList.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No cell-level modifications recorded between original and active dataset.
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {changedRowsList.map(item => (
              <div
                key={item.rowId}
                className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-xs space-y-2"
              >
                <span className="font-bold text-slate-700 dark:text-slate-300 block">
                  Row #{item.rowIndex + 1}
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {item.changes.map(ch => (
                    <div
                      key={ch.column}
                      className="p-2 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1 font-mono text-[11px]"
                    >
                      <span className="font-bold text-slate-600 dark:text-slate-300 block">{ch.column}:</span>
                      <div className="flex items-center space-x-1.5">
                        <span className="text-rose-500 line-through truncate max-w-[100px]">
                          {ch.original === '' || ch.original === null ? '(empty)' : String(ch.original)}
                        </span>
                        <ArrowRight className="w-3 h-3 text-slate-400 flex-shrink-0" />
                        <span className="text-emerald-500 font-bold truncate max-w-[100px]">
                          {ch.current === '' || ch.current === null ? '(empty)' : String(ch.current)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
