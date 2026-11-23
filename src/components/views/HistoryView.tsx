import React from 'react';
import {
  History,
  Undo2,
  Redo2,
  RotateCcw,
  Clock,
  Sparkles,
  Layers,
  ArrowRight,
  CheckCircle2,
  Trash2
} from 'lucide-react';
import { useData } from '../../context/DataContext';

export const HistoryView: React.FC = () => {
  const {
    dataset,
    history,
    historyIndex,
    canUndo,
    canRedo,
    undo,
    redo,
    restoreSnapshot,
    clearHistory
  } = useData();

  if (!dataset) {
    return <div className="p-8 text-center text-slate-500">Please load a dataset to view history logs.</div>;
  }

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <History className="w-6 h-6 text-brand-600 dark:text-brand-400" />
            <span>Dataset Version & Audit History</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Immutable operation snapshots enabling deterministic rollback, undo/redo, and compliance audit tracking.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={undo}
            disabled={!canUndo}
            className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold flex items-center space-x-1.5 transition-colors"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>Undo Step</span>
          </button>

          <button
            onClick={redo}
            disabled={!canRedo}
            className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold flex items-center space-x-1.5 transition-colors"
          >
            <Redo2 className="w-3.5 h-3.5" />
            <span>Redo Step</span>
          </button>

          <button
            onClick={() => {
              if (window.confirm('Clear all operation history snapshots? Current data will become baseline.')) {
                clearHistory();
              }
            }}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-500 hover:text-rose-600 transition-colors"
            title="Clear history log"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Timeline List */}
      <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Timeline ({history.length} snapshots logged)
          </span>
          <span className="text-xs text-slate-400">
            Active version: <strong className="text-brand-600 dark:text-brand-400">Snapshot #{historyIndex + 1}</strong>
          </span>
        </div>

        <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
          {history.map((entry, idx) => {
            const isCurrent = idx === historyIndex;
            const isPast = idx < historyIndex;

            return (
              <div key={entry.id} className="relative group">
                {/* Marker icon */}
                <div
                  className={`absolute -left-6 top-1.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                    isCurrent
                      ? 'bg-brand-600 border-brand-200 dark:border-brand-800 ring-4 ring-brand-500/20 text-white'
                      : isPast
                      ? 'bg-emerald-500 border-white dark:border-slate-900 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 border-white dark:border-slate-900 text-transparent'
                  }`}
                >
                  {isCurrent || isPast ? <CheckCircle2 className="w-3 h-3" /> : null}
                </div>

                <div
                  className={`p-4 rounded-2xl border transition-all ${
                    isCurrent
                      ? 'border-brand-500/40 bg-brand-50/40 dark:bg-brand-950/20 shadow-sm'
                      : 'border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20 hover:border-slate-200'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">
                          {entry.operationName}
                        </span>
                        <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full uppercase bg-slate-200/60 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300">
                          {entry.category}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-500 text-white">
                            Current Active State
                          </span>
                        )}
                      </div>
                      <p className="text-slate-600 dark:text-slate-400">{entry.description}</p>
                      <div className="flex items-center space-x-3 text-[11px] text-slate-400 font-mono pt-1">
                        <span className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{entry.timestamp}</span>
                        </span>
                        <span>•</span>
                        <span>{entry.snapshotRows.length} rows snapshot</span>
                        <span>•</span>
                        <span>
                          {entry.affectedRows} affected row{entry.affectedRows !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>

                    {!isCurrent && (
                      <button
                        onClick={() => restoreSnapshot(entry.id)}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold whitespace-nowrap self-end sm:self-center transition-colors"
                      >
                        Restore This State
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
