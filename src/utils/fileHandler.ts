import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { HistoryEntry, QualityReport, Row, ValidationError } from '../types/dataset';

export interface FileImportPreview {
  fileName: string;
  fileSize: number;
  format: 'csv' | 'xlsx' | 'xls' | 'json' | 'txt';
  sheets?: string[];
  selectedSheet?: string;
  detectedDelimiter?: string;
  headers: string[];
  sampleRows: Record<string, any>[];
  totalEstimatedRows: number;
  encoding?: string;
  rawWorkbook?: XLSX.WorkBook;
  rawText?: string;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export async function parseFileForPreview(file: File): Promise<FileImportPreview> {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';

  if (['xlsx', 'xls'].includes(extension)) {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetNames = workbook.SheetNames;
    const firstSheetName = sheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

    const headers = jsonData.length > 0 ? Object.keys(jsonData[0]) : [];

    return {
      fileName: file.name,
      fileSize: file.size,
      format: extension as 'xlsx' | 'xls',
      sheets: sheetNames,
      selectedSheet: firstSheetName,
      headers,
      sampleRows: jsonData.slice(0, 10),
      totalEstimatedRows: jsonData.length,
      rawWorkbook: workbook
    };
  }

  if (extension === 'json') {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const dataArray = Array.isArray(parsed) ? parsed : [parsed];
    const headers = dataArray.length > 0 ? Object.keys(dataArray[0]) : [];

    return {
      fileName: file.name,
      fileSize: file.size,
      format: 'json',
      headers,
      sampleRows: dataArray.slice(0, 10),
      totalEstimatedRows: dataArray.length,
      rawText: text
    };
  }

  // CSV or TXT
  const text = await file.text();
  // Heuristic delimiter check
  let delimiter = ',';
  const firstLine = text.split('\n')[0] || '';
  if (firstLine.includes('\t')) delimiter = '\t';
  else if (firstLine.includes(';') && (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length) delimiter = ';';
  else if (firstLine.includes('|')) delimiter = '|';

  const parseResult = Papa.parse<Record<string, any>>(text, {
    header: true,
    delimiter,
    skipEmptyLines: 'greedy',
    preview: 15
  });

  const fullRowCount = text.split('\n').filter(l => l.trim() !== '').length - 1;

  return {
    fileName: file.name,
    fileSize: file.size,
    format: extension === 'txt' ? 'txt' : 'csv',
    detectedDelimiter: delimiter,
    headers: parseResult.meta.fields || [],
    sampleRows: parseResult.data,
    totalEstimatedRows: Math.max(0, fullRowCount),
    rawText: text
  };
}

export function finalizeImport(
  preview: FileImportPreview,
  options: {
    selectedSheet?: string;
    delimiter?: string;
    headerRowIndex?: number; // 0-indexed
  }
): { headers: string[]; rows: Row[] } {
  if (['xlsx', 'xls'].includes(preview.format) && preview.rawWorkbook) {
    const sheetName = options.selectedSheet || preview.selectedSheet || preview.rawWorkbook.SheetNames[0];
    const worksheet = preview.rawWorkbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
      defval: '',
      range: options.headerRowIndex || 0
    });

    const headers = jsonData.length > 0 ? Object.keys(jsonData[0]) : [];
    const rows: Row[] = jsonData.map((item, idx) => ({
      ...item,
      _id: `row-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`
    }));

    return { headers, rows };
  }

  if (preview.format === 'json' && preview.rawText) {
    const parsed = JSON.parse(preview.rawText);
    const dataArray: Record<string, any>[] = Array.isArray(parsed) ? parsed : [parsed];
    const headers = dataArray.length > 0 ? Object.keys(dataArray[0]) : [];
    const rows: Row[] = dataArray.map((item, idx) => ({
      ...item,
      _id: `row-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`
    }));
    return { headers, rows };
  }

  // CSV or TXT
  if (preview.rawText) {
    const parseResult = Papa.parse<Record<string, any>>(preview.rawText, {
      header: true,
      delimiter: options.delimiter || preview.detectedDelimiter || ',',
      skipEmptyLines: 'greedy'
    });

    const headers = parseResult.meta.fields || [];
    const rows: Row[] = parseResult.data.map((item, idx) => ({
      ...item,
      _id: `row-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`
    }));

    return { headers, rows };
  }

  return { headers: preview.headers, rows: [] };
}

// ==========================================
// EXPORT HELPERS (Browser-local downloads)
// ==========================================

export function downloadBlob(content: BlobPart, fileName: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function exportToCSV(headers: string[], rows: Row[], filename: string = 'cleaned_dataset.csv') {
  // Strip internal _id field
  const cleanData = rows.map(r => {
    const item: Record<string, any> = {};
    headers.forEach(h => {
      item[h] = r[h] ?? '';
    });
    return item;
  });

  const csvString = Papa.unparse({
    fields: headers,
    data: cleanData
  });

  downloadBlob(csvString, filename, 'text/csv;charset=utf-8;');
}

export function exportToXLSX(headers: string[], rows: Row[], filename: string = 'cleaned_dataset.xlsx') {
  const cleanData = rows.map(r => {
    const item: Record<string, any> = {};
    headers.forEach(h => {
      item[h] = r[h] ?? '';
    });
    return item;
  });

  const worksheet = XLSX.utils.json_to_sheet(cleanData, { header: headers });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Cleaned Data');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  downloadBlob(excelBuffer, filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}

export function exportToJSON(headers: string[], rows: Row[], filename: string = 'cleaned_dataset.json') {
  const cleanData = rows.map(r => {
    const item: Record<string, any> = {};
    headers.forEach(h => {
      item[h] = r[h] ?? null;
    });
    return item;
  });

  const jsonString = JSON.stringify(cleanData, null, 2);
  downloadBlob(jsonString, filename, 'application/json');
}

export function exportToTXT(headers: string[], rows: Row[], filename: string = 'cleaned_dataset.txt', delimiter: string = '\t') {
  const cleanData = rows.map(r => {
    const item: Record<string, any> = {};
    headers.forEach(h => {
      item[h] = r[h] ?? '';
    });
    return item;
  });

  const txtString = Papa.unparse({
    fields: headers,
    data: cleanData
  }, { delimiter });

  downloadBlob(txtString, filename, 'text/plain;charset=utf-8;');
}

export function exportValidationErrorReport(errors: ValidationError[], filename: string = 'validation_errors.csv') {
  const reportRows = errors.map(err => ({
    'Row Number': err.rowIndex + 1,
    'Row ID': err.rowId,
    'Column': err.column,
    'Cell Value': err.value ?? '',
    'Rule Type': err.ruleType,
    'Error Message': err.message,
    'Suggested Fix': err.suggestedFix ?? ''
  }));

  const csv = Papa.unparse(reportRows);
  downloadBlob(csv, filename, 'text/csv;charset=utf-8;');
}

export function exportDataQualityReport(report: QualityReport, filename: string = 'data_quality_report.txt') {
  const lines: string[] = [];
  lines.push('========================================================================');
  lines.push('                     DATA QUALITY INSPECTION REPORT                     ');
  lines.push('========================================================================');
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Overall Data Quality Score: ${report.overallScore} / 100`);
  lines.push(`Calculation Formula: ${report.calculationFormula}`);
  lines.push('------------------------------------------------------------------------');
  lines.push('DATASET OVERVIEW:');
  lines.push(`- Total Records: ${report.stats.totalRows}`);
  lines.push(`- Total Columns: ${report.stats.totalColumns}`);
  lines.push(`- Missing Data Cells: ${report.stats.missingCells}`);
  lines.push(`- Duplicate Rows Detected: ${report.stats.duplicateRows}`);
  lines.push(`- Total Discovered Anomalies/Violations: ${report.stats.invalidValues}`);
  lines.push('------------------------------------------------------------------------');
  lines.push('QUALITY DIMENSIONS:');
  report.dimensions.forEach(dim => {
    lines.push(`  * ${dim.name.padEnd(14)}: ${String(dim.score).padStart(3)}/100 (Weight: ${dim.weight}%) - ${dim.description}`);
  });
  lines.push('------------------------------------------------------------------------');
  lines.push(`IDENTIFIED QUALITY ISSUES (${report.issues.length} detected):`);
  report.issues.forEach((iss, idx) => {
    lines.push(`${idx + 1}. [${iss.severity.toUpperCase()}] [${iss.dimension}] ${iss.column ? `Col: ${iss.column} - ` : ''}${iss.description}`);
    lines.push(`   Suggested Action: ${iss.suggestedFix}`);
  });
  lines.push('========================================================================');
  lines.push('DISCLAIMER: Statistical quality checks reflect schema consistency, completeness,');
  lines.push('and distribution validity against heuristic rules; they do not certify real-world ground truth.');

  downloadBlob(lines.join('\n'), filename, 'text/plain;charset=utf-8;');
}

export function exportCleaningHistory(history: HistoryEntry[], filename: string = 'cleaning_audit_history.json') {
  const exportableHistory = history.map(h => ({
    timestamp: h.timestamp,
    operation: h.operationName,
    category: h.category,
    description: h.description,
    affectedRows: h.affectedRows,
    affectedCells: h.affectedCells
  }));

  downloadBlob(JSON.stringify(exportableHistory, null, 2), filename, 'application/json');
}
