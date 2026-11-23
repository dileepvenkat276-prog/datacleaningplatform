import React, { useState } from 'react';
import {
  Workflow,
  Plus,
  Edit3,
  Filter,
  ArrowUpDown,
  Calculator,
  Code2,
  DollarSign,
  Tags,
  Check,
  Eye,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import {
  conditionalReplace,
  convertCurrency,
  evaluateCustomFormula,
  extractTextAroundSeparator,
  filterRows,
  FilterCondition,
  FilterOperator,
  groupAndAggregate,
  mathOperationTwoColumns,
  removePrefixSuffix,
  renameColumn,
  roundNumericalValues,
  sortDataset,
  standardizeCategories
} from '../../utils/transformationOps';

type TransformTab =
  | 'rename'
  | 'filter_sort'
  | 'math_formula'
  | 'conditional'
  | 'text_extract'
  | 'categories'
  | 'currency_round';

export const TransformationStudioView: React.FC = () => {
  const { dataset, applyDatasetChange, notify } = useData();
  const [activeTab, setActiveTab] = useState<TransformTab>('math_formula');

  const headers = dataset?.headers || [];
  const rows = dataset?.rows || [];

  // 1. Rename Column State
  const [renameTarget, setRenameTarget] = useState(headers[0] || '');
  const [newColName, setNewColName] = useState('');

  // 2. Filter & Sort State
  const [filterCol, setFilterCol] = useState(headers[0] || '');
  const [filterOp, setFilterOp] = useState<FilterOperator>('contains');
  const [filterVal, setFilterVal] = useState('');
  const [sortCol, setSortCol] = useState(headers[0] || '');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Group By State
  const [grpCol, setGrpCol] = useState(headers[0] || '');
  const [aggCol, setAggCol] = useState(headers[1] || headers[0] || '');
  const [aggFunc, setAggFunc] = useState<'count' | 'sum' | 'avg' | 'min' | 'max'>('count');
  const [groupedResults, setGroupedResults] = useState<{ group: string; count: number; value: number }[] | null>(null);

  // 3. Math & Custom Formulas State
  const [mathColA, setMathColA] = useState(headers[0] || '');
  const [mathColB, setMathColB] = useState(headers[1] || headers[0] || '');
  const [mathOp, setMathOp] = useState<'+' | '-' | '*' | '/' | '%' | '^'>('+');
  const [mathTargetName, setMathTargetName] = useState('Calculated_Result');

  // Custom formula
  const [customFormula, setCustomFormula] = useState('[Age] * 12');
  const [formulaTargetCol, setFormulaTargetCol] = useState('Months_Alive');
  const [formulaPreview, setFormulaPreview] = useState<{ original: any; calculated: any }[] | null>(null);

  // 4. Conditional Replacement State
  const [condCol, setCondCol] = useState(headers[0] || '');
  const [condOp, setCondOp] = useState<FilterOperator>('equals');
  const [condVal, setCondVal] = useState('');
  const [condNewVal, setCondNewVal] = useState('');
  const [condElseVal, setCondElseVal] = useState('');
  const [useElseBranch, setUseElseBranch] = useState(false);

  // 5. Text Extraction & Prefix/Suffix
  const [extractCol, setExtractCol] = useState(headers[0] || '');
  const [extractSep, setExtractSep] = useState('@');
  const [extractPos, setExtractPos] = useState<'before' | 'after'>('before');
  const [extractTargetCol, setExtractTargetCol] = useState('Extracted_Text');
  const [trimPrefix, setTrimPrefix] = useState('');
  const [trimSuffix, setTrimSuffix] = useState('');

  // 6. Category Standardization
  const [catCol, setCatCol] = useState(headers[0] || '');
  const [catSource, setCatSource] = useState('');
  const [catTarget, setCatTarget] = useState('');

  // 7. Currency & Rounding
  const [currCol, setCurrCol] = useState(headers[0] || '');
  const [currRate, setCurrRate] = useState<number>(1.12);
  const [currSymbol, setCurrSymbol] = useState('$');
  const [roundCol, setRoundCol] = useState(headers[0] || '');
  const [roundDecimals, setRoundDecimals] = useState<number>(2);
  const [roundMode, setRoundMode] = useState<'round' | 'floor' | 'ceil'>('round');

  if (!dataset) {
    return <div className="p-8 text-center text-slate-500">Please load a dataset first.</div>;
  }

  // Handle operations
  const handleRename = () => {
    if (!renameTarget || !newColName.trim()) return;
    const res = renameColumn(headers, rows, renameTarget, newColName);
    applyDatasetChange(
      res.newHeaders,
      res.newRows,
      `Rename Column "${renameTarget}" to "${newColName}"`,
      'transformation',
      `Renamed attribute column "${renameTarget}" -> "${newColName}".`,
      rows.length,
      rows.length
    );
    setNewColName('');
  };

  const handleApplyFilter = () => {
    if (!filterCol) return;
    const filtered = filterRows(rows, [{ column: filterCol, operator: filterOp, value: filterVal }]);
    const droppedCount = rows.length - filtered.length;
    applyDatasetChange(
      headers,
      filtered,
      `Filter Rows (${filterCol} ${filterOp} "${filterVal}")`,
      'transformation',
      `Filtered dataset. Retained ${filtered.length} rows (${droppedCount} dropped).`,
      droppedCount,
      droppedCount * headers.length
    );
  };

  const handleApplySort = () => {
    if (!sortCol) return;
    const sorted = sortDataset(rows, sortCol, sortDir);
    applyDatasetChange(
      headers,
      sorted,
      `Sort by ${sortCol} (${sortDir.toUpperCase()})`,
      'transformation',
      `Sorted dataset rows by "${sortCol}" in ${sortDir === 'asc' ? 'ascending' : 'descending'} order.`,
      rows.length,
      0
    );
  };

  const handleRunGroupBy = () => {
    if (!grpCol || !aggCol) return;
    const res = groupAndAggregate(rows, grpCol, aggCol, aggFunc);
    setGroupedResults(res);
  };

  const handleApplyMathTwoColumns = () => {
    if (!mathColA || !mathColB || !mathTargetName.trim()) return;
    const res = mathOperationTwoColumns(mathColA, mathColB, mathOp, mathTargetName, headers, rows);
    applyDatasetChange(
      res.newHeaders,
      res.newRows,
      `Math Calculation: ${mathTargetName}`,
      'transformation',
      `Created column "${mathTargetName}" = [${mathColA}] ${mathOp} [${mathColB}].`,
      rows.length,
      rows.length
    );
  };

  const handlePreviewFormula = () => {
    if (!customFormula.trim() || !formulaTargetCol.trim()) return;
    const res = evaluateCustomFormula(customFormula, formulaTargetCol, headers, rows);
    setFormulaPreview(res.preview);
  };

  const handleApplyFormula = () => {
    if (!customFormula.trim() || !formulaTargetCol.trim()) return;
    const res = evaluateCustomFormula(customFormula, formulaTargetCol, headers, rows);
    applyDatasetChange(
      res.newHeaders,
      res.newRows,
      `Custom Formula: ${formulaTargetCol}`,
      'transformation',
      `Evaluated formula "${customFormula}" into column "${formulaTargetCol}".`,
      rows.length,
      rows.length
    );
  };

  const handleApplyConditionalReplace = () => {
    if (!condCol) return;
    const res = conditionalReplace(
      condCol,
      rows,
      { operator: condOp, conditionValue: condVal },
      condNewVal,
      condElseVal,
      useElseBranch
    );
    applyDatasetChange(
      headers,
      res.newRows,
      `Conditional Replace in ${condCol}`,
      'transformation',
      `Replaced ${res.modifiedCount} cells where condition matched.`,
      res.modifiedCount,
      res.modifiedCount
    );
  };

  const handleExtractText = () => {
    if (!extractCol || !extractTargetCol.trim()) return;
    const res = extractTextAroundSeparator(extractCol, extractTargetCol, headers, rows, extractSep, extractPos);
    applyDatasetChange(
      res.newHeaders,
      res.newRows,
      `Extract Text: ${extractTargetCol}`,
      'transformation',
      `Extracted text ${extractPos} "${extractSep}" from "${extractCol}" into "${extractTargetCol}".`,
      rows.length,
      rows.length
    );
  };

  const handleTrimPrefixSuffix = () => {
    if (!extractCol || (!trimPrefix && !trimSuffix)) return;
    const res = removePrefixSuffix(extractCol, rows, trimPrefix, trimSuffix);
    applyDatasetChange(
      headers,
      res.newRows,
      `Trim Prefix/Suffix: ${extractCol}`,
      'transformation',
      `Trimmed prefix "${trimPrefix}" and suffix "${trimSuffix}" across ${res.modifiedCount} cells.`,
      res.modifiedCount,
      res.modifiedCount
    );
  };

  const handleStandardizeCat = () => {
    if (!catCol || !catSource.trim() || !catTarget.trim()) return;
    const res = standardizeCategories(catCol, rows, { [catSource.toLowerCase().trim()]: catTarget.trim() });
    applyDatasetChange(
      headers,
      res.newRows,
      `Standardize Category in ${catCol}`,
      'transformation',
      `Mapped "${catSource}" -> "${catTarget}" (${res.modifiedCount} cells).`,
      res.modifiedCount,
      res.modifiedCount
    );
    setCatSource('');
    setCatTarget('');
  };

  const handleConvertCurrency = () => {
    if (!currCol || isNaN(currRate)) return;
    const res = convertCurrency(currCol, rows, currRate, currSymbol);
    applyDatasetChange(
      headers,
      res.newRows,
      `Convert Currency: ${currCol}`,
      'transformation',
      `Converted currency in "${currCol}" at rate ${currRate} (symbol: ${currSymbol}).`,
      res.modifiedCount,
      res.modifiedCount
    );
  };

  const handleRoundNumbers = () => {
    if (!roundCol) return;
    const res = roundNumericalValues(roundCol, rows, roundDecimals, roundMode);
    applyDatasetChange(
      headers,
      res.newRows,
      `Round Numbers: ${roundCol}`,
      'transformation',
      `Rounded values in "${roundCol}" to ${roundDecimals} decimal places (${roundMode}).`,
      res.modifiedCount,
      res.modifiedCount
    );
  };

  const tabs = [
    { id: 'math_formula', label: 'Formulas & Math', icon: Calculator },
    { id: 'rename', label: 'Column Renaming', icon: Edit3 },
    { id: 'filter_sort', label: 'Filter, Sort & Group', icon: Filter },
    { id: 'conditional', label: 'Conditional Replace', icon: Code2 },
    { id: 'text_extract', label: 'Extract & Trim', icon: Sparkles },
    { id: 'categories', label: 'Standardize Categories', icon: Tags },
    { id: 'currency_round', label: 'Currency & Rounding', icon: DollarSign }
  ];

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
          <Workflow className="w-6 h-6 text-brand-600 dark:text-brand-400" />
          <span>Advanced Data Transformation Studio</span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Transform, calculate, filter, and structure dataset columns with instant execution and preview.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TransformTab)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center space-x-2 transition-all ${
                isActive
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 1. MATH & CUSTOM FORMULA ENGINE */}
      {activeTab === 'math_formula' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in-50 duration-200">
          {/* Two-Column Math Operation */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
              <Calculator className="w-4 h-4 text-brand-500" />
              <span>Column-to-Column Arithmetic</span>
            </h3>

            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Column A</label>
                  <select
                    value={mathColA}
                    onChange={e => setMathColA(e.target.value)}
                    className="w-full px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
                  >
                    {headers.map(h => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Operator</label>
                  <select
                    value={mathOp}
                    onChange={e => setMathOp(e.target.value as any)}
                    className="w-full px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-center"
                  >
                    <option value="+">+ Add</option>
                    <option value="-">- Subtract</option>
                    <option value="*">× Multiply</option>
                    <option value="/">÷ Divide</option>
                    <option value="%">% Modulo</option>
                    <option value="^">^ Power</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Column B</label>
                  <select
                    value={mathColB}
                    onChange={e => setMathColB(e.target.value)}
                    className="w-full px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
                  >
                    {headers.map(h => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                  Target Calculated Column Name
                </label>
                <input
                  type="text"
                  value={mathTargetName}
                  onChange={e => setMathTargetName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
                />
              </div>

              <button
                onClick={handleApplyMathTwoColumns}
                className="w-full py-2 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-500/20 transition-all"
              >
                Execute Arithmetic Operation
              </button>
            </div>
          </div>

          {/* Custom Formula Builder */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
              <Code2 className="w-4 h-4 text-indigo-500" />
              <span>Custom Math Formula Evaluator</span>
            </h3>

            <p className="text-xs text-slate-500">
              Reference existing columns with brackets e.g.{' '}
              <code className="text-brand-600 dark:text-brand-400 font-mono">[Annual_Salary] / 12</code> or{' '}
              <code className="text-brand-600 dark:text-brand-400 font-mono">[Age] + 10</code>.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Formula</label>
                <input
                  type="text"
                  value={customFormula}
                  onChange={e => setCustomFormula(e.target.value)}
                  placeholder="e.g. [Annual_Salary] * 0.15"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">New Column Name</label>
                <input
                  type="text"
                  value={formulaTargetCol}
                  onChange={e => setFormulaTargetCol(e.target.value)}
                  placeholder="e.g. Tax_Amount"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
                />
              </div>

              {/* Preview Rows if tested */}
              {formulaPreview && (
                <div className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-xs space-y-1">
                  <span className="font-bold text-slate-700 dark:text-slate-300 block">Preview Sample:</span>
                  {formulaPreview.slice(0, 3).map((p, idx) => (
                    <div key={idx} className="flex justify-between text-[11px] font-mono text-slate-600 dark:text-slate-400">
                      <span>Row #{idx + 1}:</span>
                      <strong className="text-brand-600 dark:text-brand-400">{p.calculated}</strong>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center space-x-2">
                <button
                  onClick={handlePreviewFormula}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold flex items-center space-x-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview</span>
                </button>
                <button
                  onClick={handleApplyFormula}
                  className="flex-1 py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all"
                >
                  Apply Formula to Column
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. COLUMN RENAMING */}
      {activeTab === 'rename' && (
        <div className="max-w-xl mx-auto p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4 animate-in fade-in-50 duration-200">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
            <Edit3 className="w-4 h-4 text-brand-500" />
            <span>Rename Column Header</span>
          </h3>

          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Select Current Column</label>
              <select
                value={renameTarget}
                onChange={e => setRenameTarget(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
              >
                {headers.map(h => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">New Header Name</label>
              <input
                type="text"
                value={newColName}
                onChange={e => setNewColName(e.target.value)}
                placeholder="e.g. Customer_Email_Primary"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
              />
            </div>

            <button
              onClick={handleRename}
              disabled={!newColName.trim()}
              className="w-full py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-xs font-bold transition-all"
            >
              Update Header Name
            </button>
          </div>
        </div>
      )}

      {/* 3. FILTER, SORT & GROUP BY */}
      {activeTab === 'filter_sort' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 animate-in fade-in-50 duration-200">
          {/* Row Filter */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
              <Filter className="w-4 h-4 text-brand-500" />
              <span>Row Filtering</span>
            </h3>

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Column</label>
              <select
                value={filterCol}
                onChange={e => setFilterCol(e.target.value)}
                className="w-full px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
              >
                {headers.map(h => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Condition</label>
              <select
                value={filterOp}
                onChange={e => setFilterOp(e.target.value as any)}
                className="w-full px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
              >
                <option value="contains">Contains</option>
                <option value="equals">Equals</option>
                <option value="not_equals">Does Not Equal</option>
                <option value="starts_with">Starts With</option>
                <option value="ends_with">Ends With</option>
                <option value="greater_than">&gt; Greater Than</option>
                <option value="less_than">&lt; Less Than</option>
                <option value="is_empty">Is Empty</option>
                <option value="is_not_empty">Is Not Empty</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Filter Value</label>
              <input
                type="text"
                value={filterVal}
                onChange={e => setFilterVal(e.target.value)}
                placeholder="Value..."
                className="w-full px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
              />
            </div>

            <button
              onClick={handleApplyFilter}
              className="w-full py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition-all"
            >
              Filter Rows
            </button>
          </div>

          {/* Dataset Sorting */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
              <ArrowUpDown className="w-4 h-4 text-emerald-500" />
              <span>Multi-Type Sort</span>
            </h3>

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Sort Column</label>
              <select
                value={sortCol}
                onChange={e => setSortCol(e.target.value)}
                className="w-full px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
              >
                {headers.map(h => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Direction</label>
              <select
                value={sortDir}
                onChange={e => setSortDir(e.target.value as any)}
                className="w-full px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
              >
                <option value="asc">Ascending (A-Z, 0-9)</option>
                <option value="desc">Descending (Z-A, 9-0)</option>
              </select>
            </div>

            <button
              onClick={handleApplySort}
              className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all mt-6"
            >
              Sort Dataset Rows
            </button>
          </div>

          {/* Group By Aggregation */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <span>Group & Aggregate</span>
            </h3>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Group By</label>
                <select
                  value={grpCol}
                  onChange={e => setGrpCol(e.target.value)}
                  className="w-full px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                >
                  {headers.map(h => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Measure Col</label>
                <select
                  value={aggCol}
                  onChange={e => setAggCol(e.target.value)}
                  className="w-full px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                >
                  {headers.map(h => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Aggregation Function</label>
              <select
                value={aggFunc}
                onChange={e => setAggFunc(e.target.value as any)}
                className="w-full px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
              >
                <option value="count">Count Records</option>
                <option value="sum">Sum</option>
                <option value="avg">Average / Mean</option>
                <option value="min">Minimum</option>
                <option value="max">Maximum</option>
              </select>
            </div>

            <button
              onClick={handleRunGroupBy}
              className="w-full py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
            >
              Compute Aggregations
            </button>

            {groupedResults && (
              <div className="max-h-32 overflow-y-auto space-y-1 pt-1 text-xs font-mono">
                {groupedResults.slice(0, 5).map(g => (
                  <div key={g.group} className="flex justify-between p-1 bg-slate-50 dark:bg-slate-800/40 rounded">
                    <span className="truncate max-w-[100px]">{g.group}</span>
                    <strong className="text-indigo-600 dark:text-indigo-400">{g.value}</strong>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. CONDITIONAL VALUE REPLACEMENT */}
      {activeTab === 'conditional' && (
        <div className="max-w-xl mx-auto p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4 animate-in fade-in-50 duration-200">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
            <Code2 className="w-4 h-4 text-brand-500" />
            <span>Conditional Value Replacement (IF / ELSE Logic)</span>
          </h3>

          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Target Column</label>
              <select
                value={condCol}
                onChange={e => setCondCol(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
              >
                {headers.map(h => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">If Value</label>
                <select
                  value={condOp}
                  onChange={e => setCondOp(e.target.value as any)}
                  className="w-full px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                >
                  <option value="equals">Equals</option>
                  <option value="contains">Contains</option>
                  <option value="is_empty">Is Empty / Null</option>
                  <option value="greater_than">&gt; Greater Than</option>
                  <option value="less_than">&lt; Less Than</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Comparison Target</label>
                <input
                  type="text"
                  placeholder="e.g. N/A or 0"
                  value={condVal}
                  onChange={e => setCondVal(e.target.value)}
                  className="w-full px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Then Replace With</label>
              <input
                type="text"
                placeholder="e.g. Standard"
                value={condNewVal}
                onChange={e => setCondNewVal(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
              />
            </div>

            <label className="flex items-center space-x-2 text-xs">
              <input
                type="checkbox"
                checked={useElseBranch}
                onChange={e => setUseElseBranch(e.target.checked)}
                className="rounded text-brand-600"
              />
              <span>Use ELSE branch (otherwise set to fallback value)</span>
            </label>

            {useElseBranch && (
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Else Replace With</label>
                <input
                  type="text"
                  placeholder="e.g. Non-Standard"
                  value={condElseVal}
                  onChange={e => setCondElseVal(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>
            )}

            <button
              onClick={handleApplyConditionalReplace}
              className="w-full py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition-all"
            >
              Execute Conditional Replacement
            </button>
          </div>
        </div>
      )}

      {/* 5. TEXT EXTRACTION & PREFIX/SUFFIX */}
      {activeTab === 'text_extract' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-in fade-in-50 duration-200">
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-brand-500" />
              <span>Extract Text Before / After Separator</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Source Column</label>
                <select
                  value={extractCol}
                  onChange={e => setExtractCol(e.target.value)}
                  className="w-full px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                >
                  {headers.map(h => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Separator</label>
                  <input
                    type="text"
                    value={extractSep}
                    onChange={e => setExtractSep(e.target.value)}
                    placeholder="e.g. @"
                    className="w-full px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Position</label>
                  <select
                    value={extractPos}
                    onChange={e => setExtractPos(e.target.value as any)}
                    className="w-full px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  >
                    <option value="before">Before Separator</option>
                    <option value="after">After Separator</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Target Column Name</label>
                <input
                  type="text"
                  value={extractTargetCol}
                  onChange={e => setExtractTargetCol(e.target.value)}
                  className="w-full px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <button
                onClick={handleExtractText}
                className="w-full py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition-all"
              >
                Extract to New Column
              </button>
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              <span>Strip Custom Prefix / Suffix</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Column</label>
                <select
                  value={extractCol}
                  onChange={e => setExtractCol(e.target.value)}
                  className="w-full px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                >
                  {headers.map(h => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Prefix to Trim</label>
                  <input
                    type="text"
                    value={trimPrefix}
                    onChange={e => setTrimPrefix(e.target.value)}
                    placeholder="e.g. CUST-"
                    className="w-full px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Suffix to Trim</label>
                  <input
                    type="text"
                    value={trimSuffix}
                    onChange={e => setTrimSuffix(e.target.value)}
                    placeholder="e.g. _v1"
                    className="w-full px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                </div>
              </div>

              <button
                onClick={handleTrimPrefixSuffix}
                className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all mt-4"
              >
                Trim Affixes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. STANDARDIZE CATEGORIES */}
      {activeTab === 'categories' && (
        <div className="max-w-xl mx-auto p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4 animate-in fade-in-50 duration-200">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
            <Tags className="w-4 h-4 text-indigo-500" />
            <span>Category & Synonym Standardization</span>
          </h3>

          <p className="text-xs text-slate-500">
            Map messy variant names (e.g. "eng", "engineering dept", "IT / Engineering") to a clean canonical label.
          </p>

          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Category Column</label>
              <select
                value={catCol}
                onChange={e => setCatCol(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
              >
                {headers.map(h => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Existing Variant Value</label>
                <input
                  type="text"
                  placeholder="e.g. engineering"
                  value={catSource}
                  onChange={e => setCatSource(e.target.value)}
                  className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Standardized Label</label>
                <input
                  type="text"
                  placeholder="e.g. Engineering"
                  value={catTarget}
                  onChange={e => setCatTarget(e.target.value)}
                  className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>
            </div>

            <button
              onClick={handleStandardizeCat}
              disabled={!catSource.trim() || !catTarget.trim()}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold transition-all"
            >
              Apply Category Mapping
            </button>
          </div>
        </div>
      )}

      {/* 7. CURRENCY & ROUNDING */}
      {activeTab === 'currency_round' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-in fade-in-50 duration-200">
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
              <DollarSign className="w-4 h-4 text-emerald-500" />
              <span>Currency Exchange Rate Converter</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Currency Column</label>
                <select
                  value={currCol}
                  onChange={e => setCurrCol(e.target.value)}
                  className="w-full px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
                >
                  {headers.map(h => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Exchange Rate Multiplier</label>
                  <input
                    type="number"
                    step="0.01"
                    value={currRate}
                    onChange={e => setCurrRate(Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">New Currency Symbol</label>
                  <input
                    type="text"
                    value={currSymbol}
                    onChange={e => setCurrSymbol(e.target.value)}
                    placeholder="e.g. $ or €"
                    className="w-full px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                </div>
              </div>

              <button
                onClick={handleConvertCurrency}
                className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all"
              >
                Apply Currency Conversion
              </button>
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-brand-500" />
              <span>Numerical Precision & Rounding</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Numerical Column</label>
                <select
                  value={roundCol}
                  onChange={e => setRoundCol(e.target.value)}
                  className="w-full px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
                >
                  {headers.map(h => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Decimal Places</label>
                  <input
                    type="number"
                    min="0"
                    max="6"
                    value={roundDecimals}
                    onChange={e => setRoundDecimals(Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Rounding Mode</label>
                  <select
                    value={roundMode}
                    onChange={e => setRoundMode(e.target.value as any)}
                    className="w-full px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  >
                    <option value="round">Standard Math Round</option>
                    <option value="floor">Floor (Round Down)</option>
                    <option value="ceil">Ceil (Round Up)</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleRoundNumbers}
                className="w-full py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition-all"
              >
                Apply Rounding
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
