import React, { useState } from 'react';
import {
  ShieldAlert,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Download,
  Filter,
  Wand2,
  HelpCircle,
  Check
} from 'lucide-react';
import { ValidationRule, ValidationRuleType } from '../../types/dataset';
import { useData } from '../../context/DataContext';
import { exportValidationErrorReport } from '../../utils/fileHandler';
import { DataGrid } from '../common/DataGrid';

export const ValidationRulesView: React.FC = () => {
  const {
    dataset,
    validationRules,
    validationErrors,
    addValidationRule,
    toggleValidationRule,
    deleteValidationRule,
    applyDatasetChange,
    notify
  } = useData();

  const [activeTab, setActiveTab] = useState<'errors' | 'rules'>('errors');
  const [showAddModal, setShowAddModal] = useState(false);

  // New Rule Form State
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleCol, setNewRuleCol] = useState(dataset?.headers[0] || '');
  const [newRuleType, setNewRuleType] = useState<ValidationRuleType>('email');
  const [newRuleMin, setNewRuleMin] = useState<number>(18);
  const [newRuleMax, setNewRuleMax] = useState<number>(65);
  const [newRuleDigits, setNewRuleDigits] = useState<number>(10);
  const [newRuleAllowed, setNewRuleAllowed] = useState('Engineering, Finance, Marketing, Operations');
  const [newRuleMsg, setNewRuleMsg] = useState('Value violates validation constraints');

  const headers = dataset?.headers || [];
  const rows = dataset?.rows || [];

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleName.trim() || !newRuleCol) return;

    addValidationRule({
      name: newRuleName,
      column: newRuleCol,
      type: newRuleType,
      params: {
        min: newRuleMin,
        max: newRuleMax,
        requiredDigits: newRuleDigits,
        allowedValues: newRuleType === 'allowed_list' ? newRuleAllowed.split(',').map(s => s.trim()) : undefined
      },
      severity: 'error',
      errorMessage: newRuleMsg,
      enabled: true
    });

    setShowAddModal(false);
    setNewRuleName('');
  };

  // Apply single fix
  const handleApplyFix = (rowId: string, column: string, suggestedFix: any) => {
    if (!dataset || suggestedFix === undefined) return;

    const updatedRows = dataset.rows.map(r => {
      if (r._id === rowId) {
        return { ...r, [column]: suggestedFix };
      }
      return r;
    });

    applyDatasetChange(
      dataset.headers,
      updatedRows,
      `Validation Fix: ${column}`,
      'validation',
      `Applied fix on row to "${suggestedFix}".`,
      1,
      1
    );
  };

  // Batch apply all available suggested fixes
  const handleBatchFix = () => {
    if (!dataset) return;
    const fixableErrors = validationErrors.filter(e => e.suggestedFix !== undefined);
    if (fixableErrors.length === 0) {
      notify('info', 'No automatic suggested fixes available for current errors.');
      return;
    }

    const fixesMap = new Map<string, Record<string, any>>();
    fixableErrors.forEach(err => {
      const existing = fixesMap.get(err.rowId) || {};
      existing[err.column] = err.suggestedFix;
      fixesMap.set(err.rowId, existing);
    });

    const updatedRows = dataset.rows.map(r => {
      const fixes = fixesMap.get(r._id);
      if (fixes) {
        return { ...r, ...fixes };
      }
      return r;
    });

    applyDatasetChange(
      dataset.headers,
      updatedRows,
      'Batch Fix Validation Errors',
      'validation',
      `Auto-resolved ${fixableErrors.length} validation errors using suggested values.`,
      fixesMap.size,
      fixableErrors.length
    );
  };

  if (!dataset) {
    return <div className="p-8 text-center text-slate-500">Please load a dataset first.</div>;
  }

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-rose-500" />
            <span>Data Validation & Error Detection</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Define domain integrity constraints, audit non-conforming cells, and repair violations with automated suggestions.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => exportValidationErrorReport(validationErrors, `${dataset.name}_validation_errors.csv`)}
            disabled={validationErrors.length === 0}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 text-xs font-semibold flex items-center space-x-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Errors ({validationErrors.length})</span>
          </button>

          <button
            onClick={handleBatchFix}
            disabled={validationErrors.length === 0}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition-all flex items-center space-x-1.5"
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>Apply All Suggested Fixes</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('errors')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'errors'
                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Violations & Error Feed ({validationErrors.length})
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'rules'
                ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Configured Rules ({validationRules.length})
          </button>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold flex items-center space-x-1"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Validation Rule</span>
        </button>
      </div>

      {/* 1. ERRORS FEED */}
      {activeTab === 'errors' && (
        <div className="space-y-4 animate-in fade-in-50 duration-200">
          {validationErrors.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-dashed border-emerald-500/30 bg-emerald-500/5 space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Zero Validation Errors Detected!</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                All records conform to your enabled validation rules (email schemas, number ranges, required fields).
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-2.5 px-3">Row #</th>
                      <th className="py-2.5 px-3">Column</th>
                      <th className="py-2.5 px-3">Problematic Value</th>
                      <th className="py-2.5 px-3">Error Constraint</th>
                      <th className="py-2.5 px-3">Suggested Repair</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {validationErrors.map(err => (
                      <tr key={err.id} className="hover:bg-rose-500/5 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                          Row {err.rowIndex + 1}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-200">{err.column}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded bg-rose-500/15 text-rose-700 dark:text-rose-300 font-mono text-xs">
                            {err.value === null || err.value === undefined || String(err.value).trim() === '' ? (
                              <em className="opacity-70">(empty null)</em>
                            ) : (
                              String(err.value)
                            )}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">{err.message}</td>
                        <td className="py-2.5 px-3">
                          {err.suggestedFix !== undefined ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-mono font-semibold">
                              "{String(err.suggestedFix)}"
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Manual review required</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {err.suggestedFix !== undefined && (
                            <button
                              onClick={() => handleApplyFix(err.rowId, err.column, err.suggestedFix)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold flex items-center space-x-1 ml-auto"
                            >
                              <Check className="w-3 h-3" />
                              <span>Fix</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Embedded Data Grid showing only invalid records */}
          <div className="pt-4 space-y-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Interactive Grid Highlighting Invalid Cells:
            </span>
            <div className="h-96">
              <DataGrid highlightErrors={true} showOnlyInvalid={false} maxHeight="h-full" />
            </div>
          </div>
        </div>
      )}

      {/* 2. RULES CONFIGURATION */}
      {activeTab === 'rules' && (
        <div className="space-y-3 animate-in fade-in-50 duration-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {validationRules.map(rule => (
              <div
                key={rule.id}
                className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex items-start justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{rule.name}</span>
                    <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-600 dark:text-brand-400">
                      {rule.type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Applies to column: <strong className="text-slate-700 dark:text-slate-300">"{rule.column}"</strong>
                  </p>
                  <p className="text-[11px] text-slate-400 italic">Error message: "{rule.errorMessage}"</p>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={rule.enabled}
                    onChange={() => toggleValidationRule(rule.id)}
                    className="rounded text-brand-600"
                    title="Enable/disable rule"
                  />
                  <button
                    onClick={() => deleteValidationRule(rule.id)}
                    className="p-1 rounded text-slate-400 hover:text-rose-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Rule Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100">Add Validation Rule</h3>

            <form onSubmit={handleCreateRule} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Rule Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Valid Customer Email"
                  value={newRuleName}
                  onChange={e => setNewRuleName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Target Column</label>
                <select
                  value={newRuleCol}
                  onChange={e => setNewRuleCol(e.target.value)}
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
                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Constraint Type</label>
                <select
                  value={newRuleType}
                  onChange={e => setNewRuleType(e.target.value as ValidationRuleType)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
                >
                  <option value="email">RFC Compliant Email Address</option>
                  <option value="phone">Phone Number Minimum Digits</option>
                  <option value="numeric_range">Numerical Range (Min to Max)</option>
                  <option value="positive_number">Positive Number (&gt; 0)</option>
                  <option value="not_empty">Required Field (Cannot Be Blank)</option>
                  <option value="allowed_list">Allowed List of Values</option>
                  <option value="date_format">Valid Date Format</option>
                </select>
              </div>

              {newRuleType === 'numeric_range' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Min Value</label>
                    <input
                      type="number"
                      value={newRuleMin}
                      onChange={e => setNewRuleMin(Number(e.target.value))}
                      className="w-full px-2 py-1 rounded border border-slate-200 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Max Value</label>
                    <input
                      type="number"
                      value={newRuleMax}
                      onChange={e => setNewRuleMax(Number(e.target.value))}
                      className="w-full px-2 py-1 rounded border border-slate-200 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800"
                    />
                  </div>
                </div>
              )}

              {newRuleType === 'allowed_list' && (
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Allowed Values (Comma-separated)</label>
                  <input
                    type="text"
                    value={newRuleAllowed}
                    onChange={e => setNewRuleAllowed(e.target.value)}
                    className="w-full px-3 py-1 rounded border border-slate-200 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              )}

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Validation Error Message</label>
                <input
                  type="text"
                  value={newRuleMsg}
                  onChange={e => setNewRuleMsg(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-500/20"
                >
                  Create Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
