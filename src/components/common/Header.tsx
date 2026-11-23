import React from 'react';
import {
  Database,
  Undo2,
  Redo2,
  Sun,
  Moon,
  Sparkles,
  ShieldAlert,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet
} from 'lucide-react';
import { useData } from '../../context/DataContext';

export const Header: React.FC = () => {
  const {
    dataset,
    canUndo,
    canRedo,
    undo,
    redo,
    theme,
    toggleTheme,
    qualityReport,
    validationErrors,
    loadSampleData,
    resetWorkspace,
    setActiveTab
  } = useData();

  const qualityScore = qualityReport?.overallScore ?? 0;
  const qualityColor =
    qualityScore >= 80
      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
      : qualityScore >= 60
      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
      : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-4 lg:px-6 flex items-center justify-between transition-colors">
      {/* Brand & Dataset Status */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                DataForge Studio
              </span>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20">
                PRO
              </span>
            </div>
            {dataset && (
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[200px] sm:max-w-xs flex items-center gap-1">
                <FileSpreadsheet className="w-3 h-3 text-slate-400" />
                <span className="font-medium text-slate-700 dark:text-slate-300">{dataset.filename}</span>
                <span className="text-[11px] text-slate-400">({dataset.rows.length} rows, {dataset.headers.length} cols)</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Center / Action Toolbar */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Undo / Redo */}
        <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-800/60 p-0.5">
          <button
            onClick={undo}
            disabled={!canUndo}
            title="Undo last operation (Ctrl+Z)"
            className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition-all ${
              canUndo
                ? 'hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-sm cursor-pointer'
                : 'text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-50'
            }`}
          >
            <Undo2 className="w-4 h-4" />
            <span className="hidden md:inline text-xs">Undo</span>
          </button>
          <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 my-auto" />
          <button
            onClick={redo}
            disabled={!canRedo}
            title="Redo operation (Ctrl+Y)"
            className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition-all ${
              canRedo
                ? 'hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-sm cursor-pointer'
                : 'text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-50'
            }`}
          >
            <Redo2 className="w-4 h-4" />
            <span className="hidden md:inline text-xs">Redo</span>
          </button>
        </div>

        {/* Quality Score Indicator */}
        {dataset && (
          <button
            onClick={() => setActiveTab('analysis')}
            className={`hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all hover:scale-105 ${qualityColor}`}
            title="Click to view full quality dimensions breakdown"
          >
            {qualityScore >= 80 ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5" />
            )}
            <span>Quality: {qualityScore}%</span>
          </button>
        )}

        {/* Validation Errors Count */}
        {validationErrors.length > 0 && (
          <button
            onClick={() => setActiveTab('validation')}
            className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-semibold hover:bg-rose-500/20 transition-all"
            title="Click to resolve validation errors"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>{validationErrors.length} Issue{validationErrors.length > 1 ? 's' : ''}</span>
          </button>
        )}

        {/* Quick Sample Data Reset */}
        <button
          onClick={loadSampleData}
          title="Reload dirty sample customer dataset"
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium hidden md:flex items-center gap-1.5 transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Demo Data</span>
        </button>

        {/* Reset Workspace */}
        <button
          onClick={() => {
            if (window.confirm('Reset workspace and clear in-memory data?')) {
              resetWorkspace();
            }
          }}
          title="Reset workspace and purge memory"
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:border-rose-300 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 text-xs transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
        </button>
      </div>
    </header>
  );
};
