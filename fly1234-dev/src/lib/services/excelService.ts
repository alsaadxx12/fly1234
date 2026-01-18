import readXlsxFile from 'read-excel-file';

// Debug flag for detailed logging
const DEBUG = true;

/**
 * Cleans a string by removing problematic characters
 * @param str Any value to clean and convert to string
 * @returns The cleaned string or empty string if input is null/undefined
 */
export function cleanString(str: any): string {
  if (str === null || str === undefined) return '';
  
  // Convert to string and handle non-string types 
  const stringValue = String(str);
  
  return stringValue
    .replace(/\r/g, '') // Remove carriage returns
    .replace(/x000D/gi, '') // Remove x000D representations
    .replace(/__+/g, '_') // Replace multiple underscores with a single one
    .replace(/^_+|_+$/g, '') // Remove leading and trailing underscores
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
    .trim();
}

/**
 * Reads an Excel file and returns the data with cleaned strings
 * @param file The Excel file to read
 * @returns A promise that resolves to the cleaned data as a 2D array
 */
export const readExcelFile = async (file: File): Promise<any[][]> => {
  try {
    // Read the file with the library
    const rows = await readXlsxFile(file, { 
      sheet: 1,  // Read first sheet
      trim: true // Trim whitespace
    });
    console.log('Raw Excel data:', JSON.stringify(rows));
    
    // Process the rows to clean all string values and ensure consistent structure
    const cleanedRows = rows.map(row => {
      // Ensure we have at least 3 columns
      const paddedRow = [...row];
      while (paddedRow.length < 3) {
        paddedRow.push('');
      }
      
      // Clean each cell
      return paddedRow.map(cell => {
        if (cell === null || cell === undefined) {
          return '';
        }
        return typeof cell === 'string' ? cleanString(cell) : String(cell);
      });
    });
    
    if (DEBUG) console.log('Cleaned Excel data:', JSON.stringify(cleanedRows));
    
    console.log('Cleaned Excel data:', JSON.stringify(cleanedRows));
    return cleanedRows;
  } catch (error) {
    console.error('Error reading Excel file:', error);
    throw new Error('فشل في قراءة ملف الإكسل. تأكد من أن الملف بتنسيق Excel صحيح (.xlsx)');
  }
};

/**
 * Validates an Excel file before processing
 * @param file The file to validate
 * @returns An object with validation result and error message if any
 */
export const validateExcelFile = (file: File): { valid: boolean; error?: string } => {
  // Check file type and extension
  const validTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx 
    'application/vnd.ms-excel', // .xls
    'text/csv', // .csv
    'application/octet-stream', // Some systems use this for Excel files
    '' // Some browsers might not provide a type
  ];
  
  const validExtensions = ['.xlsx', '.xls', '.csv'];
  const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
  
  if (DEBUG) {
    console.log('Validating file:', file.name, file.type);
    console.log('File extension:', fileExtension);
  }

  if (!validTypes.includes(file.type) && !validExtensions.some(ext => file.name.toLowerCase().endsWith(ext))) {
    return { 
      valid: false, 
      error: 'نوع الملف غير صالح. يرجى استخدام ملف Excel (.xlsx, .xls) أو CSV (.csv)' 
    };
  }
  
  // Check file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    return { 
      valid: false, 
      error: 'حجم الملف كبير جدًا. الحد الأقصى هو 5 ميجابايت' 
    };
  }
  
  return { valid: true };
};

/**
 * Creates a CSV template for company imports
 * @returns The CSV content as a string
 */
export const createCompanyTemplate = (): string => { 
  return `اسم الشركة,معرف الشركة,نوع التعامل
شركة النور للتجارة العامة,COMP001,نقدي
شركة الأمل للمقاولات,COMP002,آجل
شركة الفرات للتجارة,COMP003,نقدي
شركة السلام للمقاولات,COMP004,آجل
`;
};

/**
 * Downloads a file with the given content
 * @param content The content of the file
 * @param filename The name of the file
 * @param mimeType The MIME type of the file
 */
export const downloadFile = (content: string, filename: string, mimeType: string = 'text/csv;charset=utf-8;') => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};