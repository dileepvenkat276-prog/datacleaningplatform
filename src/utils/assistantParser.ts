import { AssistantMessage } from '../types/dataset';

export interface ParsedCommand {
  understood: boolean;
  messageText: string;
  actionProposal?: {
    actionName: string;
    description: string;
    isDestructive: boolean;
    tool: string;
    action: string;
    params: Record<string, any>;
  };
}

// Find column in dataset that best matches a query token (case-insensitive & fuzzy)
export function findMatchingColumn(query: string, headers: string[]): string | undefined {
  const lowerQuery = query.toLowerCase();

  // Direct includes check
  for (const h of headers) {
    const lh = h.toLowerCase().replace(/_/g, ' ');
    if (lowerQuery.includes(lh) || lowerQuery.includes(h.toLowerCase())) {
      return h;
    }
  }

  // Common semantic aliases
  const aliases: Record<string, string[]> = {
    age: ['age', 'years', 'dob'],
    name: ['name', 'full name', 'customer', 'customer name', 'employee', 'first name', 'last name'],
    salary: ['salary', 'annual salary', 'income', 'wage', 'pay', 'compensation', 'amount', 'price'],
    email: ['email', 'email address', 'mail'],
    phone: ['phone', 'phone number', 'mobile', 'cell', 'telephone'],
    date: ['date', 'join date', 'created at', 'timestamp', 'joined'],
    country: ['country', 'nation', 'region', 'location', 'state'],
    department: ['department', 'dept', 'division', 'team']
  };

  for (const [aliasKey, synonyms] of Object.entries(aliases)) {
    if (synonyms.some(syn => lowerQuery.includes(syn))) {
      const match = headers.find(h => {
        const lh = h.toLowerCase().replace(/_/g, ' ');
        return synonyms.some(syn => lh.includes(syn) || syn.includes(lh));
      });
      if (match) return match;
    }
  }

  return undefined;
}

export function parseAssistantCommand(
  rawInput: string,
  headers: string[],
  rowsCount: number
): ParsedCommand {
  const input = rawInput.trim();
  const lower = input.toLowerCase();

  // 1. Remove duplicates
  if (lower.includes('duplicate') || lower.includes('deduplicate') || lower.includes('dedupe')) {
    const targetCol = findMatchingColumn(lower, headers);
    const colDesc = targetCol ? `based on column "${targetCol}"` : 'across all columns';

    return {
      understood: true,
      messageText: `I identified a request to remove duplicate records ${colDesc}.`,
      actionProposal: {
        actionName: 'Remove Duplicates',
        description: `This operation will scan the dataset and eliminate duplicate rows ${colDesc}, preserving the first unique record.`,
        isDestructive: true,
        tool: 'duplicates',
        action: 'remove_exact',
        params: targetCol ? { subsetCols: [targetCol] } : {}
      }
    };
  }

  // 2. Fill missing values (mean, median, mode, zero)
  if (lower.includes('missing') || lower.includes('fill') || lower.includes('impute')) {
    const targetCol = findMatchingColumn(lower, headers);

    if (lower.includes('median')) {
      const col = targetCol || headers.find(h => h.toLowerCase().includes('age') || h.toLowerCase().includes('salary')) || headers[0];
      return {
        understood: true,
        messageText: `I will calculate the median value for column "${col}" and impute all empty cells with it.`,
        actionProposal: {
          actionName: `Impute Missing with Median`,
          description: `Calculates the statistical median of "${col}" and replaces empty cells without dropping rows.`,
          isDestructive: false,
          tool: 'missing',
          action: 'fill',
          params: { column: col, strategy: 'median' }
        }
      };
    }

    if (lower.includes('mean') || lower.includes('average')) {
      const col = targetCol || headers.find(h => h.toLowerCase().includes('age') || h.toLowerCase().includes('salary')) || headers[0];
      return {
        understood: true,
        messageText: `I will calculate the arithmetic mean for column "${col}" and fill all missing cells.`,
        actionProposal: {
          actionName: `Impute Missing with Mean`,
          description: `Fills missing cells in "${col}" using the numerical mean.`,
          isDestructive: false,
          tool: 'missing',
          action: 'fill',
          params: { column: col, strategy: 'mean' }
        }
      };
    }

    if (lower.includes('mode') || lower.includes('frequent')) {
      const col = targetCol || headers[0];
      return {
        understood: true,
        messageText: `I will find the most frequent value (mode) for column "${col}" and fill all missing cells.`,
        actionProposal: {
          actionName: `Impute Missing with Mode`,
          description: `Fills missing cells in "${col}" using the statistical mode.`,
          isDestructive: false,
          tool: 'missing',
          action: 'fill',
          params: { column: col, strategy: 'mode' }
        }
      };
    }

    // Default missing fill with zero or forward fill
    const col = targetCol || headers[0];
    return {
      understood: true,
      messageText: `I detected a missing data request for "${col}". I can fill the blanks with zero or previous values.`,
      actionProposal: {
        actionName: `Fill Missing with Zero`,
        description: `Replaces empty cells in "${col}" with 0.`,
        isDestructive: false,
        tool: 'missing',
        action: 'fill',
        params: { column: col, strategy: 'zero' }
      }
    };
  }

  // 3. Convert case (title case, uppercase, lowercase)
  if (lower.includes('case') || lower.includes('titlecase') || lower.includes('uppercase') || lower.includes('lowercase')) {
    const targetCol = findMatchingColumn(lower, headers) || headers.find(h => h.toLowerCase().includes('name')) || headers[0];
    let casing: 'title' | 'uppercase' | 'lowercase' | 'sentence' = 'title';

    if (lower.includes('upper')) casing = 'uppercase';
    else if (lower.includes('lower')) casing = 'lowercase';
    else if (lower.includes('sentence')) casing = 'sentence';

    return {
      understood: true,
      messageText: `I will format all text in column "${targetCol}" to ${casing} case and trim extraneous spaces.`,
      actionProposal: {
        actionName: `Convert to ${casing.toUpperCase()} Case`,
        description: `Applies ${casing} case standardization to all values in "${targetCol}".`,
        isDestructive: false,
        tool: 'text',
        action: 'casing',
        params: { column: targetCol, casing, trimExtraSpaces: true }
      }
    };
  }

  // 4. Outlier detection & unusual values
  if (lower.includes('outlier') || lower.includes('unusual') || lower.includes('anomaly') || lower.includes('extreme')) {
    const targetCol = findMatchingColumn(lower, headers) || headers.find(h => h.toLowerCase().includes('salary') || h.toLowerCase().includes('age')) || headers[0];

    return {
      understood: true,
      messageText: `I can run statistical outlier detection (IQR & Z-Score) on "${targetCol}". Note: As per safety policy, outliers will only be identified for your review and will never be removed without your explicit approval.`,
      actionProposal: {
        actionName: `Inspect Outliers in ${targetCol}`,
        description: `Flags values beyond the 1.5×IQR boundary or |z| > 2.5 in "${targetCol}" and opens the review drawer.`,
        isDestructive: false,
        tool: 'outliers',
        action: 'detect',
        params: { column: targetCol, method: 'IQR' }
      }
    };
  }

  // 5. Remove empty rows / columns
  if (lower.includes('empty') || lower.includes('blank')) {
    const isCol = lower.includes('col');
    return {
      understood: true,
      messageText: `I identified a request to eliminate completely empty ${isCol ? 'columns' : 'rows and columns'}.`,
      actionProposal: {
        actionName: `Remove Empty ${isCol ? 'Columns' : 'Rows and Columns'}`,
        description: `Removes records or columns where every single cell contains no value.`,
        isDestructive: true,
        tool: 'empty',
        action: 'clean_empty',
        params: { removeEmptyRows: true, removeEmptyCols: true }
      }
    };
  }

  // 6. Standardize date formats
  if (lower.includes('date') || lower.includes('standardize format')) {
    const targetCol = findMatchingColumn(lower, headers) || headers.find(h => h.toLowerCase().includes('date')) || headers[0];
    return {
      understood: true,
      messageText: `I will parse and standardize all dates in column "${targetCol}" into the ISO standard format (YYYY-MM-DD).`,
      actionProposal: {
        actionName: `Standardize Dates (ISO)`,
        description: `Converts varying date strings (e.g. DD/MM/YYYY, MM-DD-YYYY) in "${targetCol}" to clean YYYY-MM-DD.`,
        isDestructive: false,
        tool: 'dates',
        action: 'standardize',
        params: { column: targetCol, targetFormat: 'YYYY-MM-DD' }
      }
    };
  }

  // 7. Add columns / Math calculation (e.g. price and tax)
  if (lower.includes('add') || lower.includes('calculate') || lower.includes('formula') || lower.includes('plus')) {
    // Check if user mentions two columns
    let foundCols: string[] = [];
    headers.forEach(h => {
      if (lower.includes(h.toLowerCase().replace(/_/g, ' '))) {
        foundCols.push(h);
      }
    });

    if (foundCols.length >= 2) {
      const colA = foundCols[0];
      const colB = foundCols[1];
      const targetCol = `${colA}_plus_${colB}`;
      return {
        understood: true,
        messageText: `I will create a calculated column "${targetCol}" by adding "${colA}" and "${colB}".`,
        actionProposal: {
          actionName: `Calculate ${colA} + ${colB}`,
          description: `Performs element-wise addition between columns "${colA}" and "${colB}".`,
          isDestructive: false,
          tool: 'transform',
          action: 'math_add',
          params: { colA, colB, operator: '+', targetCol }
        }
      };
    }
  }

  // 8. Quality report / inspection
  if (lower.includes('quality') || lower.includes('report') || lower.includes('inspect') || lower.includes('score')) {
    return {
      understood: true,
      messageText: `I can run a full multi-dimensional Data Quality inspection across Completeness, Accuracy, Consistency, Uniqueness, Validity, and Integrity.`,
      actionProposal: {
        actionName: `Generate Quality Inspection Report`,
        description: `Calculates comprehensive quality scores, evaluates issues across 6 dimensions, and generates suggested actions.`,
        isDestructive: false,
        tool: 'quality',
        action: 'inspect',
        params: {}
      }
    };
  }

  // 9. Email validation
  if (lower.includes('email') || lower.includes('invalid email')) {
    const col = headers.find(h => h.toLowerCase().includes('email')) || 'Email';
    return {
      understood: true,
      messageText: `I will run validation checks to flag all malformed or invalid email addresses in "${col}".`,
      actionProposal: {
        actionName: `Validate Email Addresses`,
        description: `Flags non-RFC compliant email addresses in "${col}" for interactive correction.`,
        isDestructive: false,
        tool: 'validation',
        action: 'validate_email',
        params: { column: col }
      }
    };
  }

  // Fallback helpful guidance
  return {
    understood: false,
    messageText: `I understood your message, but didn't find a direct matching action. You can try commands like:
• "Remove duplicate customers"
• "Fill missing ages with the median"
• "Convert all names to title case"
• "Find unusual salary values"
• "Remove empty columns"
• "Standardize all date formats"
• "Generate a data quality report"
• "Find invalid email addresses"
Or choose a tool directly from the cleaning and transformation studio.`
  };
}
