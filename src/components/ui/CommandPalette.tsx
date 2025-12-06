"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useHotkeys } from "react-hotkeys-hook";
import {
  Search,
  Zap,
  SkipForward,
  RotateCcw,
  Download,
  Upload,
  MessageCircle,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Command,
} from "lucide-react";
import { useGridStore } from "@/store/useGridStore";
import { cn } from "@/lib/utils";

interface CommandItem {
  id: string;
  label: string;
  description: string;
  shortcut?: string;
  icon: React.ReactNode;
  action: () => void;
  category: "navigation" | "actions" | "batch";
}

interface CommandPaletteProps {
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onOpenImport?: () => void;
  onOpenExport?: () => void;
}

export function CommandPalette({ isOpen: controlledOpen, onOpenChange, onOpenImport, onOpenExport }: CommandPaletteProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen ?? internalOpen;
  const setIsOpen = (open: boolean) => {
    setInternalOpen(open);
    onOpenChange?.(open);
  };
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const {
    rows,
    activeCell,
    jumpToNextError,
    applySuggestion,
    applyColumnFix,
    undoLastChange,
    history,
  } = useGridStore();

  const suggestionCount = rows.reduce((acc, row) => {
    return acc + Object.values(row.status).filter((s) => s?.state === "ai-suggestion").length;
  }, 0);

  const duplicateCount = rows.reduce((acc, row) => {
    return acc + Object.values(row.status).filter((s) => s?.state === "duplicate").length;
  }, 0);

  const criticalCount = rows.reduce((acc, row) => {
    return acc + Object.values(row.status).filter((s) => s?.state === "critical").length;
  }, 0);

  const commands: CommandItem[] = [
    {
      id: "next-error",
      label: "Jump to Next Issue",
      description: "Navigate to the next cell that needs attention",
      shortcut: "Tab",
      icon: <SkipForward className="h-4 w-4" />,
      action: () => {
        jumpToNextError();
        setIsOpen(false);
      },
      category: "navigation",
    },
    {
      id: "fix-all",
      label: "Fix All Suggestions",
      description: `Apply all ${suggestionCount} AI suggestions at once`,
      shortcut: "⇧⌘F",
      icon: <Zap className="h-4 w-4 text-amber-500" />,
      action: () => {
        rows.forEach((row) => {
          Object.entries(row.status).forEach(([col, status]) => {
            if (status?.state === "ai-suggestion") {
              applySuggestion(row.id, col);
            }
          });
        });
        setIsOpen(false);
      },
      category: "batch",
    },
    {
      id: "fix-column",
      label: "Fix Current Column",
      description: "Apply all suggestions in the active column",
      shortcut: "⇧Tab",
      icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
      action: () => {
        if (activeCell) {
          applyColumnFix(activeCell.columnKey);
        }
        setIsOpen(false);
      },
      category: "batch",
    },
    {
      id: "undo",
      label: "Undo Last Change",
      description: history.length > 0 ? `Revert: ${history[history.length - 1]?.action}` : "No changes to undo",
      shortcut: "⌘Z",
      icon: <RotateCcw className="h-4 w-4" />,
      action: () => {
        if (history.length > 0) {
          const last = history[history.length - 1];
          undoLastChange(last.rowId, last.columnKey);
        }
        setIsOpen(false);
      },
      category: "actions",
    },
    {
      id: "upload",
      label: "Upload New File",
      description: "Import a CSV or Excel file",
      shortcut: "⌘U",
      icon: <Upload className="h-4 w-4" />,
      action: () => {
        onOpenImport?.();
        setIsOpen(false);
      },
      category: "actions",
    },
    {
      id: "export",
      label: "Export Cleaned Data",
      description: "Download the cleaned file with before/after comparison",
      shortcut: "⌘E",
      icon: <Download className="h-4 w-4" />,
      action: () => {
        onOpenExport?.();
        setIsOpen(false);
      },
      category: "actions",
    },
  ];

  const filteredCommands = commands.filter((cmd) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      cmd.label.toLowerCase().includes(searchLower) ||
      cmd.description.toLowerCase().includes(searchLower)
    );
  });

  const groupedCommands = {
    navigation: filteredCommands.filter((c) => c.category === "navigation"),
    batch: filteredCommands.filter((c) => c.category === "batch"),
    actions: filteredCommands.filter((c) => c.category === "actions"),
  };

  const flatCommands = [
    ...groupedCommands.navigation,
    ...groupedCommands.batch,
    ...groupedCommands.actions,
  ];

  useHotkeys(
    "mod+k",
    (e) => {
      e.preventDefault();
      setIsOpen(true);
      setSearch("");
      setSelectedIndex(0);
    },
    { enableOnFormTags: true }
  );

  useHotkeys(
    "escape",
    () => {
      if (isOpen) setIsOpen(false);
    },
    { enableOnFormTags: true, enabled: isOpen }
  );

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, flatCommands.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const selected = flatCommands[selectedIndex];
        if (selected) {
          selected.action();
        }
      }
    },
    [flatCommands, selectedIndex]
  );

  useEffect(() => {
    if (listRef.current) {
      const selectedEl = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      selectedEl?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  const content = (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setIsOpen(false)}
      />

      {/* Palette */}
      <div className="relative w-full max-w-xl bg-gray-900  shadow-2xl border border-gray-700 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-700">
          <Search className="h-5 w-5 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none text-sm"
          />
          <kbd className="px-2 py-1 text-xs bg-gray-800 text-gray-400  border border-gray-700 font-mono">
            esc
          </kbd>
        </div>

        {/* Commands list */}
        <div ref={listRef} className="max-h-[360px] overflow-y-auto py-2">
          {flatCommands.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500 text-sm">
              No commands found
            </div>
          ) : (
            <>
              {groupedCommands.navigation.length > 0 && (
                <div className="px-3 py-1.5">
                  <div className="text-[10px] font-medium text-gray-500 uppercase tracking-wider px-2 mb-1">
                    Navigation
                  </div>
                  {groupedCommands.navigation.map((cmd, i) => (
                    <CommandRow
                      key={cmd.id}
                      command={cmd}
                      isSelected={selectedIndex === i}
                      dataIndex={i}
                      onClick={() => cmd.action()}
                    />
                  ))}
                </div>
              )}

              {groupedCommands.batch.length > 0 && (
                <div className="px-3 py-1.5">
                  <div className="text-[10px] font-medium text-gray-500 uppercase tracking-wider px-2 mb-1">
                    Batch Operations
                  </div>
                  {groupedCommands.batch.map((cmd, i) => {
                    const globalIndex = groupedCommands.navigation.length + i;
                    return (
                      <CommandRow
                        key={cmd.id}
                        command={cmd}
                        isSelected={selectedIndex === globalIndex}
                        dataIndex={globalIndex}
                        onClick={() => cmd.action()}
                      />
                    );
                  })}
                </div>
              )}

              {groupedCommands.actions.length > 0 && (
                <div className="px-3 py-1.5">
                  <div className="text-[10px] font-medium text-gray-500 uppercase tracking-wider px-2 mb-1">
                    Actions
                  </div>
                  {groupedCommands.actions.map((cmd, i) => {
                    const globalIndex = groupedCommands.navigation.length + groupedCommands.batch.length + i;
                    return (
                      <CommandRow
                        key={cmd.id}
                        command={cmd}
                        isSelected={selectedIndex === globalIndex}
                        dataIndex={globalIndex}
                        onClick={() => cmd.action()}
                      />
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-gray-700 flex items-center justify-between text-[10px] text-gray-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-gray-800  text-gray-400 font-mono">↑↓</kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-gray-800  text-gray-400 font-mono">↵</kbd>
              select
            </span>
          </div>
          <div className="flex items-center gap-1 text-gray-600">
            <Command className="h-3 w-3" />
            <span>K to open anytime</span>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

function CommandRow({
  command,
  isSelected,
  dataIndex,
  onClick,
}: {
  command: CommandItem;
  isSelected: boolean;
  dataIndex: number;
  onClick: () => void;
}) {
  return (
    <button
      data-index={dataIndex}
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2  transition-colors text-left",
        isSelected ? "bg-gray-800 text-white" : "text-gray-300 hover:bg-gray-800/50"
      )}
    >
      <div className={cn(
        "flex-shrink-0 w-8 h-8  flex items-center justify-center",
        isSelected ? "bg-gray-700" : "bg-gray-800"
      )}>
        {command.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{command.label}</div>
        <div className="text-xs text-gray-500 truncate">{command.description}</div>
      </div>
      {command.shortcut && (
        <kbd className="flex-shrink-0 px-2 py-1 text-[10px] bg-gray-800 text-gray-400  border border-gray-700 font-mono">
          {command.shortcut}
        </kbd>
      )}
    </button>
  );
}

