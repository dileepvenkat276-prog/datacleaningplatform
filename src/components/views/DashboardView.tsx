import React, { useState, useMemo } from 'react';
import {
  BarChart,
  BarChart2,
  PieChart,
  TrendingUp,
  FileText,
  AlertTriangle,
  Copy,
  Layers,
  Sparkles,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { calculateDatasetStats, profileColumn } from '../../utils/dataStats';

export const DashboardView: React.FC = () => {
  const { dataset, qualityReport, comparisonDiff, setActiveTab } = useData();

  const [selectedProfileCol, setSelectedProfileCol] = useState<string>('');

  const stats = useMemo(() => {
    if (!dataset) return null;
    return calculateDatasetStats(dataset.headers, dataset.rows);
  }, [dataset]);

  // Set default column for profiling when dataset loads
  React.useEffect(() => {
    if (dataset && dataset.headers.length > 0 && !selectedProfileCol) {
      setSelectedProfileCol(dataset.headers[0]);
    }
  }, [dataset, selectedProfileCol]);

  const profile = useMemo(() => {
    if (!dataset || !selectedProfileCol) return null;
    const meta = dataset.columnsMeta.find(m => m.name === selectedProfileCol);
    return profileColumn(selectedProfileCol, dataset.rows, meta);
  }, [dataset, selectedProfileCol]);

  if (!dataset || !stats) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">Please upload or load a dataset first.</p>
      </div>
    );
  }

  const qualityScore = qualityReport?.overallScore ?? 0;
  const originalQuality = comparisonDiff?.originalQualityScore ?? qualityScore;
  const qualityDelta = qualityScore - originalQuality;

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner / Hero */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-brand-900 via-indigo-950 to-slate-900 text-white shadow-xl">
        <div className="space-y-1">
          <div className="inline-flex items-center space-x-2 px-2.5 py-0.5 rounded-full bg-white/10 text-xs font-semibold backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-brand-400" />
            <span>Real-time Health Engine</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight">Dataset Analytics & Quality Overview</h1>
          <p className="text-slate-300 text-xs sm:text-sm max-w-xl">
            Live telemetry computed over active rows in <strong className="text-white">{dataset.filename}</strong>.
          </p>
        </div>

        <div className="flex items-center space-x-3 bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-md">
          <div className="text-right">
            <span className="text-[11px] uppercase tracking-wider text-slate-300 font-semibold block">Quality Index</span>
            <div className="flex items-baseline space-x-1.5 justify-end">
              <span className="text-3xl font-black">{qualityScore}</span>
              <span className="text-xs text-slate-400">/ 100</span>
            </div>
            {qualityDelta !== 0 && (
              <span className={`text-[11px] font-bold flex items-center justify-end ${qualityDelta > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {qualityDelta > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {qualityDelta > 0 ? `+${qualityDelta}% since initial` : `${qualityDelta}% change`}
              </span>
            )}
          </div>
          <div className="w-14 h-14 rounded-xl bg-brand-500/20 border border-brand-400/30 flex items-center justify-center">
            <ShieldCheck className="w-7 h-7 text-brand-400" />
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Records */}
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Total Records</span>
            <FileText className="w-4 h-4 text-brand-500" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-800 dark:text-slate-100">{stats.totalRows.toLocaleString()}</span>
            <p className="text-[11px] text-slate-500 mt-0.5">{stats.totalColumns} column attributes</p>
          </div>
        </div>

        {/* Missing Cells */}
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Missing Cells</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-800 dark:text-slate-100">{stats.totalMissingCells.toLocaleString()}</span>
            <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5 font-medium">
              {stats.missingPercentage}% of total cells
            </p>
          </div>
        </div>

        {/* Duplicate Rows */}
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Exact Duplicates</span>
            <Copy className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-800 dark:text-slate-100">{stats.duplicateRows}</span>
            <p className="text-[11px] text-slate-500 mt-0.5">{stats.duplicatePercentage}% redundancy rate</p>
          </div>
        </div>

        {/* Cleaned / Modified Cells */}
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Cells Cleaned</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-800 dark:text-slate-100">
              {comparisonDiff?.modifiedCellsCount.toLocaleString() ?? 0}
            </span>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">
              {comparisonDiff?.removedDuplicatesCount ?? 0} dupes removed
            </p>
          </div>
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Missing Values by Column Bar Chart */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <BarChart2 className="w-4 h-4 text-brand-500" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Missing Values by Column</h3>
              </div>
              <button
                onClick={() => setActiveTab('clean')}
                className="text-[11px] font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center"
              >
                Resolve Missing <ChevronRight className="w-3 h-3 ml-0.5" />
              </button>
            </div>

            <div className="space-y-2.5">
              {dataset.headers.slice(0, 8).map(header => {
                const missing = stats.missingByColumn[header] || 0;
                const pct = stats.totalRows > 0 ? Math.round((missing / stats.totalRows) * 100) : 0;
                return (
                  <div key={header} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[180px]">{header}</span>
                      <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                        {missing} missing ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          pct > 30 ? 'bg-rose-500' : pct > 10 ? 'bg-amber-500' : 'bg-brand-500'
                        }`}
                        style={{ width: `${Math.max(pct, missing > 0 ? 3 : 0)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Data Type Distribution & Quality Dimensions */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <PieChart className="w-4 h-4 text-indigo-500" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Column Data Types Distribution</h3>
              </div>
              <button
                onClick={() => setActiveTab('clean')}
                className="text-[11px] font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center"
              >
                Convert Types <ChevronRight className="w-3 h-3 ml-0.5" />
              </button>
            </div>

            {/* Type Pills */}
            <div className="grid grid-cols-3 gap-2.5 mb-5">
              {Object.entries(stats.typeDistribution).map(([type, count]) => (
                <div
                  key={type}
                  className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40"
                >
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">{type}</span>
                  <span className="text-lg font-black text-slate-800 dark:text-slate-100">{count} col{count > 1 ? 's' : ''}</span>
                </div>
              ))}
            </div>

            {/* Quality Dimensions Mini-Bars */}
            <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Quality Dimensions Breakdown</span>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                {qualityReport?.dimensions.map(dim => (
                  <div key={dim.name} className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-400">{dim.name}</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{dim.score}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Column Profiling Panel */}
      <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Deep Column Profiler</h3>
          </div>

          <div className="flex items-center space-x-2">
            <label className="text-xs text-slate-500">Select Attribute:</label>
            <select
              value={selectedProfileCol}
              onChange={e => setSelectedProfileCol(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200"
            >
              {dataset.headers.map(h => (
                <option key={h} value={h}>
                  {h} ({stats.columnsMeta.find(m => m.name === h)?.inferredType})
                </option>
              ))}
            </select>
          </div>
        </div>

        {profile && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <span className="text-[10px] uppercase font-bold text-slate-400">Data Type</span>
              <p className="text-sm font-bold text-brand-600 dark:text-brand-400 uppercase mt-1">{profile.type}</p>
            </div>

            <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <span className="text-[10px] uppercase font-bold text-slate-400">Unique Values</span>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1">{profile.uniqueCount}</p>
            </div>

            <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <span className="text-[10px] uppercase font-bold text-slate-400">Missing Rate</span>
              <p className="text-sm font-bold text-amber-600 dark:text-amber-400 mt-1">{profile.missingPercentage}%</p>
            </div>

            <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <span className="text-[10px] uppercase font-bold text-slate-400">
                {profile.type === 'integer' || profile.type === 'decimal' ? 'Min Value' : 'Min Length'}
              </span>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1">
                {profile.min !== undefined ? profile.min : profile.minLength ?? 'N/A'}
              </p>
            </div>

            <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <span className="text-[10px] uppercase font-bold text-slate-400">
                {profile.type === 'integer' || profile.type === 'decimal' ? 'Max Value' : 'Max Length'}
              </span>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1">
                {profile.max !== undefined ? profile.max : profile.maxLength ?? 'N/A'}
              </p>
            </div>

            <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <span className="text-[10px] uppercase font-bold text-slate-400">
                {profile.type === 'integer' || profile.type === 'decimal' ? 'Average / Mean' : 'Most Frequent (Mode)'}
              </span>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1 truncate" title={String(profile.mode || '')}>
                {profile.avg !== undefined ? profile.avg : profile.mode ?? 'N/A'}
              </p>
            </div>
          </div>
        )}

        {/* Numerical Histogram or Frequency Table */}
        {profile?.histogram && profile.histogram.length > 0 ? (
          <div className="pt-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 block">Value Distribution (Histogram)</span>
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
              {profile.histogram.map(b => (
                <div key={b.bin} className="p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-center">
                  <div className="text-[10px] text-slate-400 truncate">{b.bin}</div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">{b.count} rows</div>
                </div>
              ))}
            </div>
          </div>
        ) : profile?.frequencies && profile.frequencies.length > 0 ? (
          <div className="pt-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 block">Top Frequent Categories</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {profile.frequencies.slice(0, 4).map(f => (
                <div key={f.value} className="p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center text-xs">
                  <span className="truncate max-w-[120px] font-medium text-slate-700 dark:text-slate-300">{f.value || '(blank)'}</span>
                  <span className="text-[11px] font-mono text-slate-500">{f.count} ({f.percentage}%)</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
