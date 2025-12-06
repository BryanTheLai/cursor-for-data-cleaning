import type { RowData, ColumnDef } from "@/types";

export const COLUMNS: ColumnDef[] = [
  { key: "id", header: "ID", width: 80 },
  { key: "name", header: "Payee Name", width: 180 },
  { key: "amount", header: "Amount (RM)", width: 120 },
  { key: "bank", header: "Bank", width: 120 },
  { key: "accountNumber", header: "Account Number", width: 160 },
  { key: "date", header: "Date", width: 120 },
];

export const MOCK_ROWS: RowData[] = [
  {
    id: "row-1",
    rowIndex: 1,
    data: {
      id: "TXN001",
      name: "mr. ali ahmad",
      amount: "rm 5,000",
      bank: "maybank",
      accountNumber: "1234-5678-9012",
      date: "2024-03-15",
    },
    status: {
      name: {
        state: "ai-suggestion",
        originalValue: "mr. ali ahmad",
        suggestion: "Ali Ahmad",
        confidence: 0.95,
        message: "Capitalize proper nouns, remove title",
        source: "ai",
      },
      amount: {
        state: "ai-suggestion",
        originalValue: "rm 5,000",
        suggestion: "5000.00",
        confidence: 0.99,
        message: "Remove currency symbol, standardize format",
        source: "ai",
      },
      bank: {
        state: "ai-suggestion",
        originalValue: "maybank",
        suggestion: "MBB",
        confidence: 0.98,
        message: "Normalize bank code: Maybank → MBB",
        source: "ai",
      },
    },
    locked: false,
    phoneNumber: "+60123456789",
  },
  {
    id: "row-2",
    rowIndex: 2,
    data: {
      id: "TXN002",
      name: "Tenaga Nasional",
      amount: "500.00",
      bank: "CIMB",
      accountNumber: "800-111-222",
      date: "2024-03-15",
    },
    status: {
      amount: {
        state: "duplicate",
        message: "Exact match: Paid RM 500.00 to this account yesterday",
        source: "duplicate",
      },
    },
    locked: false,
    phoneNumber: "+60198765432",
  },
  {
    id: "row-3",
    rowIndex: 3,
    data: {
      id: "TXN003",
      name: "TechCorp Sdn Bhd",
      amount: "5500.00",
      bank: "PBB",
      accountNumber: "9876-5432-1098",
      date: "2024-03-15",
    },
    status: {
      amount: {
        state: "critical",
        message: "PDF Invoice shows RM 6,000.00 - Mismatch detected",
        source: "pdf",
      },
    },
    locked: false,
  },
  {
    id: "row-4",
    rowIndex: 4,
    data: {
      id: "TXN004",
      name: "Jane Doe",
      amount: "2300.00",
      bank: "",
      accountNumber: "5555-6666-7777",
      date: "2024-03-15",
    },
    status: {
      bank: {
        state: "critical",
        message: "Missing required field: Bank name",
        source: "missing",
      },
    },
    locked: false,
    phoneNumber: "+60112345678",
  },
  {
    id: "row-5",
    rowIndex: 5,
    data: {
      id: "TXN005",
      name: "Clean Data Co",
      amount: "1200.00",
      bank: "RHB",
      accountNumber: "1111-2222-3333",
      date: "2024-03-15",
    },
    status: {},
    locked: false,
  },
  {
    id: "row-6",
    rowIndex: 6,
    data: {
      id: "TXN006",
      name: "sarah lee",
      amount: "RM 3,500",
      bank: "public bank",
      accountNumber: "7777888899990000",
      date: "15-03-2024",
    },
    status: {
      name: {
        state: "ai-suggestion",
        originalValue: "sarah lee",
        suggestion: "Sarah Lee",
        confidence: 0.97,
        message: "Capitalize proper nouns",
        source: "ai",
      },
      amount: {
        state: "ai-suggestion",
        originalValue: "RM 3,500",
        suggestion: "3500.00",
        confidence: 0.99,
        message: "Remove currency symbol, standardize format",
        source: "ai",
      },
      bank: {
        state: "ai-suggestion",
        originalValue: "public bank",
        suggestion: "PBB",
        confidence: 0.96,
        message: "Normalize bank code: Public Bank → PBB",
        source: "ai",
      },
      date: {
        state: "ai-suggestion",
        originalValue: "15-03-2024",
        suggestion: "2024-03-15",
        confidence: 0.99,
        message: "Standardize date format: DD-MM-YYYY → YYYY-MM-DD",
        source: "ai",
      },
    },
    locked: false,
    phoneNumber: "+60187654321",
  },
  {
    id: "row-7",
    rowIndex: 7,
    data: {
      id: "TXN007",
      name: "EVIL CORP SDN BHD",
      amount: "1000000.00",
      bank: "MBB",
      accountNumber: "999-999-999",
      date: "2024-03-15",
    },
    status: {
      name: {
        state: "critical",
        message: "Sanctioned entity detected - requires compliance review",
        source: "ai",
      },
      amount: {
        state: "ai-suggestion",
        originalValue: "1000000.00",
        suggestion: "1000000.00",
        confidence: 0.40,
        message: "High value transaction >RM50,000 - requires BNM approval",
        source: "ai",
      },
    },
    locked: false,
  },
  {
    id: "row-8",
    rowIndex: 8,
    data: {
      id: "TXN008",
      name: "Ahmad bin Hassan",
      amount: "2400.00",
      bank: "CIMB",
      accountNumber: "155-200-300",
      date: "2024-03-15",
    },
    status: {
      amount: {
        state: "duplicate",
        message: "Similar payment: RM 2,400.00 to Ali Bin Abu (155-200-300) - 2 days ago",
        source: "duplicate",
      },
    },
    locked: false,
  },
  {
    id: "row-9",
    rowIndex: 9,
    data: {
      id: "TXN009",
      name: "Verified Corp",
      amount: "8500.00",
      bank: "HLB",
      accountNumber: "4444-3333-2222",
      date: "2024-03-15",
    },
    status: {
      amount: {
        state: "validated",
        message: "Matched with Invoice #INV-2024-0892",
        source: "pdf",
      },
    },
    locked: false,
  },
  {
    id: "row-10",
    rowIndex: 10,
    data: {
      id: "TXN010",
      name: "",
      amount: "750.00",
      bank: "AMB",
      accountNumber: "6666-5555-4444",
      date: "2024-03-15",
    },
    status: {
      name: {
        state: "critical",
        message: "Missing required field: Payee name",
        source: "missing",
      },
    },
    locked: false,
    phoneNumber: "+60176543210",
  },
];

// Simulated transaction history for duplicate detection
export const TRANSACTION_HISTORY = [
  {
    id: "hist-1",
    recipientName: "Tenaga Nasional",
    accountNumber: "800-111-222",
    amount: 500.0,
    paymentDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
  },
  {
    id: "hist-2",
    recipientName: "Ali Bin Abu",
    accountNumber: "155-200-300",
    amount: 2400.0,
    paymentDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
  },
];
