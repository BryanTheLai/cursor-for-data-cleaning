import { createHash } from 'crypto';
import { log } from './logger';

export interface DuplicateMatch {
  fingerprint: string;
  matchedRowId: string;
  matchedAt: Date;
  matchedData: {
    name: string;
    amount: string;
    accountNumber: string;
  };
  similarity: number;
}

export interface TransactionRecord {
  id: string;
  fingerprint: string;
  name: string;
  amount: string;
  accountNumber: string;
  createdAt: Date;
}

const transactionHistory: Map<string, TransactionRecord[]> = new Map();

function normalizeForFingerprint(value: string): string {
  if (!value) return '';
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

export function generateFingerprint(
  name: string,
  amount: string,
  accountNumber: string
): string {
  const normalizedName = normalizeForFingerprint(name);
  const normalizedAmount = normalizeForFingerprint(amount);
  const normalizedAccount = normalizeForFingerprint(accountNumber);
  
  const combined = `${normalizedName}|${normalizedAmount}|${normalizedAccount}`;
  
  return createHash('md5').update(combined).digest('hex').slice(0, 16);
}

export function generatePartialFingerprints(
  name: string,
  amount: string,
  accountNumber: string
): { exact: string; nameAmount: string; amountAccount: string } {
  const normalizedName = normalizeForFingerprint(name);
  const normalizedAmount = normalizeForFingerprint(amount);
  const normalizedAccount = normalizeForFingerprint(accountNumber);
  
  return {
    exact: createHash('md5').update(`${normalizedName}|${normalizedAmount}|${normalizedAccount}`).digest('hex').slice(0, 16),
    nameAmount: createHash('md5').update(`${normalizedName}|${normalizedAmount}`).digest('hex').slice(0, 16),
    amountAccount: createHash('md5').update(`${normalizedAmount}|${normalizedAccount}`).digest('hex').slice(0, 16),
  };
}

export function addToHistory(record: TransactionRecord): void {
  const existing = transactionHistory.get(record.fingerprint) || [];
  existing.push(record);
  transactionHistory.set(record.fingerprint, existing);
  
  log.duplicate.info('Added to transaction history', { 
    fingerprint: record.fingerprint, 
    id: record.id 
  });
}

export function checkForDuplicate(
  name: string,
  amount: string,
  accountNumber: string,
  excludeRowId?: string
): DuplicateMatch | null {
  const fingerprints = generatePartialFingerprints(name, amount, accountNumber);
  
  const exactMatches = transactionHistory.get(fingerprints.exact) || [];
  for (const record of exactMatches) {
    if (excludeRowId && record.id === excludeRowId) continue;
    
    log.duplicate.info('Exact duplicate found', { 
      fingerprint: fingerprints.exact,
      matchedId: record.id 
    });
    
    return {
      fingerprint: fingerprints.exact,
      matchedRowId: record.id,
      matchedAt: record.createdAt,
      matchedData: {
        name: record.name,
        amount: record.amount,
        accountNumber: record.accountNumber,
      },
      similarity: 1.0,
    };
  }
  
  for (const [fp, records] of transactionHistory.entries()) {
    if (fp === fingerprints.nameAmount || fp === fingerprints.amountAccount) {
      for (const record of records) {
        if (excludeRowId && record.id === excludeRowId) continue;
        
        log.duplicate.info('Partial duplicate found', { 
          fingerprint: fp,
          matchedId: record.id,
          type: fp === fingerprints.nameAmount ? 'name+amount' : 'amount+account'
        });
        
        return {
          fingerprint: fp,
          matchedRowId: record.id,
          matchedAt: record.createdAt,
          matchedData: {
            name: record.name,
            amount: record.amount,
            accountNumber: record.accountNumber,
          },
          similarity: 0.8,
        };
      }
    }
  }
  
  return null;
}

export function clearHistory(): void {
  transactionHistory.clear();
  log.duplicate.info('Transaction history cleared');
}

export function getHistoryStats(): { count: number; fingerprints: number } {
  let count = 0;
  for (const records of transactionHistory.values()) {
    count += records.length;
  }
  return {
    count,
    fingerprints: transactionHistory.size,
  };
}

export function seedDemoHistory(): void {
  const demoTransactions = [
    {
      id: 'hist-001',
      name: 'Tenaga Nasional',
      amount: '5000.00',
      accountNumber: '1234567890',
      createdAt: new Date('2024-10-15'),
    },
    {
      id: 'hist-002', 
      name: 'Ahmad Bin Abdullah',
      amount: '3500.00',
      accountNumber: '9876543210',
      createdAt: new Date('2024-10-20'),
    },
    {
      id: 'hist-003',
      name: 'Syarikat ABC Sdn Bhd',
      amount: '12500.00',
      accountNumber: '5555666677',
      createdAt: new Date('2024-11-01'),
    },
    {
      id: 'hist-004',
      name: 'Telekom Malaysia',
      amount: '850.00',
      accountNumber: '1122334455',
      createdAt: new Date('2024-11-05'),
    },
  ];

  for (const tx of demoTransactions) {
    const fingerprint = generateFingerprint(tx.name, tx.amount, tx.accountNumber);
    addToHistory({
      ...tx,
      fingerprint,
    });
  }

  log.duplicate.info('Demo transaction history seeded', getHistoryStats());
}

