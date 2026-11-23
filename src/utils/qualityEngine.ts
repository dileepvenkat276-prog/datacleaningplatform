import { QualityDimension, QualityIssue, QualityReport, Row } from '../types/dataset';
import { buildColumnsMeta, countExactDuplicates } from './dataStats';

export interface QualityWeights {
  completeness: number; // default 25
  accuracy: number;     // default 20
  validity: number;     // default 20
  uniqueness: number;   // default 15
  consistency: number;  // default 10
  integrity: number;    // default 10
}

export const DEFAULT_QUALITY_WEIGHTS: QualityWeights = {
  completeness: 25,
  accuracy: 20,
  validity: 20,
  uniqueness: 15,
  consistency: 10,
  integrity: 10
};

export function evaluateDataQuality(
  headers: string[],
  rows: Row[],
  weights: QualityWeights = DEFAULT_QUALITY_WEIGHTS
): QualityReport {
  const totalRows = rows.length;
  const totalCols = headers.length;
  const totalCells = Math.max(1, totalRows * totalCols);

  if (totalRows === 0 || totalCols === 0) {
    return {
      overallScore: 0,
      dimensions: [
        { name: 'Completeness', score: 0, weight: weights.completeness, description: 'Percentage of non-empty data cells', issuesCount: 0 },
        { name: 'Accuracy', score: 0, weight: weights.accuracy, description: 'Adherence to realistic value constraints', issuesCount: 0 },
        { name: 'Consistency', score: 0, weight: weights.consistency, description: 'Uniformity of casing, formatting, and categorizations', issuesCount: 0 },
        { name: 'Uniqueness', score: 0, weight: weights.uniqueness, description: 'Absence of duplicate rows or duplicate keys', issuesCount: 0 },
        { name: 'Validity', score: 0, weight: weights.validity, description: 'Conformance to expected data types and structural formats', issuesCount: 0 },
        { name: 'Integrity', score: 0, weight: weights.integrity, description: 'Logical coherence between related columns', issuesCount: 0 }
      ],
      issues: [],
      calculationFormula: 'Score = Σ (Dimension Score × Dimension Weight) / 100',
      generatedAt: new Date().toISOString(),
      stats: { totalRows: 0, totalColumns: 0, missingCells: 0, duplicateRows: 0, invalidValues: 0 }
    };
  }

  const issues: QualityIssue[] = [];
  const meta = buildColumnsMeta(headers, rows);

  // 1. COMPLETENESS CHECK
  let missingCells = 0;
  headers.forEach(h => {
    let colMissing = 0;
    rows.forEach(r => {
      const v = r[h];
      if (v === null || v === undefined || String(v).trim() === '') {
        colMissing++;
      }
    });
    missingCells += colMissing;

    if (colMissing > 0) {
      const pct = Math.round((colMissing / totalRows) * 100);
      issues.push({
        id: `comp-${h}`,
        dimension: 'Completeness',
        severity: pct > 30 ? 'high' : pct > 10 ? 'medium' : 'low',
        column: h,
        description: `Column "${h}" has ${colMissing} missing values (${pct}% of rows).`,
        affectedRows: colMissing,
        suggestedFix: `Impute missing values with mean, median, mode, or remove empty rows.`,
        fixAction: {
          tool: 'missing',
          action: 'impute',
          params: { column: h }
        }
      });
    }
  });

  const completenessRatio = 1 - (missingCells / totalCells);
  const completenessScore = Math.max(0, Math.min(100, Math.round(completenessRatio * 100)));

  // 2. UNIQUENESS CHECK
  const duplicateRows = countExactDuplicates(headers, rows);
  if (duplicateRows > 0) {
    issues.push({
      id: 'uniq-exact',
      dimension: 'Uniqueness',
      severity: duplicateRows > 5 ? 'high' : 'medium',
      description: `Detected ${duplicateRows} exact duplicate records.`,
      affectedRows: duplicateRows,
      suggestedFix: 'Deduplicate dataset keeping the first unique occurrence.',
      fixAction: {
        tool: 'duplicates',
        action: 'remove_exact'
      }
    });
  }
  const uniquenessScore = Math.max(0, Math.min(100, Math.round((1 - (duplicateRows / totalRows)) * 100)));

  // 3. VALIDITY CHECK
  let validityViolations = 0;
  headers.forEach(h => {
    const colMeta = meta.find(m => m.name === h);
    if (!colMeta) return;

    let invalidTypeCount = 0;
    rows.forEach(r => {
      const v = r[h];
      if (v === null || v === undefined || String(v).trim() === '') return;
      const str = String(v).trim();

      if (colMeta.inferredType === 'integer') {
        const clean = str.replace(/^[$\€\£\¥]/, '').replace(/%$/, '').replace(/,/g, '');
        if (isNaN(Number(clean)) || !Number.isInteger(Number(clean))) {
          invalidTypeCount++;
        }
      } else if (colMeta.inferredType === 'decimal') {
        const clean = str.replace(/^[$\€\£\¥]/, '').replace(/%$/, '').replace(/,/g, '');
        if (isNaN(Number(clean))) {
          invalidTypeCount++;
        }
      } else if (colMeta.inferredType === 'date') {
        if (isNaN(Date.parse(str))) {
          invalidTypeCount++;
        }
      }
    });

    if (invalidTypeCount > 0) {
      validityViolations += invalidTypeCount;
      issues.push({
        id: `valid-${h}`,
        dimension: 'Validity',
        severity: 'high',
        column: h,
        description: `Column "${h}" has ${invalidTypeCount} values inconsistent with inferred type "${colMeta.inferredType}".`,
        affectedRows: invalidTypeCount,
        suggestedFix: `Convert data type or standardize format in Data Type Converter.`,
        fixAction: {
          tool: 'types',
          action: 'convert',
          params: { column: h, targetType: colMeta.inferredType }
        }
      });
    }

    // Email validity check if column name includes "email"
    if (h.toLowerCase().includes('email')) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      let badEmailCount = 0;
      rows.forEach(r => {
        const email = String(r[h] ?? '').trim();
        if (email !== '' && !emailRegex.test(email)) {
          badEmailCount++;
        }
      });
      if (badEmailCount > 0) {
        validityViolations += badEmailCount;
        issues.push({
          id: `valid-email-${h}`,
          dimension: 'Validity',
          severity: 'high',
          column: h,
          description: `Column "${h}" contains ${badEmailCount} malformed email addresses.`,
          affectedRows: badEmailCount,
          suggestedFix: `Review validation errors and fix invalid emails.`,
          fixAction: {
            tool: 'validation',
            action: 'inspect_emails',
            params: { column: h }
          }
        });
      }
    }
  });

  const validityScore = Math.max(0, Math.min(100, Math.round((1 - Math.min(1, validityViolations / (totalRows * 2))) * 100)));

  // 4. ACCURACY CHECK (Heuristics: outliers, impossible values, placeholder text)
  let accuracyViolations = 0;
  headers.forEach(h => {
    const lowerHeader = h.toLowerCase();
    let issueCount = 0;

    rows.forEach(r => {
      const raw = r[h];
      if (raw === null || raw === undefined || String(raw).trim() === '') return;
      const str = String(raw).trim();

      // Placeholder strings
      if (['null', 'undefined', 'n/a', 'na', 'none', 'unknown', '???', 'test'].includes(str.toLowerCase())) {
        issueCount++;
      }

      // Age checks
      if (lowerHeader.includes('age')) {
        const ageNum = Number(str);
        if (!isNaN(ageNum) && (ageNum < 0 || ageNum > 120)) {
          issueCount++;
        }
      }

      // Salary / Price negative checks
      if ((lowerHeader.includes('salary') || lowerHeader.includes('price') || lowerHeader.includes('cost')) && !lowerHeader.includes('delta')) {
        const clean = str.replace(/^[$\€\£\¥]/, '').replace(/,/g, '');
        const valNum = Number(clean);
        if (!isNaN(valNum) && valNum < 0) {
          issueCount++;
        }
      }
    });

    if (issueCount > 0) {
      accuracyViolations += issueCount;
      issues.push({
        id: `acc-${h}`,
        dimension: 'Accuracy',
        severity: 'medium',
        column: h,
        description: `Column "${h}" has ${issueCount} suspicious or impossible values (negative values, extreme outliers, or literal placeholder strings).`,
        affectedRows: issueCount,
        suggestedFix: `Inspect outliers or replace placeholder tokens with nulls.`,
        fixAction: {
          tool: 'outliers',
          action: 'detect',
          params: { column: h }
        }
      });
    }
  });

  const accuracyScore = Math.max(0, Math.min(100, Math.round((1 - Math.min(1, accuracyViolations / totalRows)) * 100)));

  // 5. CONSISTENCY CHECK (Casing, leading/trailing spaces, mixed date formats)
  let consistencyViolations = 0;
  headers.forEach(h => {
    let extraSpaces = 0;
    let mixedCasing = false;
    let hasUpper = false;
    let hasLower = false;
    let hasTitle = false;

    rows.forEach(r => {
      const v = r[h];
      if (v === null || v === undefined) return;
      const str = String(v);
      if (str !== str.trim() || /\s{2,}/.test(str)) {
        extraSpaces++;
      }
      const trimmed = str.trim();
      if (trimmed.length > 2 && isNaN(Number(trimmed))) {
        if (trimmed === trimmed.toUpperCase()) hasUpper = true;
        else if (trimmed === trimmed.toLowerCase()) hasLower = true;
        else hasTitle = true;
      }
    });

    if ([hasUpper, hasLower, hasTitle].filter(Boolean).length > 1) {
      mixedCasing = true;
    }

    if (extraSpaces > 0) {
      consistencyViolations += extraSpaces;
      issues.push({
        id: `cons-spaces-${h}`,
        dimension: 'Consistency',
        severity: 'low',
        column: h,
        description: `Column "${h}" has ${extraSpaces} values with irregular leading/trailing or multiple spaces.`,
        affectedRows: extraSpaces,
        suggestedFix: `Trim extra whitespace across text columns.`,
        fixAction: {
          tool: 'text',
          action: 'trim_spaces',
          params: { column: h }
        }
      });
    }

    if (mixedCasing && rows.length > 3) {
      consistencyViolations += Math.floor(rows.length * 0.2);
      issues.push({
        id: `cons-casing-${h}`,
        dimension: 'Consistency',
        severity: 'low',
        column: h,
        description: `Column "${h}" has inconsistent letter casing (mixed uppercase, lowercase, and title case).`,
        affectedRows: rows.length,
        suggestedFix: `Standardize case to Title Case or Sentence Case.`,
        fixAction: {
          tool: 'text',
          action: 'standardize_case',
          params: { column: h, targetCase: 'title' }
        }
      });
    }
  });

  const consistencyScore = Math.max(0, Math.min(100, Math.round((1 - Math.min(1, consistencyViolations / (totalRows * 2))) * 100)));

  // 6. INTEGRITY CHECK (Single-value columns, completely empty records, logical coherence)
  let integrityViolations = 0;
  let emptyRowsCount = 0;
  rows.forEach(r => {
    const isAllBlank = headers.every(h => r[h] === null || r[h] === undefined || String(r[h]).trim() === '');
    if (isAllBlank) {
      emptyRowsCount++;
    }
  });

  if (emptyRowsCount > 0) {
    integrityViolations += emptyRowsCount * 3;
    issues.push({
      id: 'int-empty-rows',
      dimension: 'Integrity',
      severity: 'high',
      description: `Found ${emptyRowsCount} completely empty row(s).`,
      affectedRows: emptyRowsCount,
      suggestedFix: `Remove all completely blank rows.`,
      fixAction: {
        tool: 'empty',
        action: 'remove_empty_rows'
      }
    });
  }

  // Check for zero-variance / single-value columns
  headers.forEach(h => {
    const nonNullVals = new Set(rows.map(r => r[h]).filter(v => v !== null && v !== undefined && String(v).trim() !== '').map(String));
    if (nonNullVals.size === 1 && rows.length > 3) {
      integrityViolations += 2;
      issues.push({
        id: `int-const-col-${h}`,
        dimension: 'Integrity',
        severity: 'medium',
        column: h,
        description: `Column "${h}" contains only a single constant value ("${Array.from(nonNullVals)[0]}").`,
        affectedRows: rows.length,
        suggestedFix: `Consider removing redundant constant columns.`,
        fixAction: {
          tool: 'empty',
          action: 'remove_constant_column',
          params: { column: h }
        }
      });
    }
  });

  const integrityScore = Math.max(0, Math.min(100, Math.round((1 - Math.min(1, integrityViolations / totalRows)) * 100)));

  // WEIGHTED OVERALL QUALITY SCORE
  const totalWeight = weights.completeness + weights.accuracy + weights.consistency + weights.uniqueness + weights.validity + weights.integrity;
  const overallScore = Math.round(
    (completenessScore * weights.completeness +
      accuracyScore * weights.accuracy +
      consistencyScore * weights.consistency +
      uniquenessScore * weights.uniqueness +
      validityScore * weights.validity +
      integrityScore * weights.integrity) /
      (totalWeight || 100)
  );

  const dimensions: QualityDimension[] = [
    {
      name: 'Completeness',
      score: completenessScore,
      weight: weights.completeness,
      description: 'Absence of null, blank, or missing values',
      issuesCount: issues.filter(i => i.dimension === 'Completeness').length
    },
    {
      name: 'Accuracy',
      score: accuracyScore,
      weight: weights.accuracy,
      description: 'Plausibility, boundary validity, and absence of extreme outliers or dummy strings',
      issuesCount: issues.filter(i => i.dimension === 'Accuracy').length
    },
    {
      name: 'Consistency',
      score: consistencyScore,
      weight: weights.consistency,
      description: 'Uniform casing, whitespace conventions, and standardized formatting',
      issuesCount: issues.filter(i => i.dimension === 'Consistency').length
    },
    {
      name: 'Uniqueness',
      score: uniquenessScore,
      weight: weights.uniqueness,
      description: 'Absence of exact or duplicate records',
      issuesCount: issues.filter(i => i.dimension === 'Uniqueness').length
    },
    {
      name: 'Validity',
      score: validityScore,
      weight: weights.validity,
      description: 'Conformance to declared column data types, emails, and phone formats',
      issuesCount: issues.filter(i => i.dimension === 'Validity').length
    },
    {
      name: 'Integrity',
      score: integrityScore,
      weight: weights.integrity,
      description: 'Completeness of structural entities and absence of empty or redundant records',
      issuesCount: issues.filter(i => i.dimension === 'Integrity').length
    }
  ];

  return {
    overallScore,
    dimensions,
    issues: issues.sort((a, b) => {
      const order = { critical: 4, high: 3, medium: 2, low: 1 };
      return order[b.severity] - order[a.severity];
    }),
    calculationFormula: `Score = (${completenessScore}×${weights.completeness}% + ${accuracyScore}×${weights.accuracy}% + ${consistencyScore}×${weights.consistency}% + ${uniquenessScore}×${weights.uniqueness}% + ${validityScore}×${weights.validity}% + ${integrityScore}×${weights.integrity}%) = ${overallScore}/100`,
    generatedAt: new Date().toISOString(),
    stats: {
      totalRows,
      totalColumns: totalCols,
      missingCells,
      duplicateRows,
      invalidValues: validityViolations + accuracyViolations
    }
  };
}
