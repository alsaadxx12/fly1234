/**
 * Utility functions
 */

/**
 * Format a number as currency
 * @param amount The amount to format
 * @param currency The currency code (e.g., 'USD', 'IQD')
 * @returns Formatted currency string
 */
export const formatCurrency = (amount: number, currency: string = 'IQD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount);
};

/**
 * Format a date string
 * @param date The date to format
 * @returns Formatted date string (e.g., 'DD/MM/YYYY')
 */
export const formatDate = (date: Date | string | number | undefined): string => {
  if (!date) return '-';
  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime())) return '-';
    return dateObj.toLocaleDateString('en-GB');
  } catch (error) {
    return '-';
  }
};

/**
 * Get initials from a name
 * @param name The name to get initials from
 * @returns The initials (e.g., 'John Doe' -> 'JD')
 */
export const getInitials = (name: string): string => {
  if (!name) return '';
  const names = name.split(' ');
  return names
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
};

/**
 * Convert a number to Arabic words
 * @param num The number to convert
 * @returns The number in Arabic words
 */
export const numberToArabicWords = (num: number): string => {
  if (num === 0) return "صفر";

  const units = ["", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة"];
  const teens = ["عشرة", "أحد عشر", "اثنا عشر", "ثلاثة عشر", "أربعة عشر", "خمسة عشر", "ستة عشر", "سبعة عشر", "ثمانية عشر", "تسعة عشر"];
  const tens = ["", "عشرة", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"];
  const hundreds = ["", "مائة", "مئتان", "ثلاثمائة", "أربعمائة", "خمسمائة", "ستمائة", "سبعمائة", "ثمانمائة", "تسعمائة"];
  
  const convert = (n: number): string => {
    if (n < 10) return units[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) return units[n % 10] + (n % 10 > 0 ? " و" : "") + tens[Math.floor(n / 10)];
    if (n < 1000) return hundreds[Math.floor(n / 100)] + (n % 100 > 0 ? " و" + convert(n % 100) : "");
    return "";
  };

  const parts = [];
  const billions = Math.floor(num / 1000000000);
  const millions = Math.floor((num % 1000000000) / 1000000);
  const thousands = Math.floor((num % 1000000) / 1000);
  const remainder = num % 1000;

  if (billions > 0) {
    parts.push(convert(billions) + " مليار");
  }
  if (millions > 0) {
    parts.push(convert(millions) + " مليون");
  }
  if (thousands > 0) {
    parts.push(convert(thousands) + " ألف");
  }
  if (remainder > 0) {
    parts.push(convert(remainder));
  }

  return parts.join(" و ");
};

/**
 * Get shift start and end times
 * @param employee The employee object which may contain shift, startTime, and endTime
 * @returns Object with start and end Date objects
 */
export const getShiftTimings = (employee?: { shift?: 'morning' | 'evening' | 'night' | string, startTime?: string, endTime?: string }) => {
  const now = new Date();
  const today = (d: Date) => new Date(now.getFullYear(), now.getMonth(), now.getDate(), d.getHours(), d.getMinutes());

  if (employee?.startTime && employee?.endTime) {
    const [startH, startM] = employee.startTime.split(':').map(Number);
    const [endH, endM] = employee.endTime.split(':').map(Number);
    
    let startDate = today(new Date(0, 0, 0, startH, startM));
    let endDate = today(new Date(0, 0, 0, endH, endM));
    
    // Handle overnight shifts
    if (endDate < startDate) {
      endDate.setDate(endDate.getDate() + 1);
    }
    
    return { start: startDate, end: endDate };
  }

  // Fallback to shift presets if startTime/endTime are not available
  switch (employee?.shift) {
    case 'morning':
      return { start: today(new Date(0, 0, 0, 9, 0)), end: today(new Date(0, 0, 0, 17, 0)) }; // 9 AM - 5 PM
    case 'evening':
      return { start: today(new Date(0, 0, 0, 17, 0)), end: today(new Date(0, 0, 1, 1, 0)) }; // 5 PM - 1 AM
    case 'night':
      return { start: today(new Date(0, 0, 0, 1, 0)), end: today(new Date(0, 0, 0, 9, 0)) }; // 1 AM - 9 AM
    default:
      return { start: today(new Date(0, 0, 0, 9, 0)), end: today(new Date(0, 0, 0, 17, 0)) }; // Default to morning shift
  }
};
