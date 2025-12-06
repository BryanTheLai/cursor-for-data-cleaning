import { create } from "zustand";
import type { RowData, CellStatus, WhatsAppRequest, HistoryEntry, ColumnDef } from "@/types";
import { MOCK_ROWS, COLUMNS } from "@/data/mockData";
import { v4 as uuidv4 } from "uuid";
import { autoFormat } from "@/lib/utils";
import { PAYROLL_RULES, DEFAULT_RULE_CONFIG, processRowWithRules, getRuleByKey, buildRuleSetFromConfig } from "@/lib/rulesEngine";
import { useRuleStore } from "@/store/useRuleStore";
import type { ImportResult } from "@/components/ImportWizard";
import { 
  checkForDuplicate, 
  addToHistory, 
  generateFingerprint, 
  seedDemoHistory,
  clearHistory,
  getHistoryStats,
  type TransactionRecord 
} from "@/lib/duplicateDetection";

const DEFAULT_PHONE_FALLBACK = "+60138509983";

interface ActiveCell {
  rowId: string;
  columnKey: string;
}

type FilterType = "all" | "ai-suggestion" | "duplicate" | "critical";

interface GridState {
  rows: RowData[];
  columns: ColumnDef[];
  activeCell: ActiveCell | null;
  fileName: string;
  workspaceId: string | null;
  whatsappRequests: WhatsAppRequest[];
  history: HistoryEntry[];
  redoStack: HistoryEntry[];
  filter: FilterType;
  isImporting: boolean;
  isPolling: boolean;
  
  setActiveCell: (cell: ActiveCell | null) => void;
  setFileName: (name: string) => void;
  setFilter: (filter: FilterType) => void;
  getFilteredRows: () => RowData[];
  hydrateRowsFromImport: (rows: RowData[], fileName?: string) => void;
  processImportResult: (result: ImportResult) => Promise<void>;
  submitMissingField: (rowId: string, columnKey: string, value: string) => void;
  applySuggestion: (rowId: string, columnKey: string) => void;
  rejectSuggestion: (rowId: string, columnKey: string) => void;
  applyColumnFix: (columnKey: string) => void;
  jumpToNextError: () => ActiveCell | null;
  undoLastChange: (rowId: string, columnKey: string) => void;
  redoLastChange: () => void;
  sendWhatsAppRequest: (
    rowId: string,
    columnKey: string,
    options?: {
      missingFields?: string[];
      details?: {
        amount?: string;
        bank?: string;
        accountNumber?: string;
        date?: string;
      };
      phoneOverride?: string;
      recipientNameOverride?: string;
    }
  ) => Promise<unknown>;
  receiveWhatsAppReply: (requestId: string, value: string) => void;
  pollForWhatsAppReplies: () => Promise<void>;
  handleFormSubmission: (rowId: string, data: Record<string, string>) => void;
  updateCellValue: (rowId: string, columnKey: string, value: string) => void;
  setCellStatus: (rowId: string, columnKey: string, status: CellStatus) => void;
  resolveDuplicate: (rowId: string, columnKey: string, action: "proceed" | "skip") => void;
  overrideCritical: (rowId: string, columnKey: string, reason: string) => void;
  handleRealtimeUpdate: (rowId: string, data: Partial<RowData>) => void;
  resetDemo: () => void;
}

let historySeeded = false;

export const useGridStore = create<GridState>((set, get) => {
  if (!historySeeded) {
    seedDemoHistory();
    historySeeded = true;
  }
  
  return {
  rows: MOCK_ROWS,
  columns: COLUMNS,
  activeCell: null,
  fileName: "payroll_batch_2024.xlsx",
  workspaceId: null,
  whatsappRequests: [],
  history: [],
  redoStack: [],
  filter: "all",
  isImporting: false,
  isPolling: false,

  setActiveCell: (cell) => set({ activeCell: cell }),
  setFileName: (name) => set({ fileName: name }),

  setFilter: (filter) => set({ filter }),

  getFilteredRows: () => {
    const { rows, filter } = get();
    if (filter === "all") return rows;
    
    return rows.filter((row) => {
      return Object.values(row.status).some((status) => {
        if (!status || status.state === "skipped") return false;
        if (filter === "duplicate") return status.state === "duplicate";
        if (filter === "critical") return status.state === "critical";
        if (filter === "ai-suggestion") return status.state === "ai-suggestion";
        return false;
      });
    });
  },

  hydrateRowsFromImport: (rows, fileName) => {
    console.log("[STORE] Hydrating rows from import", { rowCount: rows.length, fileName });
    set({
      rows,
      fileName: fileName || get().fileName,
      activeCell: null,
      history: [],
      redoStack: [],
      whatsappRequests: [],
    });
  },

  processImportResult: async (result: ImportResult) => {
    console.log("[STORE] Processing import result", {
      fileName: result.fileName,
      rowCount: result.rawRows.length,
      mappings: result.mappings,
    });

    set({ isImporting: true });

    try {
      const ruleConfigs = useRuleStore.getState().rules;
      const activeRuleSet = buildRuleSetFromConfig(
        ruleConfigs && ruleConfigs.length > 0 ? ruleConfigs : DEFAULT_RULE_CONFIG,
        PAYROLL_RULES
      );
      const newColumns: ColumnDef[] = result.targetSchema.map((col) => ({
        key: col.key,
        header: col.label,
        width: col.key === "name" ? 180 : col.key === "accountNumber" ? 160 : 120,
      }));

      const inverseMap: Record<string, string> = {};
      Object.entries(result.mappings).forEach(([src, tgt]) => {
        if (tgt) inverseMap[tgt] = src;
      });

      const newRows: RowData[] = result.rawRows.map((rawRow, index) => {
        const rowId = uuidv4();
        const data: Record<string, string> = {};
        const status: Record<string, CellStatus> = {};
        let phoneNumber: string | undefined;

        result.targetSchema.forEach((col) => {
          const sourceCol = inverseMap[col.key];
          const value = sourceCol ? rawRow[sourceCol] || "" : "";
          data[col.key] = value;

          if (col.key === "phone" && value) {
            phoneNumber = value;
          }
        });

        if (!phoneNumber) {
          phoneNumber = DEFAULT_PHONE_FALLBACK;
          data.phone = DEFAULT_PHONE_FALLBACK;
        }

        const ruleResult = processRowWithRules(data, activeRuleSet);

        for (const change of ruleResult.changes) {
          status[change.column] = {
            state: "ai-suggestion",
            originalValue: data[change.column],
            suggestion: change.cleaned,
            confidence: 0.9,
            message: change.reason,
            source: "ai",
          };
        }

        for (const error of ruleResult.errors) {
          if (!status[error.column]) {
            const needsForm = error.severity === "red" || error.message?.toLowerCase().includes("unknown bank");
            status[error.column] = {
              state: needsForm ? "critical" : "ai-suggestion",
              message: needsForm ? "Request via WhatsApp form" : error.message,
              source: error.message.includes("Missing") ? "missing" : "ai",
              suggestion: error.suggestion,
              confidence: error.confidence,
            };
          }
        }

        const errorCount = ruleResult.errors.length;
        if (errorCount >= 2) {
          Object.keys(data).forEach((key) => {
            if (key === "phone") return;
            if (!status[key]) {
              status[key] = {
                state: "critical",
                message: "Request via WhatsApp form",
                source: "missing",
              };
            }
          });
        }

        const name = data.name || '';
        const amount = ruleResult.cleaned.amount || data.amount || '';
        const accountNumber = ruleResult.cleaned.accountNumber || data.accountNumber || '';
        
        if (name && amount) {
          const duplicateMatch = checkForDuplicate(name, amount, accountNumber, rowId);
          
          if (duplicateMatch) {
            const dateStr = duplicateMatch.matchedAt.toLocaleDateString('en-GB', { 
              day: 'numeric', 
              month: 'short',
              year: 'numeric'
            });
            
            status.amount = {
              state: "duplicate",
              message: `Potential duplicate: Same payee+amount paid on ${dateStr}`,
              source: "duplicate",
              duplicateInfo: {
                matchedRowId: duplicateMatch.matchedRowId,
                matchedAt: duplicateMatch.matchedAt,
                matchedData: duplicateMatch.matchedData,
                similarity: duplicateMatch.similarity,
              },
            };
          }
        }

        if (phoneNumber) {
          const phoneRule = getRuleByKey(activeRuleSet, "phone");
          if (phoneRule?.transform) {
            const { value: normalizedPhone } = phoneRule.transform(phoneNumber);
            phoneNumber = normalizedPhone;
          }
        }

        return {
          id: rowId,
          rowIndex: index + 1,
          data,
          status,
          locked: false,
          phoneNumber,
        };
      });

      console.log("[STORE] Processed rows", {
        totalRows: newRows.length,
        withIssues: newRows.filter((r) => Object.keys(r.status).length > 0).length,
      });

      set({
        rows: newRows,
        columns: newColumns,
        fileName: result.fileName,
        activeCell: null,
        history: [],
        redoStack: [],
        whatsappRequests: [],
        isImporting: false,
      });

      const { jumpToNextError } = get();
      jumpToNextError();
    } catch (error) {
      console.error("[STORE] Import processing failed", error);
      set({ isImporting: false });
      throw error;
    }
  },

  submitMissingField: (rowId, columnKey, value) => {
    const { rows, history, fileName } = get();
    const rowIndex = rows.findIndex((r) => r.id === rowId);
    if (rowIndex === -1) return;

    const row = rows[rowIndex];
    const previousValue = row.data[columnKey] || "";
    const { normalized } = autoFormat(value, columnKey);

    const newRows = [...rows];
    newRows[rowIndex] = {
      ...row,
      data: { ...row.data, [columnKey]: normalized },
      status: {
        ...row.status,
        [columnKey]: {
          state: "validated",
          source: "missing",
          message: `Provided via form (${fileName || "import"})`,
        },
      },
      locked: false,
    };

    const historyEntry: HistoryEntry = {
      id: uuidv4(),
      rowId,
      columnKey,
      previousValue,
      newValue: normalized,
      action: "manual-form",
      timestamp: new Date(),
      reason: "User provided missing value",
    };

    set({ rows: newRows, history: [...history, historyEntry], redoStack: [] });
  },

  applySuggestion: (rowId, columnKey) => {
    console.log("[STORE] Applying suggestion", { rowId, columnKey });
    const { rows, history } = get();
    const rowIndex = rows.findIndex((r) => r.id === rowId);
    if (rowIndex === -1) return;

    const row = rows[rowIndex];
    const cellStatus = row.status[columnKey];
    if (!cellStatus?.suggestion) return;

    const previousValue = row.data[columnKey];
    const newValue = cellStatus.suggestion;

    const newRows = [...rows];
    newRows[rowIndex] = {
      ...row,
      data: { ...row.data, [columnKey]: newValue },
      status: {
        ...row.status,
        [columnKey]: { state: "validated", source: cellStatus.source },
      },
    };

    const historyEntry: HistoryEntry = {
      id: uuidv4(),
      rowId,
      columnKey,
      previousValue,
      newValue,
      action: "ai-fix",
      timestamp: new Date(),
    };

    set({ rows: newRows, history: [...history, historyEntry] });
  },

  rejectSuggestion: (rowId, columnKey) => {
    const { rows } = get();
    const rowIndex = rows.findIndex((r) => r.id === rowId);
    if (rowIndex === -1) return;

    const row = rows[rowIndex];
    const newRows = [...rows];
    newRows[rowIndex] = {
      ...row,
      status: {
        ...row.status,
        [columnKey]: { state: "clean" },
      },
    };

    set({ rows: newRows, redoStack: [] });
  },

  applyColumnFix: (columnKey) => {
    console.log("[STORE] Applying column fix", { columnKey });
    const { rows, history } = get();
    const newHistory: HistoryEntry[] = [...history];
    
    const newRows = rows.map((row) => {
      const cellStatus = row.status[columnKey];
      if (cellStatus?.state === "ai-suggestion" && cellStatus.suggestion) {
        newHistory.push({
          id: uuidv4(),
          rowId: row.id,
          columnKey,
          previousValue: row.data[columnKey],
          newValue: cellStatus.suggestion,
          action: "ai-fix",
          timestamp: new Date(),
        });

        return {
          ...row,
          data: { ...row.data, [columnKey]: cellStatus.suggestion },
          status: {
            ...row.status,
            [columnKey]: { state: "validated" as const, source: cellStatus.source },
          },
        };
      }
      return row;
    });

    set({ rows: newRows, history: newHistory, redoStack: [] });
  },

  jumpToNextError: () => {
    const { rows, activeCell, columns } = get();
    const errorStates: CellStatus["state"][] = ["ai-suggestion", "duplicate", "critical"];
    
    let startRowIndex = 0;
    let startColIndex = 0;

    if (activeCell) {
      startRowIndex = rows.findIndex((r) => r.id === activeCell.rowId);
      startColIndex = columns.findIndex((c) => c.key === activeCell.columnKey);
      startColIndex++;
      if (startColIndex >= columns.length) {
        startColIndex = 0;
        startRowIndex++;
      }
    }

    for (let i = startRowIndex; i < rows.length; i++) {
      const row = rows[i];
      const colStart = i === startRowIndex ? startColIndex : 0;
      for (let j = colStart; j < columns.length; j++) {
        const col = columns[j];
        const status = row.status[col.key];
        if (status && errorStates.includes(status.state)) {
          const nextCell = { rowId: row.id, columnKey: col.key };
          set({ activeCell: nextCell });
          return nextCell;
        }
      }
    }

    for (let i = 0; i < startRowIndex; i++) {
      const row = rows[i];
      for (let j = 0; j < columns.length; j++) {
        const col = columns[j];
        const status = row.status[col.key];
        if (status && errorStates.includes(status.state)) {
          const nextCell = { rowId: row.id, columnKey: col.key };
          set({ activeCell: nextCell });
          return nextCell;
        }
      }
    }

    set({ activeCell: null });
    return null;
  },

  undoLastChange: (rowId, columnKey) => {
    const { rows, history, redoStack } = get();
    const lastEntry = [...history]
      .reverse()
      .find((h) => h.rowId === rowId && h.columnKey === columnKey);
    
    if (!lastEntry) return;

    const rowIndex = rows.findIndex((r) => r.id === rowId);
    if (rowIndex === -1) return;

    const row = rows[rowIndex];
    const previousStatus = row.status[columnKey];
    const newRows = [...rows];
    newRows[rowIndex] = {
      ...row,
      data: { ...row.data, [columnKey]: lastEntry.previousValue },
      status: {
        ...row.status,
        [columnKey]: {
          state: "ai-suggestion",
          originalValue: lastEntry.previousValue,
          suggestion: lastEntry.newValue,
          message: previousStatus?.message || "Previous suggestion restored",
          confidence: previousStatus?.confidence,
          source: previousStatus?.source || "ai",
        },
      },
    };

    const newHistory = history.filter((h) => h.id !== lastEntry.id);
    set({ 
      rows: newRows, 
      history: newHistory, 
      redoStack: [...redoStack, lastEntry] 
    });
  },

  redoLastChange: () => {
    const { rows, redoStack, history } = get();
    const nextEntry = redoStack[redoStack.length - 1];
    if (!nextEntry) return;

    const rowIndex = rows.findIndex((r) => r.id === nextEntry.rowId);
    if (rowIndex === -1) return;

    const row = rows[rowIndex];
    const previousValue = row.data[nextEntry.columnKey];

    const newRows = [...rows];
    newRows[rowIndex] = {
      ...row,
      data: { ...row.data, [nextEntry.columnKey]: nextEntry.newValue },
      status: {
        ...row.status,
        [nextEntry.columnKey]: { state: "validated", source: row.status[nextEntry.columnKey]?.source || "ai" },
      },
    };

    const redoHistoryEntry: HistoryEntry = {
      id: uuidv4(),
      rowId: nextEntry.rowId,
      columnKey: nextEntry.columnKey,
      previousValue,
      newValue: nextEntry.newValue,
      action: "redo",
      timestamp: new Date(),
    };

    set({ 
      rows: newRows, 
      history: [...history, redoHistoryEntry], 
      redoStack: redoStack.slice(0, -1) 
    });
  },

  sendWhatsAppRequest: async (rowId, columnKey, options) => {
    console.log("[STORE] Sending WhatsApp request", { rowId, columnKey });
    const { rows, whatsappRequests, workspaceId } = get();
    const row = rows.find((r) => r.id === rowId);
    
    const phoneNumber = options?.phoneOverride || row?.data.phone || row?.phoneNumber || DEFAULT_PHONE_FALLBACK;
    if (!row || !phoneNumber) {
      console.warn("[STORE] Cannot send WhatsApp - no phone number", { 
        hasRow: !!row, 
        phoneNumber,
        rowData: row?.data 
      });
      return;
    }

    const request: WhatsAppRequest = {
      id: uuidv4(),
      rowId,
      recipientName: options?.recipientNameOverride || row.data.name || "Unknown",
      recipientPhone: phoneNumber,
      missingField: columnKey,
      sentAt: new Date(),
      status: "pending",
    };

    const rowIndex = rows.findIndex((r) => r.id === rowId);
    const newRows = [...rows];
    newRows[rowIndex] = {
      ...row,
      locked: true,
      whatsappThreadId: request.id,
    };

    set({
      rows: newRows,
      whatsappRequests: [...whatsappRequests, request],
    });

    try {
      const response = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: workspaceId || "demo",
          rowId,
          phoneNumber,
          recipientName: options?.recipientNameOverride || row.data.name || "there",
          missingFields: options?.missingFields && options.missingFields.length > 0 ? options.missingFields : [columnKey],
          existingData: row.data,
          details: options?.details,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send WhatsApp");
      }

      const result = await response.json();
      console.log("[STORE] WhatsApp sent", result);

      const updatedRequests = get().whatsappRequests.map((r) =>
        r.id === request.id ? { ...r, id: result.requestId, formLink: result.formLink } : r
      );

      set({ whatsappRequests: updatedRequests });
      
      return result;
    } catch (error) {
      console.error("[STORE] WhatsApp send failed", error);

      const revertedRows = [...get().rows];
      const revertIndex = revertedRows.findIndex((r) => r.id === rowId);
      if (revertIndex !== -1) {
        revertedRows[revertIndex] = {
          ...revertedRows[revertIndex],
          locked: false,
          whatsappThreadId: undefined,
        };
      }

      set({
        rows: revertedRows,
        whatsappRequests: get().whatsappRequests.filter((r) => r.id !== request.id),
      });
      
      throw error;
    }
  },

  receiveWhatsAppReply: (requestId, value) => {
    console.log("[STORE] Receiving WhatsApp reply", { requestId, value });
    const { rows, whatsappRequests, history } = get();
    const request = whatsappRequests.find((r) => r.id === requestId);
    if (!request) return;

    const rowIndex = rows.findIndex((r) => r.id === request.rowId);
    if (rowIndex === -1) return;

    const row = rows[rowIndex];
    const columnKey = request.missingField;
    const previousValue = row.data[columnKey] || "";

    const newRows = [...rows];
    newRows[rowIndex] = {
      ...row,
      data: { ...row.data, [columnKey]: value },
      status: {
        ...row.status,
        [columnKey]: { state: "live-update", source: "whatsapp" },
      },
      locked: false,
    };

    const newRequests = whatsappRequests.map((r) =>
      r.id === requestId
        ? { ...r, status: "replied" as const, repliedValue: value, repliedAt: new Date() }
        : r
    );

    const historyEntry: HistoryEntry = {
      id: uuidv4(),
      rowId: request.rowId,
      columnKey,
      previousValue,
      newValue: value,
      action: "whatsapp",
      timestamp: new Date(),
    };

    set({
      rows: newRows,
      whatsappRequests: newRequests,
      history: [...history, historyEntry],
    });

    setTimeout(() => {
      const currentRows = get().rows;
      const currentRowIndex = currentRows.findIndex((r) => r.id === request.rowId);
      if (currentRowIndex === -1) return;

      const currentRow = currentRows[currentRowIndex];
      const updatedRows = [...currentRows];
      updatedRows[currentRowIndex] = {
        ...currentRow,
        status: {
          ...currentRow.status,
          [columnKey]: { state: "validated", source: "whatsapp" },
        },
      };
      set({ rows: updatedRows });
    }, 2000);
  },

  pollForWhatsAppReplies: async () => {
    const { isPolling, whatsappRequests } = get();
    if (isPolling) return;
    
    const pendingRequests = whatsappRequests.filter(r => r.status === "pending");
    if (pendingRequests.length === 0) return;
    
    set({ isPolling: true });
    
    try {
      const response = await fetch("/api/whatsapp/poll");
      if (!response.ok) {
        console.warn("[STORE] Poll failed", response.status);
        return;
      }
      
      const result = await response.json();
      
      if (result.hasUpdates && result.submissions) {
        for (const submission of result.submissions) {
          get().handleFormSubmission(submission.rowId, submission.data);
        }
      }
    } catch (error) {
      console.error("[STORE] Poll error", error);
    } finally {
      set({ isPolling: false });
    }
  },

  handleFormSubmission: (rowId, data) => {
    console.log("[STORE] Handling form submission", { rowId, data });
    const { rows, whatsappRequests, history } = get();
    
    const rowIndex = rows.findIndex((r) => r.id === rowId);
    if (rowIndex === -1) {
      console.warn("[STORE] Row not found for form submission", { rowId });
      return;
    }
    
    const row = rows[rowIndex];
    const newRows = [...rows];
    const newHistory = [...history];
    const newStatus = { ...row.status };
    const newData = { ...row.data };
    
    for (const [columnKey, value] of Object.entries(data)) {
      const previousValue = row.data[columnKey] || "";
      newData[columnKey] = value;
      newStatus[columnKey] = { state: "live-update", source: "whatsapp" };
      
      newHistory.push({
        id: uuidv4(),
        rowId,
        columnKey,
        previousValue,
        newValue: value,
        action: "whatsapp",
        timestamp: new Date(),
      });
    }
    
    newRows[rowIndex] = {
      ...row,
      data: newData,
      status: newStatus,
      locked: false,
      whatsappThreadId: undefined,
    };
    
    const newRequests = whatsappRequests.map((r) =>
      r.rowId === rowId
        ? { ...r, status: "replied" as const, repliedAt: new Date() }
        : r
    );
    
    set({
      rows: newRows,
      whatsappRequests: newRequests,
      history: newHistory,
    });
    
    setTimeout(() => {
      const currentRows = get().rows;
      const currentRowIndex = currentRows.findIndex((r) => r.id === rowId);
      if (currentRowIndex === -1) return;
      
      const currentRow = currentRows[currentRowIndex];
      const updatedStatus = { ...currentRow.status };
      
      for (const columnKey of Object.keys(data)) {
        if (updatedStatus[columnKey]?.state === "live-update") {
          updatedStatus[columnKey] = { state: "validated", source: "whatsapp" };
        }
      }
      
      const updatedRows = [...currentRows];
      updatedRows[currentRowIndex] = {
        ...currentRow,
        status: updatedStatus,
      };
      set({ rows: updatedRows });
    }, 2000);
  },

  updateCellValue: (rowId, columnKey, value) => {
    const { rows, history } = get();
    const rowIndex = rows.findIndex((r) => r.id === rowId);
    if (rowIndex === -1) return;

    const row = rows[rowIndex];
    const previousValue = row.data[columnKey];
    
    const { normalized } = autoFormat(value, columnKey);

    const newRows = [...rows];
    newRows[rowIndex] = {
      ...row,
      data: { ...row.data, [columnKey]: normalized },
      status: {
        ...row.status,
        [columnKey]: { state: "validated", source: "ai" },
      },
    };

    const historyEntry: HistoryEntry = {
      id: uuidv4(),
      rowId,
      columnKey,
      previousValue,
      newValue: normalized,
      action: "manual",
      timestamp: new Date(),
    };

    set({ rows: newRows, history: [...history, historyEntry] });
  },

  setCellStatus: (rowId, columnKey, status) => {
    const { rows } = get();
    const rowIndex = rows.findIndex((r) => r.id === rowId);
    if (rowIndex === -1) return;

    const row = rows[rowIndex];
    const newRows = [...rows];
    newRows[rowIndex] = {
      ...row,
      status: { ...row.status, [columnKey]: status },
    };

    set({ rows: newRows });
  },

  resolveDuplicate: (rowId, columnKey, action) => {
    const { rows, history } = get();
    const rowIndex = rows.findIndex((r) => r.id === rowId);
    if (rowIndex === -1) return;

    const row = rows[rowIndex];
    const newRows = [...rows];

    if (action === "proceed") {
      newRows[rowIndex] = {
        ...row,
        status: {
          ...row.status,
          [columnKey]: { 
            state: "validated", 
            source: "duplicate",
            message: "Marked as intentional duplicate" 
          },
        },
      };
    } else if (action === "skip") {
      newRows[rowIndex] = {
        ...row,
        status: {
          ...row.status,
          [columnKey]: { 
            state: "skipped", 
            source: "duplicate",
            message: "Skipped - duplicate transaction" 
          },
        },
      };
    }

    const historyEntry: HistoryEntry = {
      id: uuidv4(),
      rowId,
      columnKey,
      previousValue: row.data[columnKey],
      newValue: row.data[columnKey],
      action: action === "skip" ? "skip-row" : "duplicate-resolved",
      timestamp: new Date(),
    };

    set({ rows: newRows, history: [...history, historyEntry] });
  },

  overrideCritical: (rowId, columnKey, reason) => {
    const { rows, history } = get();
    const rowIndex = rows.findIndex((r) => r.id === rowId);
    if (rowIndex === -1) return;

    const row = rows[rowIndex];
    const newRows = [...rows];
    
    newRows[rowIndex] = {
      ...row,
      status: {
        ...row.status,
        [columnKey]: { 
          state: "validated", 
          source: row.status[columnKey]?.source,
          message: `Override approved: ${reason}` 
        },
      },
    };

    const historyEntry: HistoryEntry = {
      id: uuidv4(),
      rowId,
      columnKey,
      previousValue: row.data[columnKey],
      newValue: row.data[columnKey],
      action: "critical-override",
      timestamp: new Date(),
      reason,
    };

    set({ rows: newRows, history: [...history, historyEntry] });
  },

  handleRealtimeUpdate: (rowId, data) => {
    console.log("[STORE] Realtime update received", { rowId, data });
    const { rows } = get();
    const rowIndex = rows.findIndex((r) => r.id === rowId);
    if (rowIndex === -1) return;

    const row = rows[rowIndex];
    const newRows = [...rows];
    newRows[rowIndex] = {
      ...row,
      ...data,
    };

    set({ rows: newRows });
  },

  resetDemo: () => {
    console.log("[STORE] Resetting demo state");
    clearHistory();
    seedDemoHistory();
    
    // Deep clone MOCK_ROWS to ensure fresh state
    const freshRows = MOCK_ROWS.map(row => ({
      ...row,
      data: { ...row.data },
      status: { ...row.status },
    }));
    
    set({
      rows: freshRows,
      columns: COLUMNS,
      activeCell: null,
      fileName: "payroll_batch_2024.xlsx",
      workspaceId: null,
      whatsappRequests: [],
      history: [],
      redoStack: [],
      filter: "all",
      isImporting: false,
      isPolling: false,
    });
  },
}});
