import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';

export interface ExcelColumn {
  header: string;
  key: string;
  width?: number;
  type?: 'string' | 'number' | 'date' | 'boolean';
}

export interface ExcelExportOptions {
  filename: string;
  sheetName: string;
  columns: ExcelColumn[];
  data: any[];
}

export function exportToExcel(options: ExcelExportOptions) {
  const { filename, sheetName, columns, data } = options;

  // Create worksheet data
  const worksheetData = [];

  // Add headers
  const headers = columns.map(col => col.header);
  worksheetData.push(headers);

  // Add data rows
  data.forEach(item => {
    const row = columns.map(col => {
      const keys = col.key.split('.');
      let value = item;
      
      // Handle nested properties
      for (const key of keys) {
        value = value?.[key];
      }

      // Handle null/undefined
      if (value === null || value === undefined) {
        return '';
      }

      // Force string type for specific columns (like driver IDs)
      if (col.type === 'string') {
        // Prefix with apostrophe to force Excel to treat as text
        return `'${value}`;
      }

      // Format dates only if explicitly marked as date type
      if (col.type === 'date' || (value instanceof Date || (typeof value === 'string' && isValidDate(value) && !col.type))) {
        return format(new Date(value), 'yyyy-MM-dd HH:mm:ss');
      }

      return value;
    });
    worksheetData.push(row);
  });

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(worksheetData);

  // Set column widths
  const wscols = columns.map(col => ({ wch: col.width || 15 }));
  ws['!cols'] = wscols;

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // Generate Excel file
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

  // Save file
  const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
  saveAs(blob, `${filename}_${timestamp}.xlsx`);
}

function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

// Utility function to flatten nested objects
export function flattenObject(obj: any, prefix = ''): any {
  const flattened: any = {};

  Object.keys(obj).forEach(key => {
    const value = obj[key];
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (value && typeof value === 'object' && !(value instanceof Date) && !Array.isArray(value)) {
      Object.assign(flattened, flattenObject(value, newKey));
    } else {
      flattened[newKey] = value;
    }
  });

  return flattened;
}