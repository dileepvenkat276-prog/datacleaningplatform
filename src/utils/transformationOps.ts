import { Row } from '../types/dataset';

// ==========================================
// COLUMN RENAMING & REORDERING
// ==========================================

export function renameColumn(
  headers: string[],
  rows: Row[],
  oldName: string,
  newName: string
): { newHeaders: string[]; newRows: Row[] } {
  const cleanNewName = newName.trim();
  if (!cleanNewName || cleanNewName === oldName) return { newHeaders: headers, newRows: rows };

  const newHeaders = headers.map(h => (h === oldName ? cleanNewName : h));
  const newRows = rows.map(r => {
    const updated = { ...r };
    if (oldName in updated) {
      updated[cleanNewName] = updated[oldName];
      delete updated[oldName];
    }
    return updated;
  });

  return { newHeaders, newRows };
}

// ==========================================
// ROW FILTERING
// ==========================================

export type FilterOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'greater_than'
  | 'less_than'
  | 'is_empty'
  | 'is_not_empty';

export interface FilterCondition {
  column: string;
  operator: FilterOperator;
  value: string;
}

export function filterRows(
  rows: Row[],
  conditions: FilterCondition[],
  matchAll: boolean = true
): Row[] {
  if (conditions.length === 0) return rows;

  return rows.filter(r => {
    const results = conditions.map(cond => {
      const cell = r[cond.column];
      const s = cell === null || cell === undefined ? '' : String(cell).trim();
      const lower = s.toLowerCase();
      const target = cond.value.trim().toLowerCase();

      switch (cond.operator) {
        case 'equals':
          return lower === target;
        case 'not_equals':
          return lower !== target;
        case 'contains':
          return lower.includes(target);
        case 'not_contains':
          return !lower.includes(target);
        case 'starts_with':
          return lower.startsWith(target);
        case 'ends_with':
          return lower.endsWith(target);
        case 'is_empty':
          return s === '';
        case 'is_not_empty':
          return s !== '';
        case 'greater_than': {
          const numCell = Number(s.replace(/[^0-9.-]/g, ''));
          const numTarget = Number(target);
          return !isNaN(numCell) && !isNaN(numTarget) && numCell > numTarget;
        }
        case 'less_than': {
          const numCell = Number(s.replace(/[^0-9.-]/g, ''));
          const numTarget = Number(target);
          return !isNaN(numCell) && !isNaN(numTarget) && numCell < numTarget;
        }
        default:
          return true;
      }
    });

    return matchAll ? results.every(Boolean) : results.some(Boolean);
  });
}

// ==========================================
// SORTING & GROUPING
// ==========================================

export function sortDataset(
  rows: Row[],
  column: string,
  direction: 'asc' | 'desc'
): Row[] {
  return [...rows].sort((a, b) => {
    const valA = a[column];
    const valB = b[column];

    if (valA === null || valA === undefined || valA === '') return 1;
    if (valB === null || valB === undefined || valB === '') return -1;

    // Check if numeric
    const numA = Number(String(valA).replace(/^[$\€\£\¥]/, '').replace(/,/g, ''));
    const numB = Number(String(valB).replace(/^[$\€\£\¥]/, '').replace(/,/g, ''));

    if (!isNaN(numA) && !isNaN(numB)) {
      return direction === 'asc' ? numA - numB : numB - numA;
    }

    const strA = String(valA).toLowerCase();
    const strB = String(valB).toLowerCase();
    if (direction === 'asc') {
      return strA.localeCompare(strB);
    } else {
      return strB.localeCompare(strA);
    }
  });
}

export function groupAndAggregate(
  rows: Row[],
  groupColumn: string,
  aggColumn: string,
  aggFunction: 'count' | 'sum' | 'avg' | 'min' | 'max'
): { group: string; count: number; value: number }[] {
  const groups: Record<string, number[]> = {};

  rows.forEach(r => {
    const rawGrp = r[groupColumn];
    const grp = rawGrp === null || rawGrp === undefined || String(rawGrp).trim() === '' ? '(Blank)' : String(rawGrp).trim();

    const rawVal = r[aggColumn];
    const clean = String(rawVal ?? '').replace(/^[$\€\£\¥]/, '').replace(/,/g, '');
    const num = Number(clean);

    if (!groups[grp]) groups[grp] = [];
    if (!isNaN(num) && rawVal !== null && rawVal !== undefined && String(rawVal).trim() !== '') {
      groups[grp].push(num);
    }
  });

  return Object.entries(groups).map(([grp, nums]) => {
    let result = 0;
    if (aggFunction === 'count') {
      result = nums.length;
    } else if (nums.length > 0) {
      if (aggFunction === 'sum') {
        result = Math.round(nums.reduce((a, b) => a + b, 0) * 100) / 100;
      } else if (aggFunction === 'avg') {
        const sum = nums.reduce((a, b) => a + b, 0);
        result = Math.round((sum / nums.length) * 100) / 100;
      } else if (aggFunction === 'min') {
        result = Math.min(...nums);
      } else if (aggFunction === 'max') {
        result = Math.max(...nums);
      }
    }

    return {
      group: grp,
      count: nums.length,
      value: result
    };
  }).sort((a, b) => b.value - a.value);
}

// ==========================================
// CONDITIONAL VALUE REPLACEMENT
// ==========================================

export function conditionalReplace(
  column: string,
  rows: Row[],
  condition: { operator: FilterOperator; conditionValue: string },
  newValue: any,
  elseValue?: any,
  useElse: boolean = false
): { newRows: Row[]; modifiedCount: number } {
  let modifiedCount = 0;

  const newRows = rows.map(r => {
    const cell = r[column];
    const s = cell === null || cell === undefined ? '' : String(cell).trim();
    const lower = s.toLowerCase();
    const target = condition.conditionValue.trim().toLowerCase();

    let matched = false;
    switch (condition.operator) {
      case 'equals':
        matched = lower === target;
        break;
      case 'not_equals':
        matched = lower !== target;
        break;
      case 'contains':
        matched = lower.includes(target);
        break;
      case 'is_empty':
        matched = s === '';
        break;
      case 'is_not_empty':
        matched = s !== '';
        break;
      case 'greater_than': {
        const numCell = Number(s.replace(/[^0-9.-]/g, ''));
        const numTarget = Number(target);
        matched = !isNaN(numCell) && !isNaN(numTarget) && numCell > numTarget;
        break;
      }
      case 'less_than': {
        const numCell = Number(s.replace(/[^0-9.-]/g, ''));
        const numTarget = Number(target);
        matched = !isNaN(numCell) && !isNaN(numTarget) && numCell < numTarget;
        break;
      }
      default:
        matched = false;
    }

    if (matched) {
      modifiedCount++;
      return { ...r, [column]: newValue };
    } else if (useElse && elseValue !== undefined) {
      modifiedCount++;
      return { ...r, [column]: elseValue };
    }
    return r;
  });

  return { newRows, modifiedCount };
}

// ==========================================
// MATHEMATICAL OPERATIONS & CUSTOM FORMULAS
// ==========================================

export function mathOperationTwoColumns(
  colA: string,
  colB: string,
  operator: '+' | '-' | '*' | '/' | '%' | '^',
  targetCol: string,
  headers: string[],
  rows: Row[]
): { newHeaders: string[]; newRows: Row[] } {
  const newHeaders = headers.includes(targetCol) ? headers : [...headers, targetCol];

  const newRows = rows.map(r => {
    const rawA = r[colA];
    const rawB = r[colB];

    const numA = Number(String(rawA ?? '').replace(/^[$\€\£\¥]/, '').replace(/,/g, ''));
    const numB = Number(String(rawB ?? '').replace(/^[$\€\£\¥]/, '').replace(/,/g, ''));

    let res: any = '';
    if (!isNaN(numA) && !isNaN(numB)) {
      switch (operator) {
        case '+':
          res = Math.round((numA + numB) * 1000) / 1000;
          break;
        case '-':
          res = Math.round((numA - numB) * 1000) / 1000;
          break;
        case '*':
          res = Math.round(numA * numB * 1000) / 1000;
          break;
        case '/':
          res = numB !== 0 ? Math.round((numA / numB) * 1000) / 1000 : 'ERR_DIV_ZERO';
          break;
        case '%':
          res = numB !== 0 ? numA % numB : 'ERR_DIV_ZERO';
          break;
        case '^':
          res = Math.pow(numA, numB);
          break;
      }
    }

    return { ...r, [targetCol]: res };
  });

  return { newHeaders, newRows };
}

// Safe Custom Formula Evaluator
// Supports column names in brackets e.g. "[Price] * 1.1 + [Tax]" or "[Age] + 5"
export function evaluateCustomFormula(
  formula: string,
  targetCol: string,
  headers: string[],
  rows: Row[]
): { newHeaders: string[]; newRows: Row[]; preview: { original: any; calculated: any }[] } {
  const newHeaders = headers.includes(targetCol) ? headers : [...headers, targetCol];
  const preview: { original: any; calculated: any }[] = [];

  // Extract referenced columns
  const referencedCols: string[] = [];
  const regex = /\[([^\]]+)\]/g;
  let match;
  while ((match = regex.exec(formula)) !== null) {
    referencedCols.push(match[1]);
  }

  const newRows = rows.map((r, idx) => {
    let evalStr = formula;
    referencedCols.forEach(col => {
      const rawVal = r[col];
      const cleanVal = String(rawVal ?? '').replace(/^[$\€\£\¥]/, '').replace(/,/g, '');
      const num = Number(cleanVal);
      const safeVal = !isNaN(num) && cleanVal.trim() !== '' ? String(num) : '0';
      evalStr = evalStr.replace(new RegExp(`\\[${col}\\]`, 'g'), safeVal);
    });

    // Sanitize evalStr to allow only numbers, math operators, parens, Math functions
    let result: any = '';
    try {
      const sanitized = evalStr.replace(/[^0-9+\-*/().,%^MathsincotanqrlogeEPI ]/g, '');
      // Safe execution using Function constructor with no global scope
      const calcFn = new Function(`"use strict"; return (${sanitized});`);
      const val = calcFn();
      result = typeof val === 'number' && !isNaN(val) && isFinite(val) ? Math.round(val * 1000) / 1000 : '';
    } catch (e) {
      result = 'ERR_SYNTAX';
    }

    if (idx < 5) {
      preview.push({ original: r[targetCol], calculated: result });
    }

    return { ...r, [targetCol]: result };
  });

  return { newHeaders, newRows, preview };
}

// ==========================================
// TEXT EXTRACTION, PREFIX/SUFFIX, STANDARDIZE CATEGORIES
// ==========================================

export function extractTextAroundSeparator(
  column: string,
  targetCol: string,
  headers: string[],
  rows: Row[],
  separator: string,
  position: 'before' | 'after'
): { newHeaders: string[]; newRows: Row[] } {
  const newHeaders = headers.includes(targetCol) ? headers : [...headers, targetCol];

  const newRows = rows.map(r => {
    const raw = r[column];
    if (raw === null || raw === undefined) return { ...r, [targetCol]: '' };
    const str = String(raw);
    const parts = str.split(separator);

    let extracted = '';
    if (position === 'before') {
      extracted = parts[0]?.trim() || '';
    } else {
      extracted = parts.slice(1).join(separator).trim() || '';
    }

    return { ...r, [targetCol]: extracted };
  });

  return { newHeaders, newRows };
}

export function removePrefixSuffix(
  column: string,
  rows: Row[],
  prefix: string,
  suffix: string
): { newRows: Row[]; modifiedCount: number } {
  let modifiedCount = 0;

  const newRows = rows.map(r => {
    const raw = r[column];
    if (raw === null || raw === undefined) return r;
    let s = String(raw);
    const orig = s;

    if (prefix && s.startsWith(prefix)) {
      s = s.substring(prefix.length);
    }
    if (suffix && s.endsWith(suffix)) {
      s = s.substring(0, s.length - suffix.length);
    }

    if (s !== orig) {
      modifiedCount++;
      return { ...r, [column]: s.trim() };
    }
    return r;
  });

  return { newRows, modifiedCount };
}

export function standardizeCategories(
  column: string,
  rows: Row[],
  mapping: Record<string, string> // e.g. { "eng": "Engineering", "operations": "Operations" }
): { newRows: Row[]; modifiedCount: number } {
  let modifiedCount = 0;

  const newRows = rows.map(r => {
    const raw = r[column];
    if (raw === null || raw === undefined) return r;
    const key = String(raw).trim().toLowerCase();

    if (mapping[key] !== undefined && mapping[key] !== raw) {
      modifiedCount++;
      return { ...r, [column]: mapping[key] };
    }
    return r;
  });

  return { newRows, modifiedCount };
}

export function convertCurrency(
  column: string,
  rows: Row[],
  exchangeRate: number,
  currencySymbol: string = '$'
): { newRows: Row[]; modifiedCount: number } {
  let modifiedCount = 0;

  const newRows = rows.map(r => {
    const raw = r[column];
    if (raw === null || raw === undefined || String(raw).trim() === '') return r;

    const clean = String(raw).replace(/^[$\€\£\¥\w\s]+/, '').replace(/,/g, '').trim();
    const num = Number(clean);

    if (!isNaN(num)) {
      const converted = Math.round(num * exchangeRate * 100) / 100;
      modifiedCount++;
      const formatted = currencySymbol ? `${currencySymbol}${converted.toLocaleString()}` : converted;
      return { ...r, [column]: formatted };
    }
    return r;
  });

  return { newRows, modifiedCount };
}

export function roundNumericalValues(
  column: string,
  rows: Row[],
  decimals: number = 2,
  mode: 'round' | 'floor' | 'ceil' = 'round'
): { newRows: Row[]; modifiedCount: number } {
  let modifiedCount = 0;

  const newRows = rows.map(r => {
    const raw = r[column];
    if (raw === null || raw === undefined || String(raw).trim() === '') return r;

    const clean = String(raw).replace(/^[$\€\£\¥]/, '').replace(/,/g, '');
    const num = Number(clean);

    if (!isNaN(num)) {
      const factor = Math.pow(10, decimals);
      let rounded = num;
      if (mode === 'round') rounded = Math.round(num * factor) / factor;
      else if (mode === 'floor') rounded = Math.floor(num * factor) / factor;
      else if (mode === 'ceil') rounded = Math.ceil(num * factor) / factor;

      if (rounded !== num) {
        modifiedCount++;
        return { ...r, [column]: rounded };
      }
    }
    return r;
  });

  return { newRows, modifiedCount };
}
