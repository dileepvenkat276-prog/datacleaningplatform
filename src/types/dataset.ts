export type DataType = 'text' | 'integer' | 'decimal' | 'date' | 'boolean' | 'category';

export interface ColumnMeta {
  name: string;
  originalName: string;
  inferredType: DataType;
  missingCount: number;
  missingPercentage: number;
  uniqueCount: number;
  sampleValues: (string | number | boolean | null)[];
}

export type Row = Record<string, any> & {
  _id: string;
};

export interface Dataset {
  id: string;
  name: string;
  filename: string;
  headers: string[];
  columnsMeta: ColumnMeta[];
  rows: Row[];
  originalRows: Row[];
  originalHeaders: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ColumnProfile {
  name: string;
  type: DataType;
  totalCount: number;
  missingCount: number;
  missingPercentage: number;
  uniqueCount: number;
  min?: number | string;
  max?: number | string;
  avg?: number;
  median?: number;
  mode?: string | number;
  minLength?: number;
  maxLength?: number;
  frequencies?: { value: string; count: number; percentage: number }[];
  histogram?: { bin: string; count: number }[];
}

export interface QualityDimension {
  name: 'Completeness' | 'Accuracy' | 'Consistency' | 'Uniqueness' | 'Validity' | 'Integrity';
  score: number; // 0-100
  weight: number;
  description: string;
  issuesCount: number;
}

export interface QualityIssue {
  id: string;
  dimension: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  column?: string;
  description: string;
  affectedRows: number;
  suggestedFix?: string;
  fixAction?: {
    tool: string;
    action: string;
    params?: Record<string, any>;
  };
}

export interface QualityReport {
  overallScore: number;
  dimensions: QualityDimension[];
  issues: QualityIssue[];
  calculationFormula: string;
  generatedAt: string;
  stats: {
    totalRows: number;
    totalColumns: number;
    missingCells: number;
    duplicateRows: number;
    invalidValues: number;
  };
}

export type ValidationRuleType = 
  | 'not_empty'
  | 'email'
  | 'phone'
  | 'numeric_range'
  | 'positive_number'
  | 'date_format'
  | 'allowed_list'
  | 'regex'
  | 'custom_expression';

export interface ValidationRule {
  id: string;
  name: string;
  column: string;
  type: ValidationRuleType;
  params: {
    min?: number;
    max?: number;
    allowedValues?: string[];
    dateFormat?: string;
    pattern?: string;
    requiredDigits?: number;
    customLogic?: string;
  };
  severity: 'warning' | 'error';
  errorMessage: string;
  enabled: boolean;
}

export interface ValidationError {
  id: string;
  ruleId: string;
  rowId: string;
  rowIndex: number;
  column: string;
  value: any;
  ruleType: ValidationRuleType;
  message: string;
  suggestedFix?: any;
}

export interface HistoryEntry {
  id: string;
  timestamp: string;
  operationName: string;
  category: 'cleaning' | 'transformation' | 'validation' | 'import' | 'manual';
  description: string;
  affectedRows: number;
  affectedCells: number;
  snapshotRows: Row[];
  snapshotHeaders: string[];
}

export interface RecipeStep {
  id: string;
  title: string;
  tool: string; // 'duplicates' | 'missing' | 'text' | 'types' | 'dates' | 'outliers' | 'empty' | 'transform'
  action: string;
  params: Record<string, any>;
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  steps: RecipeStep[];
}

export interface AssistantMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: string;
  actionProposal?: {
    actionName: string;
    description: string;
    isDestructive: boolean;
    tool: string;
    action: string;
    params: Record<string, any>;
  };
  executionResult?: {
    success: boolean;
    message: string;
    affectedCount: number;
  };
}

export interface ComparisonDiff {
  originalRowsCount: number;
  currentRowsCount: number;
  rowDelta: number;
  originalColumnsCount: number;
  currentColumnsCount: number;
  originalMissingCount: number;
  currentMissingCount: number;
  missingDelta: number;
  removedDuplicatesCount: number;
  modifiedCellsCount: number;
  originalQualityScore: number;
  currentQualityScore: number;
  addedColumns: string[];
  removedColumns: string[];
  changedRowsList: {
    rowId: string;
    rowIndex: number;
    changes: { column: string; original: any; current: any }[];
  }[];
}

export type ActiveNavTab =
  | 'dashboard'
  | 'upload'
  | 'preview'
  | 'clean'
  | 'transform'
  | 'validation'
  | 'analysis'
  | 'assistant'
  | 'recipes'
  | 'comparison'
  | 'history'
  | 'export'
  | 'settings';
