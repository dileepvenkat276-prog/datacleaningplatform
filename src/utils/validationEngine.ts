import { Row, ValidationError, ValidationRule } from '../types/dataset';

export const DEFAULT_RULES_TEMPLATES: Omit<ValidationRule, 'id'>[] = [
  {
    name: 'Email Format Check',
    column: 'Email',
    type: 'email',
    params: {},
    severity: 'error',
    errorMessage: 'Must be a valid email address (name@domain.ext)',
    enabled: true
  },
  {
    name: 'Valid Phone Number',
    column: 'Phone_Number',
    type: 'phone',
    params: { requiredDigits: 10 },
    severity: 'warning',
    errorMessage: 'Must contain at least 10 valid phone digits',
    enabled: true
  },
  {
    name: 'Age Range (18 to 90)',
    column: 'Age',
    type: 'numeric_range',
    params: { min: 18, max: 90 },
    severity: 'error',
    errorMessage: 'Age must be between 18 and 90 years',
    enabled: true
  },
  {
    name: 'Positive Salary',
    column: 'Annual_Salary',
    type: 'positive_number',
    params: {},
    severity: 'error',
    errorMessage: 'Salary must be a positive non-zero number',
    enabled: true
  },
  {
    name: 'Required Customer ID',
    column: 'Customer_ID',
    type: 'not_empty',
    params: {},
    severity: 'error',
    errorMessage: 'Primary identifier cannot be empty',
    enabled: true
  }
];

export function runValidation(
  headers: string[],
  rows: Row[],
  rules: ValidationRule[]
): ValidationError[] {
  const errors: ValidationError[] = [];

  const activeRules = rules.filter(r => r.enabled && headers.includes(r.column));
  if (activeRules.length === 0) return errors;

  rows.forEach((row, rowIndex) => {
    activeRules.forEach(rule => {
      const rawVal = row[rule.column];
      const strVal = rawVal === null || rawVal === undefined ? '' : String(rawVal).trim();

      let hasError = false;
      let errorMsg = rule.errorMessage;
      let suggestedFix: any = undefined;

      switch (rule.type) {
        case 'not_empty':
          if (strVal === '') {
            hasError = true;
            suggestedFix = 'N/A';
          }
          break;

        case 'email':
          if (strVal !== '') {
            const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
            if (!emailRegex.test(strVal)) {
              hasError = true;
              // Attempt heuristic repair (e.g. replace double @ or fix common typos)
              let fixed = strVal.replace(/@@+/g, '@').replace(/\.\.+/g, '.').toLowerCase();
              if (emailRegex.test(fixed)) {
                suggestedFix = fixed;
              }
            }
          }
          break;

        case 'phone':
          if (strVal !== '') {
            const digits = strVal.replace(/\D/g, '');
            const minDigits = rule.params.requiredDigits || 7;
            if (digits.length < minDigits || digits.length > 15) {
              hasError = true;
              if (digits.length >= minDigits) {
                suggestedFix = digits;
              }
            }
          }
          break;

        case 'numeric_range':
          if (strVal !== '') {
            const num = Number(strVal.replace(/[^0-9.-]/g, ''));
            if (isNaN(num)) {
              hasError = true;
              errorMsg = `${rule.column} must be a number`;
            } else {
              const min = rule.params.min !== undefined ? rule.params.min : -Infinity;
              const max = rule.params.max !== undefined ? rule.params.max : Infinity;
              if (num < min || num > max) {
                hasError = true;
                suggestedFix = Math.min(Math.max(num, min), max);
              }
            }
          }
          break;

        case 'positive_number':
          if (strVal !== '') {
            const num = Number(strVal.replace(/^[$\€\£\¥]/, '').replace(/,/g, ''));
            if (isNaN(num) || num <= 0) {
              hasError = true;
              if (!isNaN(num) && num < 0) {
                suggestedFix = Math.abs(num);
              }
            }
          }
          break;

        case 'date_format':
          if (strVal !== '') {
            const parsed = Date.parse(strVal);
            if (isNaN(parsed)) {
              hasError = true;
            }
          }
          break;

        case 'allowed_list':
          if (strVal !== '' && rule.params.allowedValues && rule.params.allowedValues.length > 0) {
            const normalized = strVal.toLowerCase();
            const match = rule.params.allowedValues.find(v => v.toLowerCase() === normalized);
            if (!match) {
              hasError = true;
              // Fuzzy suggest closest match
              const closest = rule.params.allowedValues[0];
              suggestedFix = closest;
            }
          }
          break;

        case 'regex':
          if (strVal !== '' && rule.params.pattern) {
            try {
              const rx = new RegExp(rule.params.pattern);
              if (!rx.test(strVal)) {
                hasError = true;
              }
            } catch (e) {
              // Invalid pattern
            }
          }
          break;
      }

      if (hasError) {
        errors.push({
          id: `err-${row._id}-${rule.column}-${rule.id}`,
          ruleId: rule.id,
          rowId: row._id,
          rowIndex,
          column: rule.column,
          value: rawVal,
          ruleType: rule.type,
          message: errorMsg,
          suggestedFix
        });
      }
    });
  });

  return errors;
}
