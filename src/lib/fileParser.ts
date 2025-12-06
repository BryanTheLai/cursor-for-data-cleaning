import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { log } from './logger';

export interface ParsedFile {
  headers: string[];
  rows: Record<string, string>[];
  fileName: string;
  rowCount: number;
}

export async function parseFile(file: File): Promise<ParsedFile> {
  const fileName = file.name;
  const extension = fileName.split('.').pop()?.toLowerCase();
  
  log.import.info('Parsing file', { fileName, extension, size: file.size });

  if (extension === 'csv') {
    return parseCSV(file, fileName);
  } else if (extension === 'xlsx' || extension === 'xls') {
    return parseExcel(file, fileName);
  } else {
    throw new Error(`Unsupported file type: ${extension}`);
  }
}

async function parseCSV(file: File, fileName: string): Promise<ParsedFile> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields || [];
        const rows = results.data as Record<string, string>[];
        
        log.import.info('CSV parsed', { 
          headerCount: headers.length, 
          rowCount: rows.length,
          headers 
        });

        resolve({
          headers,
          rows,
          fileName,
          rowCount: rows.length,
        });
      },
      error: (error) => {
        log.import.error('CSV parse failed', { error: error.message });
        reject(new Error(`CSV parse error: ${error.message}`));
      },
    });
  });
}

async function parseExcel(file: File, fileName: string): Promise<ParsedFile> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  
  const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet, {
    defval: '',
    raw: false,
  });

  if (jsonData.length === 0) {
    throw new Error('Excel file is empty');
  }

  const headers = Object.keys(jsonData[0]);
  
  log.import.info('Excel parsed', { 
    sheetName: firstSheetName,
    headerCount: headers.length, 
    rowCount: jsonData.length,
    headers 
  });

  return {
    headers,
    rows: jsonData,
    fileName,
    rowCount: jsonData.length,
  };
}

export function getSampleRows(rows: Record<string, string>[], count: number = 5): Record<string, string>[] {
  return rows.slice(0, count);
}




