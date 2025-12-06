export type CellState = 
  | "clean" 
  | "ai-suggestion" 
  | "duplicate" 
  | "critical" 
  | "live-update"
  | "validated"
  | "skipped";

export type ValidationSeverity = "yellow" | "orange" | "red" | "purple" | "green";

export interface DuplicateInfo {
  matchedRowId: string;
  matchedAt: Date;
  matchedData: {
    name: string;
    amount: string;
    accountNumber: string;
  };
  similarity: number;
}

export interface CellStatus {
  state: CellState;
  originalValue?: string;
  suggestion?: string;
  confidence?: number;
  message?: string;
  source?: "ai" | "duplicate" | "missing" | "pdf" | "whatsapp" | "sanction";
  duplicateInfo?: DuplicateInfo;
}

export interface RowData {
  id: string;
  rowIndex: number;
  data: Record<string, string>;
  status: Record<string, CellStatus>;
  locked: boolean;
  phoneNumber?: string;
  whatsappThreadId?: string;
}

export interface ColumnDef {
  key: string;
  header: string;
  width?: number;
}

export interface WhatsAppRequest {
  id: string;
  rowId: string;
  recipientName: string;
  recipientPhone: string;
  missingField: string;
  sentAt: Date;
  status: "pending" | "replied" | "expired";
  repliedValue?: string;
  repliedAt?: Date;
}

export interface HistoryEntry {
  id: string;
  rowId: string;
  columnKey: string;
  previousValue: string;
  newValue: string;
  action: "ai-fix" | "manual" | "manual-form" | "whatsapp" | "undo" | "duplicate-resolved" | "critical-override" | "skip-row";
  timestamp: Date;
  reason?: string;
}

export interface ImportSession {
  id: string;
  fileName: string;
  status: "active" | "committed" | "archived";
  createdAt: Date;
  rows: RowData[];
}

// Future PDF support
export interface PDFData {
  id: string;
  fileName: string;
  extractedData?: Record<string, string>;
  linkedRowId?: string;
}

// AI Service interfaces (for future Groq/Claude integration)
export interface AIFormatRequest {
  value: string;
  columnType?: string;
}

export interface AIFormatResponse {
  cleanedValue: string;
  confidence: number;
}

export interface AIAuditRequest {
  rowData: Record<string, string>;
  pdfData?: Record<string, string>;
}

export interface AIAuditResponse {
  match: boolean;
  flags: Array<{
    field: string;
    severity: ValidationSeverity;
    message: string;
  }>;
}
