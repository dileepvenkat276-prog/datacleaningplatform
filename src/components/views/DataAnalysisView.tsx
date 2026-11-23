import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  HelpCircle,
  Sliders,
  Sparkles,
  ArrowRight,
  Info,
  Wand2,
  Download
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { exportDataQualityReport } from '../../utils/fileHandler';

export const DataAnalysisView: React.FC = () => {
  const { dataset, qualityReport, qualityWeights, setQualityWeights, setActiveTab, executeAssistantProposal } = useData();

  const [showWeightSliders, setShowWeightSliders] = useState(false);

  if (!dataset || !qualityReport) {
    return <div className="p-8 text-center text-slate-500">Please load a dataset to run quality inspection.</div>;
  }

  const overall = qualityReport.overallScore;

  const scoreBadgeColor =
    overall >= 80
      ? 'text-emerald-500 border-emerald-500/20 bg-emerald-500/10'
      : overall >= 60
      ? 'text-amber-500 border-amber-500/20 bg-amber-500/10'
      : 'text-rose-500 border-rose-500/20 bg-rose-500/10';

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-brand-600 dark:text-brand-400" />
            <span>Smart Data Quality Inspector & Dimensions</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Multi-dimensional data health evaluation computed dynamically over the active dataset schema.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowWeightSliders(!showWeightSliders)}
            className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Configure Weights</span>
          </button>

          <button
            onClick={() => exportDataQualityReport(qualityReport, `${dataset.name}_quality_report.txt`)}
            className="px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-500/20 flex items-center space-x-1.5 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Quality Audit</span>
          </button>
        </div>
      </div>

      {/* Main Score & Disclaimer Card */}
      <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center space-x-6">
          <div className={`w-28 h-28 rounded-3xl border-2 flex flex-col items-center justify-center font-black ${scoreBadgeColor}`}>
            <span className="text-4xl">{overall}</span>
            <span className="text-[11px] font-bold uppercase tracking-wider opacity-70">/ 100</span>
          </div>

          <div className="space-y-1.5">
            <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">
              {overall >= 80 ? 'Optimal Dataset Health' : overall >= 60 ? 'Moderate Quality - Remediation Advised' : 'Critical Anomalies Detected'}
            </h2>
            <p className="text-xs text-slate-500 max-w-lg">
              Evaluated across {qualityReport.stats.totalRows.toLocaleString()} rows and {qualityReport.stats.totalColumns} columns.{' '}
              {qualityReport.issues.length} active quality issues discovered.
            </p>
            <div className="text-[11px] font-mono text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg inline-block border border-slate-100 dark:border-slate-800">
              Formula: {qualityReport.calculationFormula}
            </div>
          </div>
        </div>

        {/* Disclaimer Callout as mandated by specifications */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 max-w-sm text-xs space-y-1">
          <div className="flex items-center space-x-1.5 text-slate-700 dark:text-slate-300 font-bold">
            <Info className="w-4 h-4 text-brand-500" />
            <span>Scientific Quality Notice</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Data Quality Scores reflect programmatic schema conformance, completeness, and statistical outlier heuristics. Statistical analysis cannot guarantee physical, real-world factuality.
          </p>
        </div>
      </div>

      {/* Configurable Weights Drawer */}
      {showWeightSliders && (
        <div className="p-5 rounded-2xl border border-brand-500/20 bg-brand-500/5 animate-in slide-in-from-top-2 duration-150 space-y-4">
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            Configure Quality Dimension Weights (%)
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {Object.keys(qualityWeights).map(dimKey => {
              const val = (qualityWeights as any)[dimKey];
              return (
                <div key={dimKey} className="space-y-1 bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="flex justify-between text-xs">
                    <span className="capitalize font-semibold text-slate-600 dark:text-slate-300">{dimKey}</span>
                    <strong className="text-brand-600 dark:text-brand-400 font-mono">{val}%</strong>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    step="5"
                    value={val}
                    onChange={e => {
                      setQualityWeights({
                        ...qualityWeights,
                        [dimKey]: Number(e.target.value)
                      });
                    }}
                    className="w-full accent-brand-600"
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 6 Dimension Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {qualityReport.dimensions.map(dim => {
          const isHealthy = dim.score >= 80;
          const isWarning = dim.score >= 60 && dim.score < 80;

          return (
            <div
              key={dim.name}
              className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{dim.name}</span>
                  <span
                    className={`text-xs font-black px-2 py-0.5 rounded-full ${
                      isHealthy
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : isWarning
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {dim.score} / 100
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">{dim.description}</p>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-medium">
                <span>Weight in Total: {dim.weight}%</span>
                <span>{dim.issuesCount} issue{dim.issuesCount !== 1 ? 's' : ''} detected</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Discovered Issues List */}
      <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span>Discovered Quality Issues & Suggested Remediations</span>
          </h3>
          <span className="text-xs text-slate-400 font-medium">
            {qualityReport.issues.length} detected
          </span>
        </div>

        {qualityReport.issues.length === 0 ? (
          <div className="p-8 text-center text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2" />
            No quality issues detected. The dataset passes all heuristic evaluations!
          </div>
        ) : (
          <div className="space-y-3">
            {qualityReport.issues.map((issue, idx) => (
              <div
                key={issue.id}
                className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1 max-w-2xl">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                        issue.severity === 'critical' || issue.severity === 'high'
                          ? 'bg-rose-500/10 text-rose-600'
                          : issue.severity === 'medium'
                          ? 'bg-amber-500/10 text-amber-600'
                          : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {issue.severity}
                    </span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">[{issue.dimension}]</span>
                    {issue.column && (
                      <span className="text-brand-600 dark:text-brand-400 font-mono font-semibold">
                        Column: "{issue.column}"
                      </span>
                    )}
                  </div>
                  <p className="text-slate-600 dark:text-slate-300">{issue.description}</p>
                  {issue.suggestedFix && (
                    <p className="text-[11px] text-slate-500 italic">Recommendation: {issue.suggestedFix}</p>
                  )}
                </div>

                <div className="self-end sm:self-center">
                  <button
                    onClick={() => {
                      if (issue.fixAction) {
                        if (issue.fixAction.tool === 'duplicates' || issue.fixAction.tool === 'missing' || issue.fixAction.tool === 'text' || issue.fixAction.tool === 'types' || issue.fixAction.tool === 'dates' || issue.fixAction.tool === 'outliers' || issue.fixAction.tool === 'empty') {
                          setActiveTab('clean');
                        } else if (issue.fixAction.tool === 'validation') {
                          setActiveTab('validation');
                        }
                      }
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold flex items-center space-x-1.5 whitespace-nowrap shadow-sm transition-all"
                  >
                    <span>Fix in Studio</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
