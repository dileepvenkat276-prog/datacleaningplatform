import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  ActiveNavTab,
  AssistantMessage,
  ComparisonDiff,
  Dataset,
  HistoryEntry,
  QualityReport,
  Recipe,
  Row,
  ValidationError,
  ValidationRule
} from '../types/dataset';
import { buildColumnsMeta } from '../utils/dataStats';
import { calculateDatasetComparison } from '../utils/diffEngine';
import { evaluateDataQuality, QualityWeights, DEFAULT_QUALITY_WEIGHTS } from '../utils/qualityEngine';
import { generateSampleDataset } from '../utils/sampleData';
import { DEFAULT_RULES_TEMPLATES, runValidation } from '../utils/validationEngine';
import { removeExactDuplicates, fillMissingValues, cleanTextColumn, standardizeDates, removeEmptyRowsAndColumns } from '../utils/cleaningOps';
import { mathOperationTwoColumns } from '../utils/transformationOps';

export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  timestamp: number;
}

export interface DataContextType {
  dataset: Dataset | null;
  activeTab: ActiveNavTab;
  setActiveTab: (tab: ActiveNavTab) => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  // History & Undo / Redo
  history: HistoryEntry[];
  historyIndex: number;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  restoreSnapshot: (historyId: string) => void;
  clearHistory: () => void;
  // Modifications
  applyDatasetChange: (
    newHeaders: string[],
    newRows: Row[],
    operationName: string,
    category: HistoryEntry['category'],
    description: string,
    affectedRows?: number,
    affectedCells?: number
  ) => void;
  loadNewDataset: (name: string, filename: string, headers: string[], rows: Row[]) => void;
  loadSampleData: () => void;
  resetWorkspace: () => void;
  // Quality & Stats
  qualityReport: QualityReport | null;
  qualityWeights: QualityWeights;
  setQualityWeights: React.Dispatch<React.SetStateAction<QualityWeights>>;
  comparisonDiff: ComparisonDiff | null;
  // Validation
  validationRules: ValidationRule[];
  validationErrors: ValidationError[];
  setValidationRules: React.Dispatch<React.SetStateAction<ValidationRule[]>>;
  addValidationRule: (rule: Omit<ValidationRule, 'id'>) => void;
  toggleValidationRule: (ruleId: string) => void;
  deleteValidationRule: (ruleId: string) => void;
  // Recipes
  recipes: Recipe[];
  saveRecipe: (recipe: Omit<Recipe, 'id' | 'createdAt'>) => void;
  deleteRecipe: (recipeId: string) => void;
  // Assistant
  assistantMessages: AssistantMessage[];
  addAssistantMessage: (msg: Omit<AssistantMessage, 'id' | 'timestamp'>) => void;
  executeAssistantProposal: (proposal: AssistantMessage['actionProposal']) => void;
  // Notifications
  toasts: ToastNotification[];
  notify: (type: ToastNotification['type'], message: string) => void;
  dismissToast: (id: string) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [activeTab, setActiveTab] = useState<ActiveNavTab>('dashboard');
  const [dataset, setDataset] = useState<Dataset | null>(null);

  // History stack
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Quality & weights
  const [qualityWeights, setQualityWeights] = useState<QualityWeights>(DEFAULT_QUALITY_WEIGHTS);
  const [qualityReport, setQualityReport] = useState<QualityReport | null>(null);
  const [comparisonDiff, setComparisonDiff] = useState<ComparisonDiff | null>(null);

  // Validation rules
  const [validationRules, setValidationRules] = useState<ValidationRule[]>(
    DEFAULT_RULES_TEMPLATES.map((tmpl, idx) => ({
      ...tmpl,
      id: `rule-${idx + 1}`
    }))
  );
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

  // Recipes
  const [recipes, setRecipes] = useState<Recipe[]>([
    {
      id: 'recipe-customer-clean',
      name: 'Customer Data Cleaning',
      description: 'Deduplicates records, trims extra spaces, title cases names, formats dates, and removes blank records.',
      createdAt: new Date().toISOString(),
      steps: [
        { id: 's1', title: 'Remove Exact Duplicates', tool: 'duplicates', action: 'remove_exact', params: {} },
        { id: 's2', title: 'Trim Extra Spaces', tool: 'text', action: 'trim_spaces', params: { column: 'Full_Name' } },
        { id: 's3', title: 'Standardize Names to Title Case', tool: 'text', action: 'casing', params: { column: 'Full_Name', casing: 'title' } },
        { id: 's4', title: 'Standardize Date Formats (ISO)', tool: 'dates', action: 'standardize', params: { column: 'Join_Date', targetFormat: 'YYYY-MM-DD' } },
        { id: 's5', title: 'Remove Blank Rows', tool: 'empty', action: 'clean_empty', params: { removeEmptyRows: true, removeEmptyCols: false } }
      ]
    }
  ]);

  // AI Assistant Chat History
  const [assistantMessages, setAssistantMessages] = useState<AssistantMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'assistant',
      text: 'Hello! I am your Intelligent Data Cleaning Assistant. You can ask me to remove duplicates, fill missing values, standardize dates, title-case text, calculate columns, inspect outliers, or evaluate dataset quality. How can I help you today?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  // Toasts
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const notify = (type: ToastNotification['type'], message: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    setToasts(prev => [...prev, { id, type, message, timestamp: Date.now() }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Toggle Theme
  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    if (next === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Sync initial theme
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // Update Quality, Comparison, and Validation on dataset changes
  useEffect(() => {
    if (!dataset) {
      setQualityReport(null);
      setComparisonDiff(null);
      setValidationErrors([]);
      return;
    }

    const report = evaluateDataQuality(dataset.headers, dataset.rows, qualityWeights);
    setQualityReport(report);

    const comp = calculateDatasetComparison(
      dataset.originalHeaders,
      dataset.originalRows,
      dataset.headers,
      dataset.rows
    );
    setComparisonDiff(comp);

    const errors = runValidation(dataset.headers, dataset.rows, validationRules);
    setValidationErrors(errors);
  }, [dataset, qualityWeights, validationRules]);

  // Load new dataset
  const loadNewDataset = (name: string, filename: string, headers: string[], rows: Row[]) => {
    const columnsMeta = buildColumnsMeta(headers, rows);
    const newDataset: Dataset = {
      id: `ds-${Date.now()}`,
      name,
      filename,
      headers,
      columnsMeta,
      rows,
      originalRows: rows.map(r => ({ ...r })),
      originalHeaders: [...headers],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const initialHistoryEntry: HistoryEntry = {
      id: `hist-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      operationName: 'Initial Dataset Load',
      category: 'import',
      description: `Loaded dataset "${filename}" with ${rows.length} rows and ${headers.length} columns.`,
      affectedRows: rows.length,
      affectedCells: rows.length * headers.length,
      snapshotRows: rows.map(r => ({ ...r })),
      snapshotHeaders: [...headers]
    };

    setDataset(newDataset);
    setHistory([initialHistoryEntry]);
    setHistoryIndex(0);
    notify('success', `Dataset "${filename}" loaded successfully (${rows.length} records).`);
  };

  // Load Sample Data on launch
  const loadSampleData = () => {
    const sample = generateSampleDataset();
    loadNewDataset('Enterprise Customer Directory', 'sample_dirty_customers.csv', sample.headers, sample.rows);
  };

  // Initialize with sample data if empty
  useEffect(() => {
    if (!dataset) {
      loadSampleData();
    }
  }, []);

  // Apply Changes to Dataset and record History
  const applyDatasetChange = (
    newHeaders: string[],
    newRows: Row[],
    operationName: string,
    category: HistoryEntry['category'],
    description: string,
    affectedRows: number = 0,
    affectedCells: number = 0
  ) => {
    if (!dataset) return;

    const columnsMeta = buildColumnsMeta(newHeaders, newRows);
    const updatedDataset: Dataset = {
      ...dataset,
      headers: newHeaders,
      rows: newRows,
      columnsMeta,
      updatedAt: new Date().toISOString()
    };

    const newEntry: HistoryEntry = {
      id: `hist-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      operationName,
      category,
      description,
      affectedRows,
      affectedCells,
      snapshotRows: newRows.map(r => ({ ...r })),
      snapshotHeaders: [...newHeaders]
    };

    // Trim redo branch if user performed action from middle of history
    const truncatedHistory = history.slice(0, historyIndex + 1);
    const updatedHistory = [...truncatedHistory, newEntry];

    setDataset(updatedDataset);
    setHistory(updatedHistory);
    setHistoryIndex(updatedHistory.length - 1);
    notify('info', `${operationName}: ${description}`);
  };

  // Undo & Redo
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const undo = () => {
    if (!canUndo || !dataset) return;
    const targetIndex = historyIndex - 1;
    const targetEntry = history[targetIndex];

    const columnsMeta = buildColumnsMeta(targetEntry.snapshotHeaders, targetEntry.snapshotRows);
    setDataset({
      ...dataset,
      headers: [...targetEntry.snapshotHeaders],
      rows: targetEntry.snapshotRows.map(r => ({ ...r })),
      columnsMeta,
      updatedAt: new Date().toISOString()
    });
    setHistoryIndex(targetIndex);
    notify('warning', `Undone to: ${targetEntry.operationName}`);
  };

  const redo = () => {
    if (!canRedo || !dataset) return;
    const targetIndex = historyIndex + 1;
    const targetEntry = history[targetIndex];

    const columnsMeta = buildColumnsMeta(targetEntry.snapshotHeaders, targetEntry.snapshotRows);
    setDataset({
      ...dataset,
      headers: [...targetEntry.snapshotHeaders],
      rows: targetEntry.snapshotRows.map(r => ({ ...r })),
      columnsMeta,
      updatedAt: new Date().toISOString()
    });
    setHistoryIndex(targetIndex);
    notify('info', `Redone to: ${targetEntry.operationName}`);
  };

  const restoreSnapshot = (historyId: string) => {
    const idx = history.findIndex(h => h.id === historyId);
    if (idx === -1 || !dataset) return;
    const targetEntry = history[idx];

    const columnsMeta = buildColumnsMeta(targetEntry.snapshotHeaders, targetEntry.snapshotRows);
    setDataset({
      ...dataset,
      headers: [...targetEntry.snapshotHeaders],
      rows: targetEntry.snapshotRows.map(r => ({ ...r })),
      columnsMeta,
      updatedAt: new Date().toISOString()
    });
    setHistoryIndex(idx);
    notify('warning', `Restored dataset to state: ${targetEntry.operationName}`);
  };

  const clearHistory = () => {
    if (!dataset) return;
    const resetEntry: HistoryEntry = {
      id: `hist-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      operationName: 'Baseline Checkpoint',
      category: 'manual',
      description: 'History cleared by user; current data preserved as baseline.',
      affectedRows: dataset.rows.length,
      affectedCells: dataset.rows.length * dataset.headers.length,
      snapshotRows: dataset.rows.map(r => ({ ...r })),
      snapshotHeaders: [...dataset.headers]
    };
    setHistory([resetEntry]);
    setHistoryIndex(0);
    notify('info', 'Cleaning history log cleared.');
  };

  // Reset workspace
  const resetWorkspace = () => {
    setDataset(null);
    setHistory([]);
    setHistoryIndex(-1);
    setValidationErrors([]);
    setQualityReport(null);
    setComparisonDiff(null);
    notify('info', 'Workspace memory cleared.');
  };

  // Validation rules management
  const addValidationRule = (rule: Omit<ValidationRule, 'id'>) => {
    const newRule: ValidationRule = {
      ...rule,
      id: `rule-${Date.now()}`
    };
    setValidationRules(prev => [...prev, newRule]);
    notify('success', `Validation rule "${rule.name}" created.`);
  };

  const toggleValidationRule = (ruleId: string) => {
    setValidationRules(prev =>
      prev.map(r => (r.id === ruleId ? { ...r, enabled: !r.enabled } : r))
    );
  };

  const deleteValidationRule = (ruleId: string) => {
    setValidationRules(prev => prev.filter(r => r.id !== ruleId));
  };

  // Recipes
  const saveRecipe = (recipe: Omit<Recipe, 'id' | 'createdAt'>) => {
    const newRecipe: Recipe = {
      ...recipe,
      id: `recipe-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    setRecipes(prev => [...prev, newRecipe]);
    notify('success', `Recipe "${recipe.name}" saved successfully.`);
  };

  const deleteRecipe = (recipeId: string) => {
    setRecipes(prev => prev.filter(r => r.id !== recipeId));
    notify('info', 'Recipe deleted.');
  };

  // Assistant messages
  const addAssistantMessage = (msg: Omit<AssistantMessage, 'id' | 'timestamp'>) => {
    const newMsg: AssistantMessage = {
      ...msg,
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setAssistantMessages(prev => [...prev, newMsg]);
  };

  // Execute Assistant proposal
  const executeAssistantProposal = (proposal: AssistantMessage['actionProposal']) => {
    if (!proposal || !dataset) return;

    try {
      // Dynamic execution based on tool & action
      if (proposal.tool === 'duplicates' && proposal.action === 'remove_exact') {
        const res = removeExactDuplicates(dataset.headers, dataset.rows, 'first', proposal.params?.subsetCols);
        applyDatasetChange(
          dataset.headers,
          res.newRows,
          'AI Assistant: Remove Duplicates',
          'cleaning',
          `Eliminated ${res.removedCount} duplicate row(s).`,
          res.removedCount,
          res.removedCount * dataset.headers.length
        );
      } else if (proposal.tool === 'missing' && proposal.action === 'fill') {
        const res = fillMissingValues(proposal.params.column, dataset.rows, proposal.params.strategy, proposal.params.customValue);
        applyDatasetChange(
          dataset.headers,
          res.newRows,
          `AI Assistant: Impute Missing ${proposal.params.column}`,
          'cleaning',
          `Imputed ${res.filledCount} empty cell(s) with ${proposal.params.strategy}.`,
          res.filledCount,
          res.filledCount
        );
      } else if (proposal.tool === 'text' && proposal.action === 'casing') {
        const res = cleanTextColumn(proposal.params.column, dataset.rows, {
          casing: proposal.params.casing,
          trimExtraSpaces: proposal.params.trimExtraSpaces
        });
        applyDatasetChange(
          dataset.headers,
          res.newRows,
          `AI Assistant: Format ${proposal.params.column} Case`,
          'cleaning',
          `Standardized case for ${res.modifiedCount} cell(s) in "${proposal.params.column}".`,
          res.modifiedCount,
          res.modifiedCount
        );
      } else if (proposal.tool === 'dates' && proposal.action === 'standardize') {
        const res = standardizeDates(proposal.params.column, dataset.rows, proposal.params.targetFormat);
        applyDatasetChange(
          dataset.headers,
          res.newRows,
          `AI Assistant: Standardize Dates in ${proposal.params.column}`,
          'cleaning',
          `Standardized ${res.formattedCount} date(s) to ${proposal.params.targetFormat}.`,
          res.formattedCount,
          res.formattedCount
        );
      } else if (proposal.tool === 'empty' && proposal.action === 'clean_empty') {
        const res = removeEmptyRowsAndColumns(dataset.headers, dataset.rows, {
          removeEmptyRows: proposal.params.removeEmptyRows,
          removeEmptyCols: proposal.params.removeEmptyCols
        });
        applyDatasetChange(
          res.newHeaders,
          res.newRows,
          'AI Assistant: Remove Empty Records',
          'cleaning',
          `Removed ${res.removedRowsCount} blank row(s) and ${res.removedCols.length} blank column(s).`,
          res.removedRowsCount,
          res.removedRowsCount * dataset.headers.length
        );
      } else if (proposal.tool === 'transform' && proposal.action === 'math_add') {
        const res = mathOperationTwoColumns(
          proposal.params.colA,
          proposal.params.colB,
          proposal.params.operator,
          proposal.params.targetCol,
          dataset.headers,
          dataset.rows
        );
        applyDatasetChange(
          res.newHeaders,
          res.newRows,
          `AI Assistant: Calculated Column ${proposal.params.targetCol}`,
          'transformation',
          `Created column "${proposal.params.targetCol}" = [${proposal.params.colA}] + [${proposal.params.colB}].`,
          dataset.rows.length,
          dataset.rows.length
        );
      } else if (proposal.tool === 'quality') {
        setActiveTab('analysis');
        notify('info', 'Navigated to Quality & Analysis dashboard.');
      } else if (proposal.tool === 'outliers') {
        setActiveTab('clean');
        notify('info', `Navigated to Outlier Detection for column "${proposal.params.column}".`);
      } else if (proposal.tool === 'validation') {
        setActiveTab('validation');
        notify('info', 'Navigated to Data Validation center.');
      }

      addAssistantMessage({
        sender: 'system',
        text: `Operation "${proposal.actionName}" executed successfully!`
      });
    } catch (err: any) {
      notify('error', `Execution failed: ${err.message || 'Unknown error'}`);
    }
  };

  return (
    <DataContext.Provider
      value={{
        dataset,
        activeTab,
        setActiveTab,
        theme,
        toggleTheme,
        history,
        historyIndex,
        canUndo,
        canRedo,
        undo,
        redo,
        restoreSnapshot,
        clearHistory,
        applyDatasetChange,
        loadNewDataset,
        loadSampleData,
        resetWorkspace,
        qualityReport,
        qualityWeights,
        setQualityWeights,
        comparisonDiff,
        validationRules,
        validationErrors,
        setValidationRules,
        addValidationRule,
        toggleValidationRule,
        deleteValidationRule,
        recipes,
        saveRecipe,
        deleteRecipe,
        assistantMessages,
        addAssistantMessage,
        executeAssistantProposal,
        toasts,
        notify,
        dismissToast
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
