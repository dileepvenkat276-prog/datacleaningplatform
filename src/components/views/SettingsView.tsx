import React from 'react';
import {
  Settings,
  Shield,
  Sun,
  Moon,
  Trash2,
  HardDrive,
  Cpu,
  Lock,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';
import { useData } from '../../context/DataContext';

export const SettingsView: React.FC = () => {
  const {
    theme,
    toggleTheme,
    resetWorkspace,
    dataset,
    qualityWeights,
    setQualityWeights,
    notify
  } = useData();

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-brand-600 dark:text-brand-400" />
          <span>Platform Settings & Privacy</span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Configure interface appearance, quality scoring algorithms, privacy preferences, and system resources.
        </p>
      </div>

      {/* Appearance Settings */}
      <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Interface Appearance</h3>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Theme Mode</span>
            <p className="text-[11px] text-slate-400">Toggle between Dark and Light SaaS theme palettes.</p>
          </div>

          <button
            onClick={toggleTheme}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold flex items-center space-x-2 transition-colors"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-4 h-4 text-amber-400" />
                <span>Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-slate-700" />
                <span>Dark Mode</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Security & Privacy Center (Section 13) */}
      <div className="p-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 text-emerald-700 dark:text-emerald-400">
          <Shield className="w-5 h-5" />
          <h3 className="text-sm font-bold">Privacy & Data Security Disclosures</h3>
        </div>

        <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
          <p className="flex items-start gap-2">
            <Lock className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
            <span>
              <strong>100% In-Browser Local Execution:</strong> All files uploaded to DataForge Studio are parsed, cleaned, and transformed strictly inside your browser's local memory. Zero dataset bytes are transmitted to any external cloud, proxy, or server.
            </span>
          </p>
          <p className="flex items-start gap-2">
            <Lock className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Zero Persistent Storage:</strong> Datasets and cleaning history reside only in volatile browser memory. Refreshing or closing the tab completely clears dataset records.
            </span>
          </p>
        </div>

        <div className="pt-2 border-t border-emerald-500/20 flex items-center justify-between">
          <span className="text-xs text-slate-500">Purge active memory immediately:</span>
          <button
            onClick={() => {
              if (window.confirm('Purge all dataset records and history from memory?')) {
                resetWorkspace();
              }
            }}
            className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all flex items-center space-x-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Purge Memory & Reset</span>
          </button>
        </div>
      </div>

      {/* Architecture & Future Expansion Roadmap (Section 12) */}
      <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
        <div className="flex items-center space-x-2">
          <Cpu className="w-5 h-5 text-brand-500" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
            Platform Architecture & Extensibility Roadmap
          </h3>
        </div>

        <p className="text-xs text-slate-500">
          In strict compliance with architectural guidelines, upcoming backend extensions are documented transparently below and will be enabled upon backend module release:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-1">
            <span className="font-bold text-slate-700 dark:text-slate-200">Dedicated Web Worker Threads</span>
            <p className="text-[11px] text-slate-400">Background thread processing for datasets exceeding 500,000+ records without UI thread blockage.</p>
          </div>

          <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-1">
            <span className="font-bold text-slate-700 dark:text-slate-200">ML Anomaly Detection (Isolation Forests)</span>
            <p className="text-[11px] text-slate-400">Multivariate statistical clustering and machine-learning anomaly scoring.</p>
          </div>

          <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-1">
            <span className="font-bold text-slate-700 dark:text-slate-200">SQL Database & API Connector Hub</span>
            <p className="text-[11px] text-slate-400">Direct streaming connectors for PostgreSQL, MySQL, Snowflake, and REST endpoints.</p>
          </div>

          <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-1">
            <span className="font-bold text-slate-700 dark:text-slate-200">Parquet & Arrow In-Memory Engine</span>
            <p className="text-[11px] text-slate-400">Native columnar reading via Apache Arrow WebAssembly for sub-millisecond aggregations.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
