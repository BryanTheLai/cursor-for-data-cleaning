"use client";

import dynamic from "next/dynamic";
import { useRef, useEffect, useCallback, useMemo, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { useShallow } from "zustand/react/shallow";
import { useGridStore } from "@/store/useGridStore";
import { GridCell } from "./GridCell";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import type { RowData, ColumnDef } from "@/types";

type GridState = ReturnType<typeof useGridStore.getState>;

const selector = (state: GridState) => ({
  rows: state.rows,
  columns: state.columns,
  activeCell: state.activeCell,
  filter: state.filter,
  setActiveCell: state.setActiveCell,
  applySuggestion: state.applySuggestion,
  rejectSuggestion: state.rejectSuggestion,
  applyColumnFix: state.applyColumnFix,
  jumpToNextError: state.jumpToNextError,
  undoLastChange: state.undoLastChange,
  redoLastChange: state.redoLastChange,
  updateCellValue: state.updateCellValue,
  history: state.history,
  redoStack: state.redoStack,
  getFilteredRows: state.getFilteredRows,
  whatsappRequests: state.whatsappRequests,
  pollForWhatsAppReplies: state.pollForWhatsAppReplies,
});

const AISuggestionPopover = dynamic(
  () => import("./AISuggestionPopover").then((mod) => mod.AISuggestionPopover),
  {
    ssr: false,
    loading: () => (
      <div className="fixed z-50 px-3 py-2 text-xs text-gray-500 bg-white border border-gray-200 shadow-sm">
        Loading...
      </div>
    ),
  }
);

export function DataGrid() {
  const {
    rows,
    columns,
    activeCell,
    filter,
    setActiveCell,
    applySuggestion,
    rejectSuggestion,
    applyColumnFix,
    jumpToNextError,
    undoLastChange,
    redoLastChange,
    updateCellValue,
    history,
    redoStack,
    getFilteredRows,
    whatsappRequests,
    pollForWhatsAppReplies,
  } = useGridStore(useShallow(selector));

  const filteredRows = useMemo<RowData[]>(() => getFilteredRows(), [rows, filter, getFilteredRows]);

  const orderedRows = useMemo<RowData[]>(() => {
    const nonSkipped: RowData[] = [];
    const skipped: RowData[] = [];

    filteredRows.forEach((row) => {
      const isSkipped = Object.values(row.status).some((status) => status?.state === "skipped");
      if (isSkipped) {
        skipped.push(row);
      } else {
        nonSkipped.push(row);
      }
    });

    return [...nonSkipped, ...skipped];
  }, [filteredRows]);

  const gridRef = useRef<HTMLDivElement>(null);
  const activeCellRef = useRef<HTMLTableCellElement | null>(null);
  const anchorRaf = useRef<number | null>(null);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const { addToast } = useToast();
  const [recentlyFixed, setRecentlyFixed] = useState<Set<string>>(new Set());
  const [editingCell, setEditingCell] = useState<{ rowId: string; columnKey: string } | null>(null);

  useEffect(() => {
    const prefetch = () => {
      import("./AISuggestionPopover");
    };

    if ("requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(prefetch);
      return () => window.cancelIdleCallback(idleId);
    }

    const timeoutId = globalThis.setTimeout(prefetch, 200);
    return () => clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    setAnchorEl(null);
  }, [activeCell?.rowId, activeCell?.columnKey]);

  useEffect(() => {
    return () => {
      if (anchorRaf.current !== null) cancelAnimationFrame(anchorRaf.current);
    };
  }, []);

  // Poll for WhatsApp replies when there are pending requests
  const pendingWhatsAppCount = useMemo(
    () => whatsappRequests.filter((r) => r.status === "pending").length,
    [whatsappRequests]
  );

  useEffect(() => {
    if (pendingWhatsAppCount === 0) return;

    pollForWhatsAppReplies();
    const interval = setInterval(pollForWhatsAppReplies, 3000);
    return () => clearInterval(interval);
  }, [pendingWhatsAppCount, pollForWhatsAppReplies]);

  // Get active cell status for popover
  const getActiveCellStatus = useCallback(() => {
    if (!activeCell) return null;
    const row = rows.find((r) => r.id === activeCell.rowId);
    if (!row) return null;
    return row.status[activeCell.columnKey] || null;
  }, [activeCell, rows]);

  const activeCellStatus = getActiveCellStatus();
  const showPopover =
    activeCell &&
    activeCellStatus &&
    ["ai-suggestion", "duplicate", "critical"].includes(activeCellStatus.state) &&
    !!anchorEl;

  // Tab to accept suggestion and jump to next error
  useHotkeys(
    "tab",
    (e) => {
      e.preventDefault();
      if (activeCell && activeCellStatus?.state === "ai-suggestion") {
        applySuggestion(activeCell.rowId, activeCell.columnKey);
      }
      jumpToNextError();
    },
    { enableOnFormTags: true },
    [activeCell, activeCellStatus, applySuggestion, jumpToNextError]
  );

  // Redo shortcut (Ctrl+Y / Cmd+Shift+Z)
  useHotkeys(
    ["ctrl+y", "mod+shift+z"],
    (e) => {
      e.preventDefault();
      if (redoStack.length > 0) {
        redoLastChange();
        addToast("Redo: Reapplied change", "info");
      }
    },
    { enableOnFormTags: false }
  );

  // Shift+Tab to fix all in current column
  useHotkeys(
    "shift+tab",
    (e) => {
      e.preventDefault();
      if (activeCell) {
        const columnKey = activeCell.columnKey;
        const fixCount = rows.filter(
          (r) => r.status[columnKey]?.state === "ai-suggestion"
        ).length;
        
        if (fixCount > 0) {
          applyColumnFix(columnKey);
          addToast(`Fixed ${fixCount} cells in ${columns.find(c => c.key === columnKey)?.header || columnKey}`, "success");
          jumpToNextError();
        }
      }
    },
    { enableOnFormTags: true },
    [activeCell, rows, columns, applyColumnFix, addToast, jumpToNextError]
  );

  // Escape to reject suggestion or cancel editing
  useHotkeys(
    "escape",
    (e) => {
      e.preventDefault();
      if (editingCell) {
        setEditingCell(null);
        return;
      }
      if (activeCell) {
        rejectSuggestion(activeCell.rowId, activeCell.columnKey);
        setActiveCell(null);
      }
    },
    { enableOnFormTags: true }
  );

  // Undo shortcut (Cmd+Z / Ctrl+Z)
  useHotkeys(
    "mod+z",
    (e) => {
      e.preventDefault();
      if (history.length > 0) {
        const lastEntry = history[history.length - 1];
        undoLastChange(lastEntry.rowId, lastEntry.columnKey);
        addToast("Undo: Reverted last change", "info");
      }
    },
    { enableOnFormTags: false }
  );

  // Enter key to start editing or apply suggestion
  useHotkeys(
    "enter",
    (e) => {
      if (editingCell) return; // Already editing
      e.preventDefault();
      if (activeCell) {
        const row = rows.find((r) => r.id === activeCell.rowId);
        const cellStatus = row?.status[activeCell.columnKey];
        
        // If cell has AI suggestion, apply it
        if (cellStatus?.state === "ai-suggestion" && cellStatus.suggestion) {
          applySuggestion(activeCell.rowId, activeCell.columnKey);
          jumpToNextError();
        } else {
          // Otherwise, enter edit mode
          setEditingCell({ rowId: activeCell.rowId, columnKey: activeCell.columnKey });
        }
      }
    },
    { enableOnFormTags: false }
  );

  // F2 to edit cell (Excel-like)
  useHotkeys(
    "f2",
    (e) => {
      e.preventDefault();
      if (activeCell && !editingCell) {
        setEditingCell({ rowId: activeCell.rowId, columnKey: activeCell.columnKey });
      }
    },
    { enableOnFormTags: false }
  );

  // Delete/Backspace to clear cell
  useHotkeys(
    "delete,backspace",
    (e) => {
      if (editingCell) return;
      e.preventDefault();
      if (activeCell) {
        updateCellValue(activeCell.rowId, activeCell.columnKey, "");
        addToast("Cell cleared", "info");
      }
    },
    { enableOnFormTags: false }
  );

  // Arrow key navigation
  useHotkeys(
    "up,down,left,right",
    (e, handler) => {
      e.preventDefault();
      if (!activeCell) return;

      const currentRowIndex = rows.findIndex((r) => r.id === activeCell.rowId);
      const currentColIndex = columns.findIndex(
        (c) => c.key === activeCell.columnKey
      );

      let newRowIndex = currentRowIndex;
      let newColIndex = currentColIndex;

      switch (handler.keys?.join("")) {
        case "up":
          newRowIndex = Math.max(0, currentRowIndex - 1);
          break;
        case "down":
          newRowIndex = Math.min(rows.length - 1, currentRowIndex + 1);
          break;
        case "left":
          newColIndex = Math.max(0, currentColIndex - 1);
          break;
        case "right":
          newColIndex = Math.min(columns.length - 1, currentColIndex + 1);
          break;
      }

      setActiveCell({
        rowId: rows[newRowIndex].id,
        columnKey: columns[newColIndex].key,
      });
    },
    { enableOnFormTags: false }
  );

  // Scroll active cell into view
  useEffect(() => {
    if (activeCellRef.current) {
      activeCellRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest",
      });
    }
  }, [activeCell]);

  const handleCellClick = (rowId: string, columnKey: string) => {
    if (editingCell) return;
    setActiveCell({ rowId, columnKey });
  };

  const handleCellDoubleClick = (rowId: string, columnKey: string) => {
    setEditingCell({ rowId, columnKey });
  };

  const handleEditComplete = (rowId: string, columnKey: string, newValue: string) => {
    const row = rows.find((r) => r.id === rowId);
    if (row && row.data[columnKey] !== newValue) {
      updateCellValue(rowId, columnKey, newValue);
    }
    setEditingCell(null);
  };

  const handleApply = () => {
    if (activeCell) {
      applySuggestion(activeCell.rowId, activeCell.columnKey);
      jumpToNextError();
    }
  };

  const handleReject = () => {
    if (activeCell) {
      rejectSuggestion(activeCell.rowId, activeCell.columnKey);
      setActiveCell(null);
    }
  };

  const handleFixColumn = () => {
    if (activeCell) {
      // Count how many cells will be fixed
      const columnKey = activeCell.columnKey;
      const fixCount = rows.filter(
        (r) => r.status[columnKey]?.state === "ai-suggestion"
      ).length;
      
      // Mark all cells in column as recently fixed
      const fixedKeys = rows
        .filter((r) => r.status[columnKey]?.state === "ai-suggestion")
        .map((r) => `${r.id}-${columnKey}`);
      setRecentlyFixed(new Set(fixedKeys));
      
      applyColumnFix(columnKey);
      
      addToast(`Fixed ${fixCount} cells in column`, "success");
      
      // Clear recently fixed after animation
      setTimeout(() => setRecentlyFixed(new Set()), 500);
      
      jumpToNextError();
    }
  };

  return (
    <div className="relative" ref={gridRef}>
      <div className="overflow-auto overscroll-x-contain border border-gray-200 bg-white shadow-sm max-h-[calc(100vh-8rem)] scrollbar-stable">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="bg-gray-50/95 backdrop-blur-sm border-b border-gray-200">
              <th className="w-10 px-2 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider border-r border-gray-200 bg-gray-50/95">
                #
              </th>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-3 py-2.5 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-200 last:border-r-0 bg-gray-50/95"
                  style={{ width: column.width, minWidth: column.width }}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orderedRows.map((row: RowData, rowIndex: number) => {
              const hasActiveCell = activeCell?.rowId === row.id;
              const activeCellState = hasActiveCell ? row.status[activeCell.columnKey]?.state : null;
              const isSkippedRow = Object.values(row.status).some((status) => status?.state === "skipped");
              
              return (
              <tr
                key={row.id}
                className={cn(
                  "border-b border-gray-100 hover:bg-gray-50/50 transition-colors",
                  row.locked && "opacity-60",
                  hasActiveCell && activeCellState === "ai-suggestion" && "bg-yellow-50/30",
                  hasActiveCell && activeCellState === "duplicate" && "bg-orange-50/30",
                  hasActiveCell && activeCellState === "critical" && "bg-red-50/30",
                  isSkippedRow && "line-through decoration-2 decoration-red-400 text-gray-400 animate-skip-fade"
                )}
              >
                <td className="w-10 px-2 py-2 text-xs text-gray-400 border-r border-gray-200 bg-gray-50/50 tabular-nums">
                  {rowIndex + 1}
                </td>
                {columns.map((column: ColumnDef) => {
                  const isActive =
                    activeCell?.rowId === row.id &&
                    activeCell?.columnKey === column.key;
                  return (
                    <GridCell
                      key={`${row.id}-${column.key}`}
                      ref={(el) => {
                        if (isActive) {
                          activeCellRef.current = el;
                          if (anchorRaf.current !== null) cancelAnimationFrame(anchorRaf.current);
                          anchorRaf.current = requestAnimationFrame(() => {
                            if (el && el !== anchorEl) setAnchorEl(el);
                          });
                        }
                      }}
                      rowId={row.id}
                      columnKey={column.key}
                      value={row.data[column.key] || ""}
                      status={row.status[column.key]}
                      isActive={isActive}
                      isLocked={row.locked}
                      isRecentlyFixed={recentlyFixed.has(`${row.id}-${column.key}`)}
                      onClick={() => handleCellClick(row.id, column.key)}
                      onDoubleClick={() => handleCellDoubleClick(row.id, column.key)}
                      isEditing={editingCell?.rowId === row.id && editingCell?.columnKey === column.key}
                      onEditComplete={(value: string) => handleEditComplete(row.id, column.key, value)}
                    />
                  );
                })}
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* AI Suggestion Popover */}
      {showPopover && activeCellRef.current && activeCell && activeCellStatus && (
        <AISuggestionPopover
          key={`${activeCell.rowId}-${activeCell.columnKey}`}
          anchorEl={activeCellRef.current}
          status={activeCellStatus}
          rowId={activeCell.rowId}
          columnKey={activeCell.columnKey}
          onApply={handleApply}
          onReject={handleReject}
          onFixColumn={handleFixColumn}
        />
      )}
    </div>
  );
}
