import { log } from './logger';

export type FieldType = 'string' | 'number' | 'date' | 'phone' | 'enum' | 'boolean';

export interface FieldConstraint {
  type: 'required' | 'unique' | 'computed' | 'pattern' | 'minLength' | 'maxLength' | 'min' | 'max';
  config?: {
    message?: string;
    level?: 'error' | 'warn';
    pattern?: string;
    min?: number;
    max?: number;
  };
}

export interface EnumOption {
  value: string;
  label: string;
  aliases?: string[];
}

export interface FieldRule {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  format?: string;
  constraints?: FieldConstraint[];
  config?: {
    decimalPlaces?: number;
    allowCustom?: boolean;
    options?: EnumOption[];
    dateFormat?: string;
    phoneCountry?: string;
  };
  transform?: (value: string) => { value: string; changed: boolean; message?: string };
  validate?: (value: string, rowData?: Record<string, string>) => ValidationResult;
}

export interface ValidationResult {
  valid: boolean;
  message?: string;
  severity?: 'yellow' | 'red';
  suggestion?: string;
  confidence?: number;
}

export interface RuleSet {
  name: string;
  fields: FieldRule[];
}

export interface RuleConfig {
  id: string;
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  enabled: boolean;
  format?: string;
  options?: EnumOption[];
}

const MALAYSIAN_BANK_CODES: EnumOption[] = [
  { value: 'MBB', label: 'Maybank', aliases: ['maybank', 'maybank berhad', 'malayan banking'] },
  { value: 'CIMB', label: 'CIMB Bank', aliases: ['cimb', 'cimb bank', 'cimb bank berhad'] },
  { value: 'PBB', label: 'Public Bank', aliases: ['public bank', 'public bank berhad', 'pbb'] },
  { value: 'RHB', label: 'RHB Bank', aliases: ['rhb', 'rhb bank', 'rhb bank berhad'] },
  { value: 'HLB', label: 'Hong Leong Bank', aliases: ['hong leong', 'hong leong bank', 'hlb', 'hlbb'] },
  { value: 'AMB', label: 'AmBank', aliases: ['ambank', 'am bank', 'ambank berhad'] },
  { value: 'BIMB', label: 'Bank Islam', aliases: ['bank islam', 'bimb', 'bank islam malaysia'] },
  { value: 'BSN', label: 'BSN', aliases: ['bsn', 'bank simpanan nasional'] },
  { value: 'OCBC', label: 'OCBC Bank', aliases: ['ocbc', 'ocbc bank'] },
  { value: 'UOB', label: 'UOB Bank', aliases: ['uob', 'uob bank', 'united overseas bank'] },
  { value: 'HSBC', label: 'HSBC Bank', aliases: ['hsbc', 'hsbc bank'] },
  { value: 'SCB', label: 'Standard Chartered', aliases: ['standard chartered', 'scb', 'stanchart'] },
];

export const DEFAULT_RULE_CONFIG: RuleConfig[] = [
  { id: '1', key: 'name', label: 'Payee Name', type: 'string', required: true, enabled: true, format: 'Title Case' },
  { id: '2', key: 'amount', label: 'Amount (RM)', type: 'number', required: true, enabled: true, format: '0000.00 (no currency)' },
  { id: '3', key: 'accountNumber', label: 'Account Number', type: 'string', required: true, enabled: true, format: 'Digits only (no dashes)' },
  { id: '4', key: 'bank', label: 'Bank Code', type: 'enum', required: false, enabled: true, format: '3-letter code (MBB, PBB)', options: MALAYSIAN_BANK_CODES },
  { id: '5', key: 'phone', label: 'Phone Number', type: 'phone', required: false, enabled: true, format: '+60XXXXXXXXX' },
  { id: '6', key: 'date', label: 'Date', type: 'date', required: false, enabled: true, format: 'YYYY-MM-DD' },
];

function normalizeString(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, ' ');
}

function matchEnum(value: string, options: EnumOption[]): EnumOption | null {
  const normalized = normalizeString(value);
  
  for (const opt of options) {
    if (normalizeString(opt.value) === normalized || normalizeString(opt.label) === normalized) {
      return opt;
    }
    if (opt.aliases?.some(alias => normalizeString(alias) === normalized)) {
      return opt;
    }
  }
  return null;
}

function transformName(value: string): { value: string; changed: boolean; message?: string } {
  if (!value) return { value: '', changed: false };
  
  const original = value;
  let transformed = value
    .replace(/^(mr\.?|mrs\.?|ms\.?|dr\.?|prof\.?)\s+/i, '')
    .trim();
  
  transformed = transformed
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
  const changed = transformed !== original;
  return {
    value: transformed,
    changed,
    message: changed ? 'Capitalized and removed titles' : undefined,
  };
}

function transformAmount(value: string): { value: string; changed: boolean; message?: string } {
  if (!value) return { value: '', changed: false };
  
  const original = value;
  let cleaned = value.replace(/[rRmMyYrR\$€£¥]/g, '').trim();
  cleaned = cleaned.replace(/,/g, '');
  cleaned = cleaned.replace(/\s/g, '');
  
  const num = parseFloat(cleaned);
  if (isNaN(num)) {
    return { value: original, changed: false };
  }
  
  const transformed = num.toFixed(2);
  const changed = transformed !== original;
  
  return {
    value: transformed,
    changed,
    message: changed ? 'Removed currency symbol, standardized decimal places' : undefined,
  };
}

function transformAccountNumber(value: string): { value: string; changed: boolean; message?: string } {
  if (!value) return { value: '', changed: false };
  
  const original = value;
  const digitsOnly = value.replace(/[\s\-\.]/g, '');
  
  if (!/^\d+$/.test(digitsOnly)) {
    return { value: original, changed: false };
  }
  
  const changed = digitsOnly !== original;
  
  return {
    value: digitsOnly,
    changed,
    message: changed ? 'Removed dashes/spaces - digits only' : undefined,
  };
}

function transformBankCode(value: string): { value: string; changed: boolean; message?: string } {
  if (!value) return { value: '', changed: false };
  
  const match = matchEnum(value, MALAYSIAN_BANK_CODES);
  if (match) {
    const changed = match.value !== value;
    return {
      value: match.value,
      changed,
      message: changed ? `Normalized bank code: ${value} → ${match.value}` : undefined,
    };
  }
  
  return { value, changed: false };
}

function transformDate(value: string): { value: string; changed: boolean; message?: string } {
  if (!value) return { value: '', changed: false };
  
  const original = value;
  
  const ddmmyyyy = value.match(/^(\d{1,2})[-\/\.](\d{1,2})[-\/\.](\d{4})$/);
  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy;
    const transformed = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    return {
      value: transformed,
      changed: true,
      message: 'Converted DD/MM/YYYY to YYYY-MM-DD',
    };
  }
  
  const yyyymmdd = value.match(/^(\d{4})[-\/\.](\d{1,2})[-\/\.](\d{1,2})$/);
  if (yyyymmdd) {
    const [, year, month, day] = yyyymmdd;
    const transformed = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    return {
      value: transformed,
      changed: transformed !== original,
      message: transformed !== original ? 'Standardized date format' : undefined,
    };
  }
  
  const parsed = new Date(value);
  if (!isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    const transformed = `${year}-${month}-${day}`;
    return {
      value: transformed,
      changed: transformed !== original,
      message: 'Parsed and formatted date',
    };
  }
  
  return { value: original, changed: false };
}

function transformPhone(value: string, country: string = 'MY'): { value: string; changed: boolean; message?: string } {
  if (!value) return { value: '', changed: false };
  
  const original = value;
  let cleaned = value.replace(/[\s\-\(\)\.]/g, '');
  
  if (cleaned.startsWith('+')) {
    return { value: cleaned, changed: cleaned !== original, message: cleaned !== original ? 'Cleaned phone format' : undefined };
  }
  
  const countryCodes: Record<string, string> = {
    MY: '+60',
    SG: '+65',
    ID: '+62',
    US: '+1',
  };
  
  const code = countryCodes[country] || '+60';
  
  if (cleaned.startsWith('0')) {
    cleaned = code + cleaned.slice(1);
  } else if (/^\d{9,}$/.test(cleaned)) {
    cleaned = code + cleaned;
  }
  
  return {
    value: cleaned,
    changed: cleaned !== original,
    message: cleaned !== original ? `Formatted to ${country} phone number` : undefined,
  };
}

function validateRequired(value: string): ValidationResult {
  if (!value || value.trim() === '') {
    return {
      valid: false,
      message: 'This field is required',
      severity: 'red',
    };
  }
  return { valid: true };
}

function validateAccountNumber(value: string): ValidationResult {
  if (!value) return { valid: true };
  
  const digitsOnly = value.replace(/[\s\-]/g, '');
  
  if (!/^\d+$/.test(digitsOnly)) {
    return {
      valid: false,
      message: 'Account number must contain only digits',
      severity: 'red',
    };
  }
  
  if (digitsOnly.length < 10 || digitsOnly.length > 16) {
    return {
      valid: false,
      message: 'Account number must be 10-16 digits',
      severity: 'yellow',
    };
  }
  
  return { valid: true };
}

function validateAmount(value: string): ValidationResult {
  if (!value) return { valid: true };
  
  const num = parseFloat(value);
  
  if (isNaN(num)) {
    return {
      valid: false,
      message: 'Invalid amount format',
      severity: 'red',
    };
  }
  
  if (num <= 0) {
    return {
      valid: false,
      message: 'Amount must be positive',
      severity: 'red',
    };
  }
  
  if (num > 50000) {
    return {
      valid: true,
      message: 'High value transaction >RM50,000 - requires BNM approval',
      severity: 'yellow',
    };
  }
  
  return { valid: true };
}

export const PAYROLL_RULES: RuleSet = {
  name: 'Malaysian Payroll',
  fields: [
    {
      key: 'name',
      label: 'Payee Name',
      type: 'string',
      required: true,
      constraints: [
        { type: 'required', config: { message: 'Payee name is required', level: 'error' } },
        { type: 'minLength', config: { min: 2, message: 'Name too short' } },
      ],
      transform: transformName,
      validate: (value) => {
        if (!value) return validateRequired(value);
        if (value.length < 2) {
          return { valid: false, message: 'Name is too short', severity: 'yellow' };
        }
        return { valid: true };
      },
    },
    {
      key: 'amount',
      label: 'Amount (RM)',
      type: 'number',
      required: true,
      config: { decimalPlaces: 2 },
      transform: transformAmount,
      validate: validateAmount,
    },
    {
      key: 'accountNumber',
      label: 'Account Number',
      type: 'string',
      required: true,
      transform: transformAccountNumber,
      validate: validateAccountNumber,
    },
    {
      key: 'bank',
      label: 'Bank Code',
      type: 'enum',
      required: false,
      config: {
        options: MALAYSIAN_BANK_CODES,
        allowCustom: false,
      },
      transform: transformBankCode,
      validate: (value) => {
        if (!value) return { valid: true };
        const match = matchEnum(value, MALAYSIAN_BANK_CODES);
        if (!match) {
          return {
            valid: false,
            message: 'Unknown bank code',
            severity: 'yellow',
          };
        }
        return { valid: true };
      },
    },
    {
      key: 'date',
      label: 'Date',
      type: 'date',
      required: false,
      config: { dateFormat: 'YYYY-MM-DD' },
      transform: transformDate,
      validate: (value) => {
        if (!value) return { valid: true };
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(value)) {
          return {
            valid: false,
            message: 'Date must be in YYYY-MM-DD format',
            severity: 'yellow',
          };
        }
        return { valid: true };
      },
    },
    {
      key: 'phone',
      label: 'Phone Number',
      type: 'phone',
      required: false,
      config: { phoneCountry: 'MY' },
      transform: (value) => transformPhone(value, 'MY'),
      validate: (value) => {
        if (!value) return { valid: true };
        const phoneRegex = /^\+\d{10,15}$/;
        if (!phoneRegex.test(value.replace(/[\s\-]/g, ''))) {
          return {
            valid: false,
            message: 'Invalid phone number format',
            severity: 'yellow',
          };
        }
        return { valid: true };
      },
    },
  ],
};

export function processRowWithRules(
  rowData: Record<string, string>,
  ruleSet: RuleSet
): {
  cleaned: Record<string, string>;
  changes: Array<{ column: string; original: string; cleaned: string; reason: string }>;
  errors: Array<{ column: string; message: string; severity: 'yellow' | 'red'; suggestion?: string; confidence?: number }>;
} {
  const cleaned: Record<string, string> = { ...rowData };
  const changes: Array<{ column: string; original: string; cleaned: string; reason: string }> = [];
  const errors: Array<{ column: string; message: string; severity: 'yellow' | 'red'; suggestion?: string; confidence?: number }> = [];

  for (const field of ruleSet.fields) {
    const originalValue = rowData[field.key] || '';
    let currentValue = originalValue;

    if (field.transform) {
      const result = field.transform(currentValue);
      if (result.changed) {
        currentValue = result.value;
        changes.push({
          column: field.key,
          original: originalValue,
          cleaned: currentValue,
          reason: result.message || 'Auto-formatted',
        });
      }
    }

    cleaned[field.key] = currentValue;

    if (field.required && (!currentValue || currentValue.trim() === '')) {
      errors.push({
        column: field.key,
        message: `Missing required field: ${field.label}`,
        severity: 'red',
      });
      continue;
    }

    if (field.validate && currentValue) {
      const validation = field.validate(currentValue, rowData);
      if (!validation.valid) {
        errors.push({
          column: field.key,
          message: validation.message || 'Validation failed',
          severity: validation.severity || 'yellow',
          suggestion: validation.suggestion,
          confidence: validation.confidence,
        });
      }
    }
  }

  return { cleaned, changes, errors };
}

export function getRuleByKey(ruleSet: RuleSet, key: string): FieldRule | undefined {
  return ruleSet.fields.find(f => f.key === key);
}

export function getTargetSchemaFromRules(ruleSet: RuleSet): Array<{
  key: string;
  label: string;
  type: string;
  required: boolean;
  rules: string | null;
}> {
  return ruleSet.fields.map(field => ({
    key: field.key,
    label: field.label,
    type: field.type,
    required: field.required || false,
    rules: field.format
      ? field.format
      : field.constraints?.map(c => c.config?.message).filter(Boolean).join('. ') || null,
  }));
}

