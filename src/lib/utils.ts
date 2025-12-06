import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Bank code mappings
const BANK_CODE_MAP: Record<string, string> = {
  "maybank": "MBB",
  "malayan banking": "MBB",
  "mbb": "MBB",
  "public bank": "PBB",
  "public bank berhad": "PBB",
  "pbb": "PBB",
  "cimb": "CIMB",
  "cimb bank": "CIMB",
  "rhb": "RHB",
  "rhb bank": "RHB",
  "hong leong": "HLB",
  "hong leong bank": "HLB",
  "hlb": "HLB",
  "ambank": "AMB",
  "amb": "AMB",
  "bank islam": "BIMB",
  "bimb": "BIMB",
  "bank rakyat": "BKRM",
  "affin bank": "AFBB",
  "uob": "UOB",
  "ocbc": "OCBC",
  "hsbc": "HSBC",
  "standard chartered": "SCB",
};

// Normalize date to YYYY-MM-DD format
export function normalizeDate(value: string): { normalized: string; changed: boolean } {
  if (!value) return { normalized: value, changed: false };
  
  const original = value.trim();
  
  // Already in YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(original)) {
    return { normalized: original, changed: false };
  }
  
  // DD-MM-YYYY or DD/MM/YYYY
  const ddmmyyyy = original.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy;
    const normalized = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    return { normalized, changed: normalized !== original };
  }
  
  // MM/DD/YYYY (US format)
  const mmddyyyy = original.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mmddyyyy) {
    const [, month, day, year] = mmddyyyy;
    // Assume MM/DD/YYYY if month <= 12 and day > 12
    if (parseInt(month) <= 12 && parseInt(day) > 12) {
      const normalized = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      return { normalized, changed: normalized !== original };
    }
  }
  
  return { normalized: original, changed: false };
}

// Normalize amount to decimal format (e.g., "5000.00")
export function normalizeAmount(value: string): { normalized: string; changed: boolean } {
  if (!value) return { normalized: value, changed: false };
  
  const original = value.trim();
  
  // Remove currency symbols and whitespace
  let cleaned = original
    .replace(/^(rm|RM|MYR|myr)\s*/i, '')
    .replace(/\s+/g, '')
    .replace(/,/g, '');
  
  // Parse as number and format to 2 decimal places
  const num = parseFloat(cleaned);
  if (!isNaN(num)) {
    const normalized = num.toFixed(2);
    return { normalized, changed: normalized !== original };
  }
  
  return { normalized: original, changed: false };
}

// Normalize account number to use dashes consistently
export function normalizeAccountNumber(value: string): { normalized: string; changed: boolean } {
  if (!value) return { normalized: value, changed: false };
  
  const original = value.trim();
  
  // Remove all non-digit characters
  const digitsOnly = original.replace(/\D/g, '');
  
  // Format based on length - standardize to 4-4-4 groups
  let normalized: string;
  if (digitsOnly.length === 16) {
    // Format as 4-4-4-4
    normalized = `${digitsOnly.slice(0, 4)}-${digitsOnly.slice(4, 8)}-${digitsOnly.slice(8, 12)}-${digitsOnly.slice(12, 16)}`;
  } else if (digitsOnly.length === 12) {
    // Format as 4-4-4
    normalized = `${digitsOnly.slice(0, 4)}-${digitsOnly.slice(4, 8)}-${digitsOnly.slice(8, 12)}`;
  } else if (digitsOnly.length === 10) {
    // Format as 4-3-3
    normalized = `${digitsOnly.slice(0, 4)}-${digitsOnly.slice(4, 7)}-${digitsOnly.slice(7, 10)}`;
  } else if (digitsOnly.length === 9) {
    // Format as 3-3-3
    normalized = `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6, 9)}`;
  } else {
    // Keep original format but ensure dashes
    normalized = original.replace(/[\/\s]/g, '-');
  }
  
  return { normalized, changed: normalized !== original };
}

// Get human-readable format description for a column
export function getFormatDescription(columnKey: string): string {
  switch (columnKey) {
    case 'date':
      return 'YYYY-MM-DD';
    case 'amount':
      return '0000.00 (no currency symbol)';
    case 'accountNumber':
      return '0000-0000-0000';
    case 'bank':
      return '3-letter code (e.g. MBB, PBB)';
    case 'name':
      return 'Title Case';
    default:
      return '';
  }
}

// Get format example for a column
export function getFormatExample(columnKey: string): { before: string; after: string } | null {
  switch (columnKey) {
    case 'date':
      return { before: '15-03-2024', after: '2024-03-15' };
    case 'amount':
      return { before: 'RM 5,000', after: '5000.00' };
    case 'accountNumber':
      return { before: '1234567890', after: '1234-5678-90' };
    case 'bank':
      return { before: 'maybank', after: 'MBB' };
    case 'name':
      return { before: 'mr. ali ahmad', after: 'Ali Ahmad' };
    default:
      return null;
  }
}

// Normalize bank code to standard abbreviation
export function normalizeBankCode(value: string): { normalized: string; changed: boolean } {
  if (!value) return { normalized: value, changed: false };
  
  const original = value.trim();
  const lowerValue = original.toLowerCase();
  
  // Check if it matches a known bank
  const normalized = BANK_CODE_MAP[lowerValue] || original.toUpperCase();
  
  return { normalized, changed: normalized !== original };
}

// Normalize name (capitalize properly)
export function normalizeName(value: string): { normalized: string; changed: boolean } {
  if (!value) return { normalized: value, changed: false };
  
  const original = value.trim();
  
  // Remove titles like Mr., Mrs., etc.
  let cleaned = original
    .replace(/^(mr\.?|mrs\.?|ms\.?|dr\.?|prof\.?)\s+/i, '');
  
  // Capitalize each word
  const normalized = cleaned
    .split(' ')
    .map(word => {
      // Handle special cases like "bin", "binti", "Sdn", "Bhd"
      const lower = word.toLowerCase();
      if (['bin', 'binti', 'bte', 'b.'].includes(lower)) {
        return lower;
      }
      if (['sdn', 'bhd', 'plt', 'llp'].includes(lower)) {
        return word.toUpperCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
  
  return { normalized, changed: normalized !== original };
}

// Auto-format a value based on column type
export function autoFormat(value: string, columnKey: string): { normalized: string; changed: boolean } {
  switch (columnKey) {
    case 'date':
      return normalizeDate(value);
    case 'amount':
      return normalizeAmount(value);
    case 'accountNumber':
      return normalizeAccountNumber(value);
    case 'bank':
      return normalizeBankCode(value);
    case 'name':
      return normalizeName(value);
    default:
      return { normalized: value, changed: false };
  }
}
