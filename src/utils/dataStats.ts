import { ColumnMeta, ColumnProfile, DataType, Row } from '../types/dataset';

export function inferColumnType(values: any[]): DataType {
  let nonEmptyValues = values.filter(v => v !== null && v !== undefined && String(v).trim() !== '');
  if (nonEmptyValues.length === 0) return 'text';

  let boolCount = 0;
  let intCount = 0;
  let decCount = 0;
  let dateCount = 0;
  const uniqueSet = new Set<string>();

  for (const raw of nonEmptyValues) {
    const val = String(raw).trim();
    uniqueSet.add(val.toLowerCase());

    // Boolean check
    if (['true', 'false', 'yes', 'no', '1', '0', 't', 'f'].includes(val.toLowerCase())) {
      boolCount++;
    }

    // Number check (strip optional $ or % or commas for currency/percentage heuristics)
    const cleanNum = val.replace(/^[$\€\£\¥]/, '').replace(/%$/, '').replace(/,/g, '').trim();
    if (cleanNum !== '' && !isNaN(Number(cleanNum))) {
      if (Number.isInteger(Number(cleanNum))) {
        intCount++;
      } else {
        decCount++;
      }
    }

    // Date check (ISO, standard formats)
    if (
      /^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/.test(val) ||
      /^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}/.test(val) ||
      !isNaN(Date.parse(val)) && isNaN(Number(val)) && val.length >= 6
    ) {
      dateCount++;
    }
  }

  const threshold = nonEmptyValues.length * 0.7;

  if (boolCount >= threshold) return 'boolean';
  if (intCount >= threshold) return 'integer';
  if (intCount + decCount >= threshold) return 'decimal';
  if (dateCount >= threshold) return 'date';

  // Category heuristic: low cardinality compared to total
  if (uniqueSet.size > 1 && uniqueSet.size <= Math.min(15, nonEmptyValues.length * 0.4)) {
    return 'category';
  }

  return 'text';
}

export function buildColumnsMeta(headers: string[], rows: Row[]): ColumnMeta[] {
  return headers.map(header => {
    const values = rows.map(r => r[header]);
    const missingCount = values.filter(v => v === null || v === undefined || String(v).trim() === '').length;
    const uniqueVals = new Set(values.filter(v => v !== null && v !== undefined && String(v).trim() !== '').map(String));
    const sampleValues = values.filter(v => v !== null && v !== undefined && String(v).trim() !== '').slice(0, 5);

    return {
      name: header,
      originalName: header,
      inferredType: inferColumnType(values),
      missingCount,
      missingPercentage: rows.length > 0 ? Math.round((missingCount / rows.length) * 1000) / 10 : 0,
      uniqueCount: uniqueVals.size,
      sampleValues
    };
  });
}

export function profileColumn(columnName: string, rows: Row[], meta?: ColumnMeta): ColumnProfile {
  const values = rows.map(r => r[columnName]);
  const totalCount = rows.length;
  const nonNull = values.filter(v => v !== null && v !== undefined && String(v).trim() !== '');
  const missingCount = totalCount - nonNull.length;
  const missingPercentage = totalCount > 0 ? (missingCount / totalCount) * 100 : 0;

  const type = meta ? meta.inferredType : inferColumnType(values);

  // Frequencies
  const freqMap: Record<string, number> = {};
  nonNull.forEach(val => {
    const s = String(val).trim();
    freqMap[s] = (freqMap[s] || 0) + 1;
  });

  const uniqueCount = Object.keys(freqMap).length;
  const sortedFrequencies = Object.entries(freqMap)
    .sort((a, b) => b[1] - a[1])
    .map(([val, count]) => ({
      value: val,
      count,
      percentage: Math.round((count / (nonNull.length || 1)) * 1000) / 10
    }));

  const mode = sortedFrequencies.length > 0 ? sortedFrequencies[0].value : undefined;

  let min: number | string | undefined = undefined;
  let max: number | string | undefined = undefined;
  let avg: number | undefined = undefined;
  let median: number | undefined = undefined;
  let minLength: number | undefined = undefined;
  let maxLength: number | undefined = undefined;
  let histogram: { bin: string; count: number }[] | undefined = undefined;

  if (type === 'integer' || type === 'decimal') {
    const nums: number[] = [];
    nonNull.forEach(v => {
      const clean = String(v).replace(/^[$\€\£\¥]/, '').replace(/%$/, '').replace(/,/g, '').trim();
      const n = Number(clean);
      if (!isNaN(n)) nums.push(n);
    });

    if (nums.length > 0) {
      nums.sort((a, b) => a - b);
      min = nums[0];
      max = nums[nums.length - 1];
      const sum = nums.reduce((acc, curr) => acc + curr, 0);
      avg = Math.round((sum / nums.length) * 100) / 100;

      const mid = Math.floor(nums.length / 2);
      median = nums.length % 2 !== 0 ? nums[mid] : Math.round(((nums[mid - 1] + nums[mid]) / 2) * 100) / 100;

      // Histogram bins
      if (typeof min === 'number' && typeof max === 'number' && max > min) {
        const binCount = Math.min(6, Math.max(3, Math.floor(Math.sqrt(nums.length))));
        const step = (max - min) / binCount;
        const bins: { bin: string; count: number }[] = [];
        for (let b = 0; b < binCount; b++) {
          const bStart = min + b * step;
          const bEnd = min + (b + 1) * step;
          const label = `${bStart.toFixed(1)} - ${bEnd.toFixed(1)}`;
          const count = nums.filter(n => (b === binCount - 1 ? n >= bStart && n <= bEnd : n >= bStart && n < bEnd)).length;
          bins.push({ bin: label, count });
        }
        histogram = bins;
      }
    }
  } else {
    // Text stats
    if (nonNull.length > 0) {
      const lengths = nonNull.map(v => String(v).length);
      minLength = Math.min(...lengths);
      maxLength = Math.max(...lengths);
    }
  }

  return {
    name: columnName,
    type,
    totalCount,
    missingCount,
    missingPercentage: Math.round(missingPercentage * 10) / 10,
    uniqueCount,
    min,
    max,
    avg,
    median,
    mode,
    minLength,
    maxLength,
    frequencies: sortedFrequencies.slice(0, 8),
    histogram
  };
}

export function countExactDuplicates(headers: string[], rows: Row[]): number {
  if (rows.length <= 1) return 0;
  const seen = new Set<string>();
  let dupCount = 0;

  for (const row of rows) {
    const key = headers.map(h => String(row[h] ?? '').trim().toLowerCase()).join('|||');
    if (seen.has(key)) {
      dupCount++;
    } else {
      seen.add(key);
    }
  }

  return dupCount;
}

export function calculateDatasetStats(headers: string[], rows: Row[]) {
  const totalRows = rows.length;
  const totalCols = headers.length;
  const totalCells = totalRows * totalCols;

  let totalMissingCells = 0;
  const missingByColumn: Record<string, number> = {};

  headers.forEach(h => {
    let colMissing = 0;
    rows.forEach(r => {
      const v = r[h];
      if (v === null || v === undefined || String(v).trim() === '') {
        colMissing++;
      }
    });
    missingByColumn[h] = colMissing;
    totalMissingCells += colMissing;
  });

  const duplicateRows = countExactDuplicates(headers, rows);
  const typeDistribution: Record<string, number> = {};

  const columnsMeta = buildColumnsMeta(headers, rows);
  columnsMeta.forEach(meta => {
    typeDistribution[meta.inferredType] = (typeDistribution[meta.inferredType] || 0) + 1;
  });

  return {
    totalRows,
    totalColumns: totalCols,
    totalCells,
    totalMissingCells,
    missingPercentage: totalCells > 0 ? Math.round((totalMissingCells / totalCells) * 1000) / 10 : 0,
    missingByColumn,
    duplicateRows,
    duplicatePercentage: totalRows > 0 ? Math.round((duplicateRows / totalRows) * 1000) / 10 : 0,
    typeDistribution,
    columnsMeta
  };
}
