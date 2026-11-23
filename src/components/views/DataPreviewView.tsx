import React, { useState } from 'react';
import {
  Table,
  Filter,
  ShieldAlert,
  Sparkles,
  ArrowRight,
  Eye,
  RefreshCw,
  SlidersHorizontal,
  Wand2
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { DataGrid } from '../common/DataGrid';

export const DataPreviewView: React.FC = () => {
  const { dataset, validationErrors, setActiveTab } = useData();

  const [showOnlyInvalid, setShowOnlyInvalid] = useState(false);
  const [highlightOutliers, setHighlightOutliers] = useState(true);

  if (!dataset) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-slate-500">No dataset is loaded currently.</p>
        <button
          onClick={() => setActiveTab('upload')}
          className="px-4 py-2 rounded-xl bg-brand-600 text-white text-xs font-semibold"
        >
          Go to Upload Center
        </button>
      </div>
    );
  }

  const invalidCount = validationErrors.length;

  return (
    <div className="p-4 lg:p-8 space-y-4 max-w-7xl mx-auto h-[calc(100vh-4rem)] flex flex-col">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex-shrink-0">
        <div>
          <div className="flex items-center space-x-2">
            <Table className="w-5 h-5 text-brand-500" />
            <h1 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">Live Data Grid Preview</h1>
            <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
              {dataset.rows.length} rows × {dataset.headers.length} cols
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Double-click any cell to edit inline. Changes update quality scores and trigger audit history.
          </p>
        </div>

        {/* View Switches & Quick Actions */}
        <div className="flex items-center space-x-2">
          {invalidCount > 0 && (
            <button
              onClick={() => setShowOnlyInvalid(!showOnlyInvalid)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                showOnlyInvalid
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 hover:bg-rose-500/20'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>{showOnlyInvalid ? 'Show All Records' : `Show Only Invalid (${invalidCount})`}</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('clean')}
            className="px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold flex items-center space-x-1.5 shadow-sm transition-all"
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>Open Cleaning Studio</span>
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="flex-1 min-h-0">
        <DataGrid
          highlightErrors={true}
          highlightOutliers={highlightOutliers}
          showOnlyInvalid={showOnlyInvalid}
          maxHeight="h-full"
        />
      </div>
    </div>
  );
};
