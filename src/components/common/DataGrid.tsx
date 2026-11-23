import React, { useState, useMemo } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  AlertCircle,
  HelpCircle,
  Check,
  Edit2,
  ChevronLeft,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { Row, ValidationError } from '../../types/dataset';
import { useData } from '../../context/DataContext';

interface DataGridProps {
  highlightErrors?: boolean;
  highlightOutliers?: boolean;
  outlierRowIds?: Set<string>;
  outlierColumn?: string;
  maxHeight?: string;
  onCellEdit?: (rowId: string, column: string, newValue: any) => void;
  showOnlyInvalid?: boolean;
}

export const DataGrid: React.FC<DataGridProps> = ({
  highlightErrors = true,
  highlightOutliers = true,
  outlierRowIds,
  outlierColumn,
  maxHeight = 'max-h-[580px]',
  onCellEdit,
  showOnlyInvalid = false
}) => {
  const { dataset, validationErrors, applyDatasetChange } = useData();

  const [searchTerm, setSearchTerm] = useState('');
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Cell editing state
  const [editingCell, setEditingCell] = useState<{ rowId: string; column: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  // Map of validation errors by `rowId:column` -> ValidationError
  const errorMap = useMemo(() => {
    const map = new Map<string, ValidationError>();
    validationErrors.forEach(err => {
      map.set(`${err.rowId}:${err.column}`, err);
    });
    return map;
  }, [validationErrors]);

  const rows = dataset?.rows || [];
  const headers = dataset?.headers || [];

  // Filter & Sort
  const filteredRows = useMemo(() => {
    let result = rows;

    if (showOnlyInvalid) {
      const invalidRowIds = new Set(validationErrors.map(e => e.rowId));
      result = result.filter(r => invalidRowIds.has(r._id));
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(r =>
        headers.some(h => String(r[h] ?? '').toLowerCase().includes(term))
      );
    }

    if (sortCol) {
      result = [...result].sort((a, b) => {
        const valA = a[sortCol];
        const valB = b[sortCol];

        if (valA === null || valA === undefined || valA === '') return 1;
        if (valB === null || valB === undefined || valB === '') return -1;

        const numA = Number(String(valA).replace(/^[$\€\£\¥]/, '').replace(/,/g, ''));
        const numB = Number(String(valB).replace(/^[$\€\£\¥]/, '').replace(/,/g, ''));

        if (!isNaN(numA) && !isNaN(numB)) {
          return sortDir === 'asc' ? numA - numB : numB - numA;
        }

        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();
        return sortDir === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
      });
    }

    return result;
  }, [rows, headers, searchTerm, sortCol, sortDir, showOnlyInvalid, validationErrors]);

  // Pagination
  const totalPages = Math.ceil(filteredRows.length / pageSize) || 1;
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  const handleSort = (col: string) => {
    if (sortCol === col) {
      if (sortDir === 'asc') setSortDir('desc');
      else {
        setSortCol(null);
        setSortDir('asc');
      }
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  const handleStartEdit = (rowId: string, column: string, currentVal: any) => {
    setEditingCell({ rowId, column });
    setEditValue(currentVal === null || currentVal === undefined ? '' : String(currentVal));
  };

  const handleSaveEdit = (rowId: string, column: string) => {
    if (!dataset) return;

    if (onCellEdit) {
      onCellEdit(rowId, column, editValue);
    } else {
      const updatedRows = dataset.rows.map(r => {
        if (r._id === rowId) {
          return { ...r, [column]: editValue };
        }
        return r;
      });

      applyDatasetChange(
        dataset.headers,
        updatedRows,
        'Manual Cell Edit',
        'manual',
        `Edited cell [${column}] to "${editValue}"`,
        1,
        1
      );
    }

    setEditingCell(null);
  };

  if (!dataset || headers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/50">
        <Sparkles className="w-10 h-10 text-slate-400 mb-3" />
        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Dataset Active</h3>
        <p className="text-xs text-slate-500 max-w-sm mt-1">Upload a dataset or load the demo customer data to start analyzing and cleaning.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
      {/* Table Toolbar */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2 flex-1 min-w-[200px] max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search across all fields..."
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="text-xs text-slate-400 hover:text-slate-600 px-1"
            >
              Clear
            </button>
          )}
        </div>

        {/* Status Info & Pagination Controls */}
        <div className="flex items-center space-x-3 text-xs text-slate-500 dark:text-slate-400">
          <span>
            Showing <strong className="text-slate-800 dark:text-slate-200">{filteredRows.length}</strong> of{' '}
            {rows.length} rows
          </span>

          <div className="flex items-center space-x-1.5">
            <select
              value={pageSize}
              onChange={e => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              <option value={15}>15 / page</option>
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
              <option value={100}>100 / page</option>
            </select>

            <div className="flex items-center space-x-1">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="px-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                {currentPage} / {totalPages}
              </span>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Container */}
      <div className={`overflow-auto flex-1 ${maxHeight}`}>
        <table className="w-full text-left border-collapse text-xs">
          <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-200 shadow-sm">
            <tr>
              <th className="py-2.5 px-3 w-12 text-center text-slate-400 font-mono text-[10px] border-r border-slate-200 dark:border-slate-700/50">
                #
              </th>
              {headers.map(header => {
                const isSorted = sortCol === header;
                return (
                  <th
                    key={header}
                    onClick={() => handleSort(header)}
                    className="py-2.5 px-3 whitespace-nowrap cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors border-r border-slate-200 dark:border-slate-700/50 group"
                  >
                    <div className="flex items-center justify-between space-x-1.5">
                      <span className="truncate">{header}</span>
                      <div className="text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200">
                        {isSorted ? (
                          sortDir === 'asc' ? (
                            <ChevronUp className="w-3.5 h-3.5 text-brand-500" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-brand-500" />
                          )
                        ) : (
                          <div className="w-3.5 h-3.5 opacity-0 group-hover:opacity-60">
                            <ChevronDown className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={headers.length + 1} className="py-8 text-center text-slate-400 text-xs">
                  No records match the current filter criteria.
                </td>
              </tr>
            ) : (
              paginatedRows.map((row, rowIdx) => {
                const globalRowIndex = (currentPage - 1) * pageSize + rowIdx + 1;
                const isOutlierRow = outlierRowIds?.has(row._id);

                return (
                  <tr
                    key={row._id}
                    className="hover:bg-brand-500/5 dark:hover:bg-brand-500/10 transition-colors group"
                  >
                    {/* Row Index */}
                    <td className="py-2 px-2.5 text-center text-slate-400 font-mono text-[11px] bg-slate-50/50 dark:bg-slate-900/50 border-r border-slate-100 dark:border-slate-800 select-none">
                      {globalRowIndex}
                    </td>

                    {/* Cell values */}
                    {headers.map(header => {
                      const val = row[header];
                      const isEmpty = val === null || val === undefined || String(val).trim() === '';
                      const isEditing = editingCell?.rowId === row._id && editingCell.column === header;

                      // Check for validation error
                      const validationError = highlightErrors ? errorMap.get(`${row._id}:${header}`) : undefined;
                      // Check for outlier cell
                      const isOutlierCell = highlightOutliers && isOutlierRow && outlierColumn === header;

                      let cellStyles = 'py-2 px-3 border-r border-slate-100 dark:border-slate-800/80 relative ';
                      if (validationError) {
                        cellStyles += 'bg-rose-500/10 text-rose-700 dark:text-rose-300 font-medium ';
                      } else if (isOutlierCell) {
                        cellStyles += 'bg-amber-500/15 text-amber-800 dark:text-amber-300 font-medium ';
                      } else if (isEmpty) {
                        cellStyles += 'text-slate-400 italic ';
                      } else {
                        cellStyles += 'text-slate-700 dark:text-slate-300 ';
                      }

                      return (
                        <td
                          key={header}
                          className={cellStyles}
                          onDoubleClick={() => handleStartEdit(row._id, header, val)}
                        >
                          {isEditing ? (
                            <div className="flex items-center space-x-1">
                              <input
                                autoFocus
                                type="text"
                                value={editValue}
                                onChange={e => setEditValue(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleSaveEdit(row._id, header);
                                  if (e.key === 'Escape') setEditingCell(null);
                                }}
                                className="w-full px-2 py-0.5 rounded border border-brand-500 bg-white dark:bg-slate-800 text-xs focus:outline-none"
                              />
                              <button
                                onClick={() => handleSaveEdit(row._id, header)}
                                className="p-1 rounded bg-brand-500 text-white hover:bg-brand-600"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between group/cell">
                              <span className="truncate max-w-[280px]" title={String(val ?? '')}>
                                {isEmpty ? <span className="text-[10px] opacity-70">null</span> : String(val)}
                              </span>

                              <div className="flex items-center space-x-1 ml-1.5 opacity-0 group-hover/cell:opacity-100 transition-opacity">
                                {validationError && (
                                  <span
                                    title={`Error: ${validationError.message}${
                                      validationError.suggestedFix ? ` (Suggested: ${validationError.suggestedFix})` : ''
                                    }`}
                                  >
                                    <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                                  </span>
                                )}
                                {isOutlierCell && (
                                  <span title="Detected as statistical outlier">
                                    <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
                                  </span>
                                )}
                                <button
                                  onClick={() => handleStartEdit(row._id, header, val)}
                                  className="p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                  title="Edit cell value"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
