import { ComparisonDiff, Row } from '../types/dataset';
import { countExactDuplicates } from './dataStats';
import { evaluateDataQuality } from './qualityEngine';

export function calculateDatasetComparison(
  originalHeaders: string[],
  originalRows: Row[],
  currentHeaders: string[],
  currentRows: Row[]
): ComparisonDiff {
  const origRowsCount = originalRows.length;
  const currRowsCount = currentRows.length;

  let origMissing = 0;
  originalHeaders.forEach(h => {
    originalRows.forEach(r => {
      const v = r[h];
      if (v === null || v === undefined || String(v).trim() === '') origMissing++;
    });
  });

  let currMissing = 0;
  currentHeaders.forEach(h => {
    currentRows.forEach(r => {
      const v = r[h];
      if (v === null || v === undefined || String(v).trim() === '') currMissing++;
    });
  });

  const origDuplicates = countExactDuplicates(originalHeaders, originalRows);
  const currDuplicates = countExactDuplicates(currentHeaders, currentRows);
  const removedDuplicatesCount = Math.max(0, origDuplicates - currDuplicates);

  // Column diffs
  const addedColumns = currentHeaders.filter(h => !originalHeaders.includes(h));
  const removedColumns = originalHeaders.filter(h => !currentHeaders.includes(h));

  // Cell modifications tracking
  const origMap = new Map<string, Row>();
  originalRows.forEach(r => origMap.set(r._id, r));

  let modifiedCellsCount = 0;
  const changedRowsList: ComparisonDiff['changedRowsList'] = [];

  currentRows.forEach((currRow, idx) => {
    const origRow = origMap.get(currRow._id);
    if (!origRow) return;

    const rowChanges: { column: string; original: any; current: any }[] = [];
    currentHeaders.forEach(col => {
      if (originalHeaders.includes(col)) {
        const valOrig = origRow[col];
        const valCurr = currRow[col];
        if (String(valOrig ?? '') !== String(valCurr ?? '')) {
          modifiedCellsCount++;
          rowChanges.push({
            column: col,
            original: valOrig,
            current: valCurr
          });
        }
      }
    });

    if (rowChanges.length > 0) {
      changedRowsList.push({
        rowId: currRow._id,
        rowIndex: idx,
        changes: rowChanges
      });
    }
  });

  const origQuality = evaluateDataQuality(originalHeaders, originalRows);
  const currQuality = evaluateDataQuality(currentHeaders, currentRows);

  return {
    originalRowsCount: origRowsCount,
    currentRowsCount: currRowsCount,
    rowDelta: currRowsCount - origRowsCount,
    originalColumnsCount: originalHeaders.length,
    currentColumnsCount: currentHeaders.length,
    originalMissingCount: origMissing,
    currentMissingCount: currMissing,
    missingDelta: currMissing - origMissing,
    removedDuplicatesCount,
    modifiedCellsCount,
    originalQualityScore: origQuality.overallScore,
    currentQualityScore: currQuality.overallScore,
    addedColumns,
    removedColumns,
    changedRowsList: changedRowsList.slice(0, 100) // Top 100 modified rows preview
  };
}
