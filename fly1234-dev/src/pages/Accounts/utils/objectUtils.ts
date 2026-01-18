/**
 * Utility functions for object operations
 */

/**
 * Deep comparison of two objects
 * @param obj1 First object to compare
 * @param obj2 Second object to compare
 * @returns True if objects are deeply equal, false otherwise
 */
export function deepEqual(obj1: any, obj2: any): boolean {
  // If either is null/undefined, check if they're the same
  if (obj1 === obj2) return true;
  
  // If either is null/undefined but not both (since we checked equality above)
  if (obj1 == null || obj2 == null) return false;
  
  // If either is not an object
  if (typeof obj1 !== 'object' || typeof obj2 !== 'object') return obj1 === obj2;
  
  // Get keys of both objects
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  
  // If different number of keys
  if (keys1.length !== keys2.length) return false;
  
  // Check each key recursively
  for (const key of keys1) {
    if (!keys2.includes(key)) return false;
    if (!deepEqual(obj1[key], obj2[key])) return false;
  }
  
  return true;
}

/**
 * Format a value for display based on its type and field name
 * @param field Field name
 * @param value Value to format
 * @param currency Optional currency for monetary values
 * @returns Formatted value as string
 */
export function formatValueForDisplay(field: string, value: any, currency?: string): string {
  if (value === null || value === undefined) return '-';
  
  // Format boolean values for settlement and confirmation
  if (field === 'settlement' || field === 'confirmation') {
    return value === true ? 'مفعل' : 'غير مفعل';
  }
  
  // Format monetary values
  if (['amount', 'gates', 'internal', 'external', 'fly'].includes(field)) {
    const numValue = typeof value === 'number' ? value : parseFloat(value);
    if (!isNaN(numValue) && numValue !== null && numValue !== undefined) {
      return `${numValue.toLocaleString()} ${currency === 'USD' ? '$' : 'د.ع'}`;
    }
    return '0';
  }
  
  // Format exchange rate
  if (field === 'exchangeRate') {
    const numValue = typeof value === 'number' ? value : parseFloat(value);
    if (!isNaN(numValue) && numValue !== null && numValue !== undefined) {
      return `${numValue.toLocaleString()} د.ع`;
    }
    return '0 د.ع';
  }
  
  // Format currency
  if (field === 'currency') {
    return value === 'USD' ? 'دولار أمريكي' : 'دينار عراقي';
  }
  
  // Format status
  if (field === 'status') {
    const statusMap: Record<string, string> = {
      'pending': 'قيد الانتظار',
      'confirmed': 'مؤكد',
      'settled': 'تمت التسوية',
      'cancelled': 'ملغي'
    };
    return statusMap[value] || value.toString();
  }
  
  // Format dates
  if (field.toLowerCase().includes('date') || field.toLowerCase().includes('at')) {
    try {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('en-GB') + ' ' + date.toLocaleTimeString('en-GB');
      }
    } catch (e) {
      // If date parsing fails, return as string
    }
  }
  
  // Default: return as string
  return value.toString();
}