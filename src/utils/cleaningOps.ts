import { DataType, Row } from '../types/dataset';

// ==========================================
// 1. DUPLICATE MANAGER
// ==========================================

export interface DuplicateGroup {
  originalIndex: number;
  row: Row;
  matchedIndex: number;
  matchedRow: Row;
  similarity: number; // 0 to 1
  matchedColumns: string[];
}

// Levenshtein distance similarity (0 to 1)
export function stringSimilarity(s1: string, s2: string): number {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  const longerLength = longer.length;
  if (longerLength === 0) return 1.0;

  const costs = new Array(shorter.length + 1);
  for (let i = 0; i <= shorter.length; i++) costs[i] = i;

  for (let i = 0; i < longer.length; i++) {
    costs[0] = i + 1;
    let corner = i;
    for (let j = 0; j < shorter.length; j++) {
      const upper = costs[j + 1];
      if (longer.charAt(i) === shorter.charAt(j)) {
        costs[j + 1] = corner;
      } else {
        const t = upper < corner ? upper : corner;
        costs[j + 1] = (costs[j] < t ? costs[j] : t) + 1;
      }
      corner = upper;
    }
  }

  const distance = costs[shorter.length];
  return (longerLength - distance) / longerLength;
}

export function findExactDuplicates(headers: string[], rows: Row[], subsetCols?: string[]) {
  const checkCols = subsetCols && subsetCols.length > 0 ? subsetCols : headers;
  const seenMap = new Map<string, number>(); // key -> first seen index
  const duplicateIndices = new Set<number>();

  rows.forEach((row, idx) => {
    const key = checkCols.map(c => String(row[c] ?? '').trim().toLowerCase()).join('|||');
    if (seenMap.has(key)) {
      duplicateIndices.add(idx);
    } else {
      seenMap.set(key, idx);
    }
  });

  return {
    duplicateIndices: Array.from(duplicateIndices),
    totalDuplicates: duplicateIndices.size
  };
}

export function findFuzzyDuplicates(
  headers: string[],
  rows: Row[],
  targetColumns: string[],
  threshold: number = 0.82
): DuplicateGroup[] {
  const groups: DuplicateGroup[] = [];
  const cols = targetColumns.length > 0 ? targetColumns : headers.slice(0, 3);

  // Compare pairs up to a reasonable cap for responsiveness
  const maxRowsToCompare = Math.min(rows.length, 300);

  for (let i = 0; i < maxRowsToCompare; i++) {
    for (let j = i + 1; j < maxRowsToCompare; j++) {
      const rowA = rows[i];
      const rowB = rows[j];

      let scoreSum = 0;
      let comparedCount = 0;
      const matchedCols: string[] = [];

      for (const col of cols) {
        const valA = String(rowA[col] ?? '').trim().toLowerCase();
        const valB = String(rowB[col] ?? '').trim().toLowerCase();

        if (valA === '' && valB === '') continue;

        comparedCount++;
        const sim = stringSimilarity(valA, valB);
        scoreSum += sim;
        if (sim >= threshold) {
          matchedCols.push(col);
        }
      }

      if (comparedCount > 0) {
        const avgSim = scoreSum / comparedCount;
        if (avgSim >= threshold && avgSim < 1.0) {
          groups.push({
            originalIndex: i,
            row: rowA,
            matchedIndex: j,
            matchedRow: rowB,
            similarity: Math.round(avgSim * 100) / 100,
            matchedColumns: matchedCols
          });
        }
      }
    }
  }

  return groups;
}

export function removeExactDuplicates(
  headers: string[],
  rows: Row[],
  keep: 'first' | 'last' = 'first',
  subsetCols?: string[]
): { newRows: Row[]; removedCount: number } {
  const checkCols = subsetCols && subsetCols.length > 0 ? subsetCols : headers;
  const seen = new Set<string>();
  const toKeep: Row[] = [];

  const sourceRows = keep === 'last' ? [...rows].reverse() : rows;

  for (const row of sourceRows) {
    const key = checkCols.map(c => String(row[c] ?? '').trim().toLowerCase()).join('|||');
    if (!seen.has(key)) {
      seen.add(key);
      toKeep.push(row);
    }
  }

  const finalRows = keep === 'last' ? toKeep.reverse() : toKeep;
  return {
    newRows: finalRows,
    removedCount: rows.length - finalRows.length
  };
}

// ==========================================
// 2. MISSING DATA MANAGER
// ==========================================

export type MissingFillStrategy = 'mean' | 'median' | 'mode' | 'zero' | 'custom' | 'forward' | 'backward';

export function fillMissingValues(
  column: string,
  rows: Row[],
  strategy: MissingFillStrategy,
  customValue?: any
): { newRows: Row[]; filledCount: number } {
  let filledCount = 0;
  const values = rows.map(r => r[column]);

  let replacementValue: any = null;

  if (strategy === 'zero') {
    replacementValue = 0;
  } else if (strategy === 'custom') {
    replacementValue = customValue !== undefined ? customValue : '';
  } else if (strategy === 'mean' || strategy === 'median') {
    const nums: number[] = [];
    values.forEach(v => {
      if (v !== null && v !== undefined && String(v).trim() !== '') {
        const clean = String(v).replace(/^[$\€\£\¥]/, '').replace(/,/g, '').trim();
        const n = Number(clean);
        if (!isNaN(n)) nums.push(n);
      }
    });

    if (nums.length > 0) {
      if (strategy === 'mean') {
        const sum = nums.reduce((a, b) => a + b, 0);
        replacementValue = Math.round((sum / nums.length) * 100) / 100;
      } else {
        nums.sort((a, b) => a - b);
        const mid = Math.floor(nums.length / 2);
        replacementValue = nums.length % 2 !== 0 ? nums[mid] : Math.round(((nums[mid - 1] + nums[mid]) / 2) * 100) / 100;
      }
    } else {
      replacementValue = 0;
    }
  } else if (strategy === 'mode') {
    const counts: Record<string, number> = {};
    values.forEach(v => {
      if (v !== null && v !== undefined && String(v).trim() !== '') {
        const s = String(v).trim();
        counts[s] = (counts[s] || 0) + 1;
      }
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    replacementValue = sorted.length > 0 ? sorted[0][0] : '';
  }

  const newRows = [...rows];

  if (strategy === 'forward') {
    let lastKnown: any = '';
    for (let i = 0; i < newRows.length; i++) {
      const v = newRows[i][column];
      if (v === null || v === undefined || String(v).trim() === '') {
        if (lastKnown !== '') {
          newRows[i] = { ...newRows[i], [column]: lastKnown };
          filledCount++;
        }
      } else {
        lastKnown = v;
      }
    }
  } else if (strategy === 'backward') {
    let nextKnown: any = '';
    for (let i = newRows.length - 1; i >= 0; i--) {
      const v = newRows[i][column];
      if (v === null || v === undefined || String(v).trim() === '') {
        if (nextKnown !== '') {
          newRows[i] = { ...newRows[i], [column]: nextKnown };
          filledCount++;
        }
      } else {
        nextKnown = v;
      }
    }
  } else {
    for (let i = 0; i < newRows.length; i++) {
      const v = newRows[i][column];
      if (v === null || v === undefined || String(v).trim() === '') {
        newRows[i] = { ...newRows[i], [column]: replacementValue };
        filledCount++;
      }
    }
  }

  return { newRows, filledCount };
}

export function dropRowsByMissingThreshold(
  headers: string[],
  rows: Row[],
  maxMissingPercentage: number // e.g. 50 means drop if >50% columns in that row are empty
): { newRows: Row[]; droppedCount: number } {
  const newRows = rows.filter(row => {
    const missingInRow = headers.filter(h => row[h] === null || row[h] === undefined || String(row[h]).trim() === '').length;
    const pct = (missingInRow / headers.length) * 100;
    return pct <= maxMissingPercentage;
  });

  return {
    newRows,
    droppedCount: rows.length - newRows.length
  };
}

export function dropColumnsByMissingThreshold(
  headers: string[],
  rows: Row[],
  maxMissingPercentage: number // e.g. 40 means drop if >40% rows in that column are empty
): { newHeaders: string[]; newRows: Row[]; droppedColumns: string[] } {
  const droppedColumns: string[] = [];
  const totalRows = rows.length;

  const newHeaders = headers.filter(h => {
    if (totalRows === 0) return true;
    const colMissing = rows.filter(r => r[h] === null || r[h] === undefined || String(r[h]).trim() === '').length;
    const pct = (colMissing / totalRows) * 100;
    if (pct > maxMissingPercentage) {
      droppedColumns.push(h);
      return false;
    }
    return true;
  });

  const newRows = rows.map(r => {
    const copy = { ...r };
    droppedColumns.forEach(c => delete copy[c]);
    return copy;
  });

  return { newHeaders, newRows, droppedColumns };
}

// ==========================================
// 3. TEXT CLEANING STUDIO
// ==========================================

export type TextCaseType = 'uppercase' | 'lowercase' | 'title' | 'sentence';

export function toTitleCase(str: string): string {
  return str.toLowerCase().replace(/(?:^|\s|-|\/)\S/g, c => c.toUpperCase());
}

export function toSentenceCase(str: string): string {
  const lower = str.toLowerCase();
  return lower.replace(/(^\s*\w|[.!?]\s*\w)/g, c => c.toUpperCase());
}

export function cleanTextColumn(
  column: string,
  rows: Row[],
  options: {
    trimExtraSpaces?: boolean;
    casing?: TextCaseType;
    removeSpecialChars?: boolean;
    removeNumbers?: boolean;
    removePunctuation?: boolean;
  }
): { newRows: Row[]; modifiedCount: number } {
  let modifiedCount = 0;

  const newRows = rows.map(row => {
    const raw = row[column];
    if (raw === null || raw === undefined) return row;
    let s = String(raw);
    const original = s;

    if (options.trimExtraSpaces) {
      s = s.trim().replace(/\s+/g, ' ');
    }

    if (options.removeNumbers) {
      s = s.replace(/[0-9]/g, '');
    }

    if (options.removePunctuation) {
      s = s.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?'"\[\]]/g, '');
    }

    if (options.removeSpecialChars) {
      // Keep only alphanumeric and spaces
      s = s.replace(/[^a-zA-Z0-9\s]/g, '');
    }

    if (options.casing) {
      switch (options.casing) {
        case 'uppercase':
          s = s.toUpperCase();
          break;
        case 'lowercase':
          s = s.toLowerCase();
          break;
        case 'title':
          s = toTitleCase(s);
          break;
        case 'sentence':
          s = toSentenceCase(s);
          break;
      }
    }

    if (s !== original) {
      modifiedCount++;
      return { ...row, [column]: s };
    }
    return row;
  });

  return { newRows, modifiedCount };
}

export function findAndReplaceText(
  column: string,
  rows: Row[],
  searchPattern: string,
  replacement: string,
  isRegex: boolean = false,
  caseSensitive: boolean = false
): { newRows: Row[]; modifiedCount: number } {
  let modifiedCount = 0;
  let matcher: RegExp;

  try {
    const flags = caseSensitive ? 'g' : 'gi';
    matcher = isRegex
      ? new RegExp(searchPattern, flags)
      : new RegExp(searchPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
  } catch (e) {
    return { newRows: rows, modifiedCount: 0 };
  }

  const newRows = rows.map(row => {
    const raw = row[column];
    if (raw === null || raw === undefined) return row;
    const str = String(raw);
    const updated = str.replace(matcher, replacement);

    if (updated !== str) {
      modifiedCount++;
      return { ...row, [column]: updated };
    }
    return row;
  });

  return { newRows, modifiedCount };
}

export function splitColumn(
  sourceColumn: string,
  headers: string[],
  rows: Row[],
  delimiter: string,
  newColumnNames: string[]
): { newHeaders: string[]; newRows: Row[] } {
  const colIndex = headers.indexOf(sourceColumn);
  if (colIndex === -1) return { newHeaders: headers, newRows: rows };

  const validNewCols = newColumnNames.filter(n => n.trim() !== '');
  if (validNewCols.length === 0) return { newHeaders: headers, newRows: rows };

  const newHeaders = [...headers];
  newHeaders.splice(colIndex + 1, 0, ...validNewCols);

  const newRows = rows.map(row => {
    const raw = row[sourceColumn];
    const val = raw === null || raw === undefined ? '' : String(raw);
    const parts = val.split(delimiter);

    const updated = { ...row };
    validNewCols.forEach((colName, idx) => {
      updated[colName] = parts[idx] !== undefined ? parts[idx].trim() : '';
    });
    return updated;
  });

  return { newHeaders, newRows };
}

export function mergeColumns(
  sourceColumns: string[],
  headers: string[],
  rows: Row[],
  separator: string,
  targetColumnName: string
): { newHeaders: string[]; newRows: Row[] } {
  if (sourceColumns.length < 2 || !targetColumnName.trim()) {
    return { newHeaders: headers, newRows: rows };
  }

  const newHeaders = headers.includes(targetColumnName) ? headers : [...headers, targetColumnName];

  const newRows = rows.map(row => {
    const mergedValue = sourceColumns
      .map(col => (row[col] === null || row[col] === undefined ? '' : String(row[col]).trim()))
      .filter(Boolean)
      .join(separator);

    return {
      ...row,
      [targetColumnName]: mergedValue
    };
  });

  return { newHeaders, newRows };
}

// ==========================================
// 4. DATA TYPE CONVERTER
// ==========================================

export function convertColumnDataType(
  column: string,
  rows: Row[],
  targetType: DataType
): {
  newRows: Row[];
  successCount: number;
  failedCount: number;
  sampleFailures: { rowId: string; value: any; reason: string }[];
} {
  let successCount = 0;
  let failedCount = 0;
  const sampleFailures: { rowId: string; value: any; reason: string }[] = [];

  const newRows = rows.map(row => {
    const raw = row[column];
    if (raw === null || raw === undefined || String(raw).trim() === '') {
      return row; // Keep empty as is
    }

    const str = String(raw).trim();
    let converted: any = raw;
    let ok = true;
    let failReason = '';

    switch (targetType) {
      case 'integer': {
        const clean = str.replace(/^[$\€\£\¥]/, '').replace(/%$/, '').replace(/,/g, '');
        const n = Number(clean);
        if (isNaN(n) || !Number.isInteger(n)) {
          ok = false;
          failReason = 'Cannot parse as integer';
        } else {
          converted = n;
        }
        break;
      }
      case 'decimal': {
        const clean = str.replace(/^[$\€\£\¥]/, '').replace(/%$/, '').replace(/,/g, '');
        const n = Number(clean);
        if (isNaN(n)) {
          ok = false;
          failReason = 'Cannot parse as decimal';
        } else {
          converted = n;
        }
        break;
      }
      case 'date': {
        const ts = Date.parse(str);
        if (isNaN(ts)) {
          ok = false;
          failReason = 'Unrecognized date format';
        } else {
          const d = new Date(ts);
          converted = d.toISOString().split('T')[0];
        }
        break;
      }
      case 'boolean': {
        const lower = str.toLowerCase();
        if (['true', '1', 'yes', 'y', 't'].includes(lower)) {
          converted = true;
        } else if (['false', '0', 'no', 'n', 'f'].includes(lower)) {
          converted = false;
        } else {
          ok = false;
          failReason = 'Not recognized as boolean (true/false, yes/no, 1/0)';
        }
        break;
      }
      case 'text':
      case 'category':
        converted = String(raw);
        break;
    }

    if (ok) {
      successCount++;
      return { ...row, [column]: converted };
    } else {
      failedCount++;
      if (sampleFailures.length < 5) {
        sampleFailures.push({ rowId: row._id, value: raw, reason: failReason });
      }
      return row;
    }
  });

  return { newRows, successCount, failedCount, sampleFailures };
}

// ==========================================
// 5. DATE AND TIME CLEANER
// ==========================================

export type TargetDateFormat = 'YYYY-MM-DD' | 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY/MM/DD';

export function parseFlexibleDate(dateStr: string): Date | null {
  if (!dateStr || String(dateStr).trim() === '') return null;
  const s = String(dateStr).trim();

  // Try standard Date.parse
  const direct = Date.parse(s);
  if (!isNaN(direct) && isNaN(Number(s))) {
    return new Date(direct);
  }

  // Try DD/MM/YYYY or DD-MM-YYYY
  const euMatch = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (euMatch) {
    const day = parseInt(euMatch[1], 10);
    const month = parseInt(euMatch[2], 10) - 1;
    let year = parseInt(euMatch[3], 10);
    if (year < 100) year += 2000;
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }

  return null;
}

export function formatDateTo(date: Date, format: TargetDateFormat): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');

  switch (format) {
    case 'YYYY-MM-DD':
      return `${yyyy}-${mm}-${dd}`;
    case 'MM/DD/YYYY':
      return `${mm}/${dd}/${yyyy}`;
    case 'DD/MM/YYYY':
      return `${dd}/${mm}/${yyyy}`;
    case 'YYYY/MM/DD':
      return `${yyyy}/${mm}/${dd}`;
  }
}

export function standardizeDates(
  column: string,
  rows: Row[],
  targetFormat: TargetDateFormat
): { newRows: Row[]; formattedCount: number; invalidCount: number } {
  let formattedCount = 0;
  let invalidCount = 0;

  const newRows = rows.map(row => {
    const raw = row[column];
    if (raw === null || raw === undefined || String(raw).trim() === '') return row;

    const parsed = parseFlexibleDate(String(raw));
    if (parsed) {
      const formatted = formatDateTo(parsed, targetFormat);
      if (formatted !== String(raw)) {
        formattedCount++;
        return { ...row, [column]: formatted };
      }
      return row;
    } else {
      invalidCount++;
      return row;
    }
  });

  return { newRows, formattedCount, invalidCount };
}

export function extractDateParts(
  column: string,
  headers: string[],
  rows: Row[],
  parts: { year?: boolean; month?: boolean; day?: boolean; weekday?: boolean }
): { newHeaders: string[]; newRows: Row[] } {
  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const newCols: string[] = [];

  if (parts.year) newCols.push(`${column}_Year`);
  if (parts.month) newCols.push(`${column}_Month`);
  if (parts.day) newCols.push(`${column}_Day`);
  if (parts.weekday) newCols.push(`${column}_Weekday`);

  const newHeaders = [...headers];
  newCols.forEach(c => {
    if (!newHeaders.includes(c)) newHeaders.push(c);
  });

  const newRows = rows.map(row => {
    const raw = row[column];
    const parsed = raw ? parseFlexibleDate(String(raw)) : null;
    const copy = { ...row };

    if (parsed) {
      if (parts.year) copy[`${column}_Year`] = parsed.getFullYear();
      if (parts.month) copy[`${column}_Month`] = parsed.getMonth() + 1;
      if (parts.day) copy[`${column}_Day`] = parsed.getDate();
      if (parts.weekday) copy[`${column}_Weekday`] = weekdays[parsed.getDay()];
    } else {
      if (parts.year) copy[`${column}_Year`] = '';
      if (parts.month) copy[`${column}_Month`] = '';
      if (parts.day) copy[`${column}_Day`] = '';
      if (parts.weekday) copy[`${column}_Weekday`] = '';
    }

    return copy;
  });

  return { newHeaders, newRows };
}

// ==========================================
// 6. OUTLIER DETECTION (IQR & Z-Score)
// ==========================================

export interface OutlierRecord {
  rowId: string;
  rowIndex: number;
  value: number;
  rawValue: any;
  method: 'IQR' | 'Z-Score';
  score: number; // For Z-score: z-value; for IQR: distance from fence
  lowerBound: number;
  upperBound: number;
  severity: 'moderate' | 'extreme';
}

export function detectOutliers(
  column: string,
  rows: Row[],
  method: 'IQR' | 'Z-Score' = 'IQR',
  thresholdMultiplier: number = 1.5 // 1.5 for IQR standard, 3.0 for IQR extreme, or 2.5 / 3.0 for Z-score
): {
  outliers: OutlierRecord[];
  stats: { min: number; max: number; mean: number; median: number; q1: number; q3: number; iqr: number; stdDev: number };
} {
  const numericItems: { rowId: string; rowIndex: number; val: number; raw: any }[] = [];

  rows.forEach((r, idx) => {
    const raw = r[column];
    if (raw !== null && raw !== undefined && String(raw).trim() !== '') {
      const clean = String(raw).replace(/^[$\€\£\¥]/, '').replace(/,/g, '');
      const n = Number(clean);
      if (!isNaN(n)) {
        numericItems.push({ rowId: r._id, rowIndex: idx, val: n, raw });
      }
    }
  });

  if (numericItems.length < 4) {
    return {
      outliers: [],
      stats: { min: 0, max: 0, mean: 0, median: 0, q1: 0, q3: 0, iqr: 0, stdDev: 0 }
    };
  }

  // Sort values
  const sorted = [...numericItems].sort((a, b) => a.val - b.val);
  const vals = sorted.map(s => s.val);

  const n = vals.length;
  const sum = vals.reduce((a, b) => a + b, 0);
  const mean = sum / n;
  const median = n % 2 !== 0 ? vals[Math.floor(n / 2)] : (vals[n / 2 - 1] + vals[n / 2]) / 2;

  // Q1 and Q3
  const q1 = vals[Math.floor(n * 0.25)];
  const q3 = vals[Math.floor(n * 0.75)];
  const iqr = q3 - q1;

  // Standard deviation
  const variance = vals.reduce((acc, curr) => acc + Math.pow(curr - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);

  const outliers: OutlierRecord[] = [];

  if (method === 'IQR') {
    const lower = q1 - thresholdMultiplier * iqr;
    const upper = q3 + thresholdMultiplier * iqr;

    numericItems.forEach(item => {
      if (item.val < lower || item.val > upper) {
        const dist = item.val < lower ? lower - item.val : item.val - upper;
        outliers.push({
          rowId: item.rowId,
          rowIndex: item.rowIndex,
          value: item.val,
          rawValue: item.raw,
          method: 'IQR',
          score: Math.round((dist / (iqr || 1)) * 10) / 10,
          lowerBound: Math.round(lower * 100) / 100,
          upperBound: Math.round(upper * 100) / 100,
          severity: dist > 2 * iqr ? 'extreme' : 'moderate'
        });
      }
    });
  } else {
    // Z-Score
    const zThreshold = thresholdMultiplier;
    const lower = mean - zThreshold * stdDev;
    const upper = mean + zThreshold * stdDev;

    numericItems.forEach(item => {
      const z = stdDev > 0 ? (item.val - mean) / stdDev : 0;
      if (Math.abs(z) >= zThreshold) {
        outliers.push({
          rowId: item.rowId,
          rowIndex: item.rowIndex,
          value: item.val,
          rawValue: item.raw,
          method: 'Z-Score',
          score: Math.round(Math.abs(z) * 10) / 10,
          lowerBound: Math.round(lower * 100) / 100,
          upperBound: Math.round(upper * 100) / 100,
          severity: Math.abs(z) > 3.5 ? 'extreme' : 'moderate'
        });
      }
    });
  }

  return {
    outliers,
    stats: {
      min: vals[0],
      max: vals[vals.length - 1],
      mean: Math.round(mean * 100) / 100,
      median: Math.round(median * 100) / 100,
      q1: Math.round(q1 * 100) / 100,
      q3: Math.round(q3 * 100) / 100,
      iqr: Math.round(iqr * 100) / 100,
      stdDev: Math.round(stdDev * 100) / 100
    }
  };
}

export function handleOutliers(
  column: string,
  rows: Row[],
  outlierRowIds: string[],
  action: 'remove_rows' | 'replace_mean' | 'replace_median' | 'replace_null' | 'clamp',
  stats?: { mean: number; median: number; lowerBound?: number; upperBound?: number }
): { newRows: Row[]; affectedCount: number } {
  const idsSet = new Set(outlierRowIds);
  let affectedCount = 0;

  if (action === 'remove_rows') {
    const newRows = rows.filter(r => !idsSet.has(r._id));
    return { newRows, affectedCount: rows.length - newRows.length };
  }

  const replacementVal =
    action === 'replace_mean'
      ? stats?.mean ?? 0
      : action === 'replace_median'
      ? stats?.median ?? 0
      : action === 'replace_null'
      ? null
      : undefined;

  const newRows = rows.map(r => {
    if (idsSet.has(r._id)) {
      affectedCount++;
      if (action === 'clamp' && stats?.lowerBound !== undefined && stats?.upperBound !== undefined) {
        const clean = Number(String(r[column]).replace(/^[$\€\£\¥]/, '').replace(/,/g, ''));
        const clamped = Math.max(stats.lowerBound, Math.min(stats.upperBound, clean));
        return { ...r, [column]: clamped };
      }
      return { ...r, [column]: replacementVal };
    }
    return r;
  });

  return { newRows, affectedCount };
}

// ==========================================
// 7. EMPTY DATA CLEANER
// ==========================================

export function findEmptyEntities(headers: string[], rows: Row[]) {
  const completelyEmptyRowIndices: number[] = [];
  rows.forEach((r, idx) => {
    const isAllBlank = headers.every(h => r[h] === null || r[h] === undefined || String(r[h]).trim() === '');
    if (isAllBlank) {
      completelyEmptyRowIndices.push(idx);
    }
  });

  const completelyEmptyColumns: string[] = [];
  const singleValueColumns: { column: string; value: string }[] = [];

  headers.forEach(h => {
    const values = rows.map(r => r[h]).filter(v => v !== null && v !== undefined && String(v).trim() !== '');
    if (values.length === 0) {
      completelyEmptyColumns.push(h);
    } else {
      const uniqueVals = new Set(values.map(String));
      if (uniqueVals.size === 1 && rows.length > 2) {
        singleValueColumns.push({ column: h, value: Array.from(uniqueVals)[0] });
      }
    }
  });

  return {
    completelyEmptyRowIndices,
    completelyEmptyColumns,
    singleValueColumns
  };
}

export function removeEmptyRowsAndColumns(
  headers: string[],
  rows: Row[],
  options: { removeEmptyRows: boolean; removeEmptyCols: boolean; removeSingleValCols?: boolean }
): { newHeaders: string[]; newRows: Row[]; removedRowsCount: number; removedCols: string[] } {
  let workingRows = rows;
  let removedRowsCount = 0;

  if (options.removeEmptyRows) {
    workingRows = rows.filter(r => !headers.every(h => r[h] === null || r[h] === undefined || String(r[h]).trim() === ''));
    removedRowsCount = rows.length - workingRows.length;
  }

  const removedCols: string[] = [];

  const newHeaders = headers.filter(h => {
    const values = workingRows.map(r => r[h]).filter(v => v !== null && v !== undefined && String(v).trim() !== '');
    if (options.removeEmptyCols && values.length === 0) {
      removedCols.push(h);
      return false;
    }
    if (options.removeSingleValCols && workingRows.length > 2) {
      const set = new Set(values.map(String));
      if (set.size === 1) {
        removedCols.push(h);
        return false;
      }
    }
    return true;
  });

  const newRows = workingRows.map(r => {
    const copy = { ...r };
    removedCols.forEach(c => delete copy[c]);
    return copy;
  });

  return { newHeaders, newRows, removedRowsCount, removedCols };
}
