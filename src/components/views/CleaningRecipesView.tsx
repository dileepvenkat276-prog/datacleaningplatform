import React, { useState } from 'react';
import {
  ScrollText,
  Play,
  Plus,
  Trash2,
  Copy,
  Download,
  Upload,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  Eye
} from 'lucide-react';
import { Recipe, RecipeStep } from '../../types/dataset';
import { useData } from '../../context/DataContext';
import {
  cleanTextColumn,
  fillMissingValues,
  removeEmptyRowsAndColumns,
  removeExactDuplicates,
  standardizeDates
} from '../../utils/cleaningOps';
import { downloadBlob } from '../../utils/fileHandler';

export const CleaningRecipesView: React.FC = () => {
  const { dataset, recipes, saveRecipe, deleteRecipe, applyDatasetChange, notify, setActiveTab } = useData();

  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(recipes[0] || null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  // New Recipe Form
  const [newRecipeName, setNewRecipeName] = useState('');
  const [newRecipeDesc, setNewRecipeDesc] = useState('');

  const headers = dataset?.headers || [];
  const rows = dataset?.rows || [];

  const handleRunRecipe = async (recipe: Recipe) => {
    if (!dataset) return;
    setIsRunning(true);

    let currentHeaders = [...headers];
    let currentRows = [...rows];
    let stepCount = 0;

    try {
      for (const step of recipe.steps) {
        stepCount++;
        if (step.tool === 'duplicates' && step.action === 'remove_exact') {
          const res = removeExactDuplicates(currentHeaders, currentRows, 'first');
          currentRows = res.newRows;
        } else if (step.tool === 'text' && step.action === 'trim_spaces') {
          const col = currentHeaders.includes(step.params.column) ? step.params.column : currentHeaders[0];
          const res = cleanTextColumn(col, currentRows, { trimExtraSpaces: true });
          currentRows = res.newRows;
        } else if (step.tool === 'text' && step.action === 'casing') {
          const col = currentHeaders.includes(step.params.column) ? step.params.column : currentHeaders[0];
          const res = cleanTextColumn(col, currentRows, { casing: step.params.casing || 'title', trimExtraSpaces: true });
          currentRows = res.newRows;
        } else if (step.tool === 'dates' && step.action === 'standardize') {
          const col = currentHeaders.includes(step.params.column)
            ? step.params.column
            : currentHeaders.find(h => h.toLowerCase().includes('date')) || currentHeaders[0];
          const res = standardizeDates(col, currentRows, step.params.targetFormat || 'YYYY-MM-DD');
          currentRows = res.newRows;
        } else if (step.tool === 'empty' && step.action === 'clean_empty') {
          const res = removeEmptyRowsAndColumns(currentHeaders, currentRows, {
            removeEmptyRows: true,
            removeEmptyCols: false
          });
          currentHeaders = res.newHeaders;
          currentRows = res.newRows;
        }
      }

      applyDatasetChange(
        currentHeaders,
        currentRows,
        `Executed Recipe: ${recipe.name}`,
        'cleaning',
        `Completed all ${recipe.steps.length} automated pipeline steps.`,
        currentRows.length,
        currentRows.length * currentHeaders.length
      );

      notify('success', `Recipe "${recipe.name}" applied successfully (${recipe.steps.length} steps).`);
    } catch (err: any) {
      notify('error', `Recipe run error: ${err.message || 'Unknown error'}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleExportRecipe = (recipe: Recipe) => {
    downloadBlob(JSON.stringify(recipe, null, 2), `${recipe.name.replace(/\s+/g, '_')}_recipe.json`, 'application/json');
  };

  const handleImportRecipe = (file: File) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        if (parsed.name && Array.isArray(parsed.steps)) {
          saveRecipe({
            name: parsed.name,
            description: parsed.description || 'Imported automation recipe',
            steps: parsed.steps
          });
        }
      } catch (err) {
        notify('error', 'Invalid recipe JSON file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <ScrollText className="w-6 h-6 text-brand-600 dark:text-brand-400" />
            <span>Cleaning Recipes & Automation Pipeline</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Save, configure, and re-run multi-step cleaning sequences across datasets without repetitive manual steps.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <label className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold flex items-center space-x-1.5 cursor-pointer transition-colors">
            <Upload className="w-3.5 h-3.5" />
            <span>Import Recipe</span>
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={e => {
                if (e.target.files && e.target.files[0]) {
                  handleImportRecipe(e.target.files[0]);
                }
              }}
            />
          </label>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-500/20 flex items-center space-x-1.5 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Custom Recipe</span>
          </button>
        </div>
      </div>

      {/* Recipes Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Recipes List */}
        <div className="space-y-3">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
            Saved Recipes ({recipes.length})
          </span>

          <div className="space-y-2">
            {recipes.map(rec => {
              const isSelected = selectedRecipe?.id === rec.id;
              return (
                <div
                  key={rec.id}
                  onClick={() => setSelectedRecipe(rec)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/20 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{rec.name}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {rec.steps.length} steps
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{rec.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Recipe Inspection & Runner */}
        <div className="md:col-span-2 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-6">
          {selectedRecipe ? (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="space-y-1">
                  <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100">{selectedRecipe.name}</h3>
                  <p className="text-xs text-slate-500">{selectedRecipe.description}</p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleExportRecipe(selectedRecipe)}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs"
                    title="Export recipe JSON"
                  >
                    <Download className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleRunRecipe(selectedRecipe)}
                    disabled={isRunning || !dataset}
                    className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-brand-500/20 flex items-center space-x-2 transition-all"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>{isRunning ? 'Running Pipeline...' : 'Run Pipeline on Dataset'}</span>
                  </button>
                </div>
              </div>

              {/* Steps Sequence Timeline */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Sequence Execution Steps ({selectedRecipe.steps.length})
                </span>

                <div className="space-y-2">
                  {selectedRecipe.steps.map((st, idx) => (
                    <div
                      key={st.id}
                      className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-6 h-6 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 font-bold font-mono text-[11px] flex items-center justify-center">
                          {idx + 1}
                        </div>
                        <div>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{st.title}</span>
                          <span className="text-[11px] text-slate-400 font-mono ml-2">
                            Tool: {st.tool} • Action: {st.action}
                          </span>
                        </div>
                      </div>

                      <span className="text-[11px] text-slate-400">
                        {st.params.column ? `Target: ${st.params.column}` : 'Dataset-wide'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-slate-500">Select a recipe to view details.</div>
          )}
        </div>
      </div>
    </div>
  );
};
