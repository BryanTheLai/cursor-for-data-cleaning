"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useHotkeys } from "react-hotkeys-hook";
import { useGridStore } from "@/store/useGridStore";
import { cn } from "@/lib/utils";

interface CommandItem {
  id: string;
  label: string;
  description: string;
  shortcut?: string;
  icon: React.ReactNode;
  iconBg: string;
  action: () => void;
  category: "navigation" | "actions" | "batch";
}

interface CommandPaletteProps {
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onOpenImport?: () => void;
  onOpenExport?: () => void;
}

function SkipIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 4 15 12 5 20 5 4"/>
      <line x1="19" y1="5" x2="19" y2="19"/>
    </svg>
  );
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z"/>
      <path d="M5 19l.5 1.5L7 21l-1.5.5L5 23l-.5-1.5L3 21l1.5-.5L5 19z"/>
      <path d="M19 13l.5 1.5L21 15l-1.5.5L19 17l-.5-1.5L17 15l1.5-.5L19 13z"/>
    </svg>
  );
}

function CheckColumnIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v18"/>
      <polyline points="8 8 12 4 16 8"/>
      <polyline points="16 16 12 20 8 16"/>
    </svg>
  );
}

function UndoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7v6h6"/>
      <path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13"/>
    </svg>
  );
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
      <polyline points="17 8 12 3 7 8"/>
      <line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  );
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

  const commands: CommandItem[] = [
    {
      id: "next-error",
      label: "Jump to Next Issue",
      description: "Navigate to the next cell that needs attention",
      shortcut: "Tab",
      icon: <SkipIcon className="w-4 h-4 text-white" />,
      iconBg: "from-blue-500 to-cyan-500",
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
      icon: <SparklesIcon className="w-4 h-4 text-white" />,
      iconBg: "from-amber-400 to-orange-500",
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
      icon: <CheckColumnIcon className="w-4 h-4 text-white" />,
      iconBg: "from-emerald-400 to-teal-500",
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
      icon: <UndoIcon className="w-4 h-4 text-white" />,
      iconBg: "from-gray-500 to-gray-600",
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
      icon: <UploadIcon className="w-4 h-4 text-white" />,
      iconBg: "from-violet-500 to-purple-500",
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
      icon: <DownloadIcon className="w-4 h-4 text-white" />,
      iconBg: "from-rose-500 to-pink-500",
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
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh]">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={() => setIsOpen(false)}
      />

      <div className="relative w-full max-w-xl bg-[#1a1a1a] rounded-2xl shadow-2xl border border-white/10 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
            <SearchIcon className="w-4 h-4 text-white" />
          </div>
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none text-base font-medium"
          />
          <kbd className="px-2.5 py-1 text-xs bg-white/10 text-gray-400 rounded-lg border border-white/10 font-mono">
            esc
          </kbd>
        </div>

        <div ref={listRef} className="max-h-[400px] overflow-y-auto py-2">
          {flatCommands.length === 0 ? (
            <div className="px-4 py-12 text-center text-gray-500 text-sm">
              No commands found
            </div>
          ) : (
            <>
              {groupedCommands.navigation.length > 0 && (
                <div className="px-3 py-2">
                  <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-2 mb-2">
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
                <div className="px-3 py-2">
                  <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-2 mb-2">
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
                <div className="px-3 py-2">
                  <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-2 mb-2">
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

        <div className="px-5 py-3 border-t border-white/10 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-gray-400 font-mono text-[10px]">↑↓</kbd>
              <span>navigate</span>
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-gray-400 font-mono text-[10px]">↵</kbd>
              <span>select</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-600">
            <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-gray-400 font-mono text-[10px]">⌘K</kbd>
            <span>to open anytime</span>
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
        "w-full flex items-center gap-4 px-3 py-3 rounded-xl transition-all text-left group",
        isSelected ? "bg-white/10" : "hover:bg-white/5"
      )}
    >
      <div className={cn(
        "flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br shadow-lg transition-transform",
        command.iconBg,
        isSelected && "scale-110 shadow-xl"
      )}>
        {command.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className={cn(
          "text-sm font-semibold truncate transition-colors",
          isSelected ? "text-white" : "text-gray-200"
        )}>
          {command.label}
        </div>
        <div className="text-xs text-gray-500 truncate mt-0.5">{command.description}</div>
      </div>
      {command.shortcut && (
        <kbd className={cn(
          "flex-shrink-0 px-2.5 py-1.5 text-[11px] rounded-lg border font-mono transition-all",
          isSelected 
            ? "bg-white/20 text-white border-white/20" 
            : "bg-white/5 text-gray-400 border-white/10"
        )}>
          {command.shortcut}
        </kbd>
      )}
    </button>
  );
}
