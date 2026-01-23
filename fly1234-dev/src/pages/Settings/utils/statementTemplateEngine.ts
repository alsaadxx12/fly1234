export interface StatementData {
  // Account Summary
  summary: {
    from: string;
    to: string;
    previousBalance: string;
    totalCredit: string;
    totalDebit: string;
    balanceDue: string;
    currency: string;
  };
  
  // User Info
  user: {
    name: string;
    email: string;
    mobile: string;
  };
  
  // Company Info
  company: {
    logoUrl: string;
    name: string;
    address: string;
  };
  
  // Transactions
  transactions: Array<{
    no: string;
    date: string;
    pnr: string;
    booking_id: string;
    details: string;
    type: string;
    debit_iqd: string;
    debit_usd: string;
    credit_iqd: string;
    credit_usd: string;
    balance_iqd: string;
    invoice_no: string;
  }>;
}

/**
 * Replaces simple template variables like {{variable.path}}
 */
function replaceSimpleVariables(template: string, data: StatementData): string {
  let result = template;
  
  // Replace nested object properties
  const variableRegex = /\{\{([^}]+)\}\}/g;
  
  result = result.replace(variableRegex, (match, path) => {
    const trimmedPath = path.trim();
    const parts = trimmedPath.split('.');
    
    let value: any = data;
    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part as keyof typeof value];
      } else {
        return ''; // Variable not found
      }
    }
    
    return value !== undefined && value !== null ? String(value) : '';
  });
  
  return result;
}

/**
 * Processes {{#each transactions}}...{{/each}} loops
 */
function processEachLoops(template: string, data: StatementData): string {
  let result = template;
  
  // Process {{#each transactions}}...{{/each}}
  const eachRegex = /\{\{#each\s+transactions\}\}([\s\S]*?)\{\{\/each\}\}/g;
  
  result = result.replace(eachRegex, (match, loopContent) => {
    if (!data.transactions || data.transactions.length === 0) {
      return '';
    }
    
    return data.transactions.map((transaction) => {
      let itemContent = loopContent;
      
      // Process {{#if (eq type 'DT-ISSUE')}}...{{/if}} in transaction context
      // Must process BEFORE replacing variables to check actual transaction values
      const eqIfRegex = /\{\{#if\s+\(eq\s+([^)]+)\)\}\}([\s\S]*?)\{\{\/if\}\}/g;
      itemContent = itemContent.replace(eqIfRegex, (match, condition, content) => {
        const eqMatch = condition.match(/eq\s+(\w+)\s+['"]([^'"]+)['"]/);
        if (eqMatch) {
          const [, varName, expectedValue] = eqMatch;
          const actualValue = transaction[varName as keyof typeof transaction];
          if (String(actualValue) === expectedValue) {
            return content;
          }
          return '';
        }
        return match;
      });
      
      // Replace transaction properties FIRST
      const transactionVars = [
        'no', 'date', 'pnr', 'booking_id', 'details', 'type',
        'debit_iqd', 'debit_usd', 'credit_iqd', 'credit_usd',
        'balance_iqd', 'invoice_no'
      ];
      
      transactionVars.forEach((prop) => {
        const regex = new RegExp(`\\{\\{${prop}\\}\\}`, 'g');
        const value = transaction[prop as keyof typeof transaction] || '';
        itemContent = itemContent.replace(regex, String(value));
      });
      
      // Replace {{@index}} with transaction index
      itemContent = itemContent.replace(/\{\{@index\}\}/g, (match, offset) => {
        const index = data.transactions.indexOf(transaction);
        return String(index + 1);
      });
      
      // Process nested {{#if variable}}...{{/if}} AFTER replacing variables
      // This handles cases like {{#if debit_iqd}}...{{/if}} where debit_iqd was already replaced
      const nestedIfRegex = /\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
      let processedContent = itemContent;
      let maxIterations = 10;
      while (maxIterations > 0) {
        const before = processedContent;
        processedContent = processedContent.replace(nestedIfRegex, (match, condition, content) => {
          // Skip if it's an eq condition (already handled)
          if (condition.includes('eq') || condition.includes('(')) {
            return match;
          }
          
          const trimmedCondition = condition.trim();
          // Get value from transaction
          const value = transaction[trimmedCondition as keyof typeof transaction];
          
          // Check if value is truthy (not undefined, null, empty, '0', or '-')
          const isTruthy = value !== undefined && 
                          value !== null && 
                          value !== '' && 
                          String(value) !== '0' && 
                          String(value) !== '-' &&
                          String(value).trim() !== '';
          return isTruthy ? content : '';
        });
        
        if (before === processedContent) break;
        maxIterations--;
      }
      itemContent = processedContent;
      
      return itemContent;
    }).join('');
  });
  
  return result;
}

/**
 * Processes conditional blocks like {{#if condition}}...{{/if}}
 */
function processConditionals(template: string, data: StatementData): string {
  let result = template;
  
  // Process {{#if (eq variable value)}}...{{/if}} - equality check
  const eqIfRegex = /\{\{#if\s+\(eq\s+([^)]+)\)\}\}([\s\S]*?)\{\{\/if\}\}/g;
  result = result.replace(eqIfRegex, (match, condition, content) => {
    // Parse eq condition: eq type 'DT-ISSUE'
    const eqMatch = condition.match(/eq\s+(\w+)\s+['"]([^'"]+)['"]/);
    if (eqMatch) {
      const [, varName, expectedValue] = eqMatch;
      // In transaction loop context, we'll handle this in processEachLoops
      return match; // Keep as is, will be processed in loop
    }
    return match;
  });
  
  // Process {{#if variable}}...{{/if}}
  const ifRegex = /\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
  
  result = result.replace(ifRegex, (match, condition, content) => {
    // Skip if it's an eq condition (already handled)
    if (condition.includes('eq')) {
      return match;
    }
    
    const trimmedCondition = condition.trim();
    const parts = trimmedCondition.split('.');
    
    let value: any = data;
    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part as keyof typeof value];
      } else {
        return ''; // Condition is false
      }
    }
    
    // Check if value is truthy
    const isTruthy = value !== undefined && value !== null && value !== '' && value !== '0' && value !== 0;
    return isTruthy ? content : '';
  });
  
  return result;
}

/**
 * Main function to process template and replace all variables
 */
export function replaceTemplateVariables(template: string, data: StatementData): string {
  let result = template;
  
  // Process loops first (they may contain variables)
  result = processEachLoops(result, data);
  
  // Process conditionals
  result = processConditionals(result, data);
  
  // Replace simple variables
  result = replaceSimpleVariables(result, data);
  
  return result;
}

/**
 * Generates complete HTML document from template
 */
export function generateStatementHTML(template: string, data: StatementData): string {
  // Process the template
  const processedHTML = replaceTemplateVariables(template, data);
  
  // Wrap in complete HTML document if not already wrapped
  if (processedHTML.includes('<!DOCTYPE') || processedHTML.includes('<html')) {
    return processedHTML;
  }
  
  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>كشف الحساب</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Tajawal', sans-serif;
      direction: rtl;
      text-align: right;
    }
    
    @media print {
      @page {
        size: A4;
        margin: 1cm;
      }
      
      body {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
      
      .no-print {
        display: none !important;
      }
      
      .page-break {
        page-break-after: always;
      }
    }
  </style>
</head>
<body>
  ${processedHTML}
</body>
</html>`;
}
