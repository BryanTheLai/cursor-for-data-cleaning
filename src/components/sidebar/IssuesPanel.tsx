"use client";

import { useMemo } from "react";
import { useGridStore } from "@/store/useGridStore";
import { cn, getFormatDescription } from "@/lib/utils";

interface Issue {
  id: string;
  rowId: string;
  columnKey: string;
  type: "ai-suggestion" | "duplicate" | "critical";
  priority: number;
  message: string;
  originalValue?: string;
  suggestion?: string;
  confidence?: number;
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

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
    </svg>
  );
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}

function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/>
      <polyline points="12 5 19 12 12 19"/>
    </svg>
  );
}

export function IssuesPanel() {
  const { rows, columns, activeCell, setActiveCell, applySuggestion, applyColumnFix, resolveDuplicate } = useGridStore();

  const issues = useMemo(() => {
    const allIssues: Issue[] = [];

    rows.forEach((row) => {
      Object.entries(row.status).forEach(([columnKey, status]) => {
        if (!status || status.state === "clean" || status.state === "validated" || status.state === "live-update" || status.state === "skipped") {
          return;
        }

        let priority = 0;
        if (status.state === "ai-suggestion") {
          priority = status.confidence ? 10 - Math.floor(status.confidence * 10) : 5;
        } else if (status.state === "duplicate") {
          priority = 20;
        } else if (status.state === "critical") {
          priority = 30;
        }

        allIssues.push({
          id: `${row.id}-${columnKey}`,
          rowId: row.id,
          columnKey,
          type: status.state as Issue["type"],
          priority,
          message: status.message || "",
          originalValue: status.originalValue,
          suggestion: status.suggestion,
          confidence: status.confidence,
        });
      });
    });

    return allIssues.sort((a, b) => a.priority - b.priority);
  }, [rows]);

  const grouped = useMemo(() => {
    return {
      aiSuggestions: issues.filter((i) => i.type === "ai-suggestion"),
      duplicates: issues.filter((i) => i.type === "duplicate"),
      critical: issues.filter((i) => i.type === "critical"),
    };
  }, [issues]);

  const suggestionsByColumn = useMemo(() => {
    const byColumn: Record<string, Issue[]> = {};
    grouped.aiSuggestions.forEach((issue) => {
      if (!byColumn[issue.columnKey]) {
        byColumn[issue.columnKey] = [];
      }
      byColumn[issue.columnKey].push(issue);
    });
    return byColumn;
  }, [grouped.aiSuggestions]);

  const getColumnHeader = (key: string) => {
    return columns.find((c) => c.key === key)?.header || key;
  };

  const getRowNumber = (rowId: string) => {
    const index = rows.findIndex((r) => r.id === rowId);
    return index + 1;
  };

  const handleIssueClick = (issue: Issue) => {
    setActiveCell({ rowId: issue.rowId, columnKey: issue.columnKey });
  };

  const handleQuickFix = (issue: Issue, e: React.MouseEvent) => {
    e.stopPropagation();
    if (issue.type === "ai-suggestion" && issue.suggestion) {
      applySuggestion(issue.rowId, issue.columnKey);
    }
  };

  const handleDuplicateAction = (issue: Issue, action: "proceed" | "skip", e: React.MouseEvent) => {
    e.stopPropagation();
    resolveDuplicate(issue.rowId, issue.columnKey, action);
  };

  const handleEditCell = (issue: Issue, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveCell({ rowId: issue.rowId, columnKey: issue.columnKey });
  };

  const handleFixAllType = (type: Issue["type"]) => {
    const issuesOfType = issues.filter((i) => i.type === type && i.type === "ai-suggestion");
    issuesOfType.forEach((issue) => {
      applySuggestion(issue.rowId, issue.columnKey);
    });
  };

  const handleFixByColumn = (columnKey: string) => {
    applyColumnFix(columnKey);
  };

  if (issues.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/25">
          <CheckIcon className="w-8 h-8 text-white" />
        </div>
        <p className="text-base font-semibold text-gray-900">All Clear!</p>
        <p className="text-sm text-gray-500 mt-1">No issues found in your data</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-100 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Issues</h3>
            <p className="text-xs text-gray-500 mt-0.5">Click to navigate, fix issues one by one</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full">
            <span className="tabular-nums">{issues.length}</span>
            <span>total</span>
          </div>
        </div>
        
        {grouped.aiSuggestions.length > 0 && (
          <div className="space-y-2">
            <button
              onClick={() => handleFixAllType("ai-suggestion")}
              className="w-full text-left px-4 py-3 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200/60 rounded-xl hover:from-amber-100 hover:to-yellow-100 transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center shadow-sm shadow-amber-500/30">
                    <SparklesIcon className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-semibold text-amber-900">
                    Fix all {grouped.aiSuggestions.length} suggestions
                  </span>
                </div>
                <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-1 rounded-md group-hover:bg-amber-200 transition-colors">
                  Batch
                </span>
              </div>
            </button>
            
            {Object.keys(suggestionsByColumn).length > 1 && (
              <div className="flex flex-wrap gap-2">
                {Object.entries(suggestionsByColumn).map(([columnKey, columnIssues]) => (
                  <button
                    key={columnKey}
                    onClick={() => handleFixByColumn(columnKey)}
                    className="px-3 py-1.5 bg-white border border-gray-200 text-xs font-medium hover:bg-amber-50 hover:border-amber-200 transition-all rounded-lg text-gray-700 hover:text-amber-800"
                  >
                    {getColumnHeader(columnKey)} ({columnIssues.length})
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {grouped.aiSuggestions.length > 0 && (
          <div className="border-b border-gray-100">
            <div className="px-4 py-3 bg-gradient-to-r from-amber-50/80 to-transparent flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-md bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center">
                  <SparklesIcon className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-sm font-semibold text-amber-900">
                  Suggested Fixes ({grouped.aiSuggestions.length})
                </span>
              </div>
              <span className="text-xs text-amber-600 font-medium">Auto-corrections</span>
            </div>
            {grouped.aiSuggestions.map((issue) => (
              <IssueItem
                key={issue.id}
                issue={issue}
                isActive={activeCell?.rowId === issue.rowId && activeCell?.columnKey === issue.columnKey}
                columnHeader={getColumnHeader(issue.columnKey)}
                rowNumber={getRowNumber(issue.rowId)}
                onClick={() => handleIssueClick(issue)}
                onQuickFix={(e) => handleQuickFix(issue, e)}
              />
            ))}
          </div>
        )}

        {grouped.duplicates.length > 0 && (
          <div className="border-b border-gray-100">
            <div className="px-4 py-3 bg-gradient-to-r from-orange-50/80 to-transparent flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-md bg-gradient-to-br from-orange-400 to-red-400 flex items-center justify-center">
                  <CopyIcon className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-sm font-semibold text-orange-900">
                  Duplicates ({grouped.duplicates.length})
                </span>
              </div>
              <span className="text-xs text-orange-600 font-medium">Potential repeats</span>
            </div>
            {grouped.duplicates.map((issue) => (
              <IssueItem
                key={issue.id}
                issue={issue}
                isActive={activeCell?.rowId === issue.rowId && activeCell?.columnKey === issue.columnKey}
                columnHeader={getColumnHeader(issue.columnKey)}
                rowNumber={getRowNumber(issue.rowId)}
                onClick={() => handleIssueClick(issue)}
                onDuplicateProceed={(e) => handleDuplicateAction(issue, "proceed", e)}
                onDuplicateSkip={(e) => handleDuplicateAction(issue, "skip", e)}
              />
            ))}
          </div>
        )}

        {grouped.critical.length > 0 && (
          <div>
            <div className="px-4 py-3 bg-gradient-to-r from-red-50/80 to-transparent flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-md bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center">
                  <AlertIcon className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-sm font-semibold text-red-900">
                  Critical ({grouped.critical.length})
                </span>
              </div>
              <span className="text-xs text-red-600 font-medium">Needs manual review</span>
            </div>
            {grouped.critical.map((issue) => (
              <IssueItem
                key={issue.id}
                issue={issue}
                isActive={activeCell?.rowId === issue.rowId && activeCell?.columnKey === issue.columnKey}
                columnHeader={getColumnHeader(issue.columnKey)}
                rowNumber={getRowNumber(issue.rowId)}
                onClick={() => handleIssueClick(issue)}
                onEdit={(e) => handleEditCell(issue, e)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function IssueItem({
  issue,
  isActive,
  columnHeader,
  rowNumber,
  onClick,
  onQuickFix,
  onDuplicateProceed,
  onDuplicateSkip,
  onEdit,
}: {
  issue: Issue;
  isActive: boolean;
  columnHeader: string;
  rowNumber: number;
  onClick: () => void;
  onQuickFix?: (e: React.MouseEvent) => void;
  onDuplicateProceed?: (e: React.MouseEvent) => void;
  onDuplicateSkip?: (e: React.MouseEvent) => void;
  onEdit?: (e: React.MouseEvent) => void;
}) {
  const bgColor = {
    "ai-suggestion": "hover:bg-amber-50/50",
    duplicate: "hover:bg-orange-50/50",
    critical: "hover:bg-red-50/50",
  }[issue.type];

  const activeBg = {
    "ai-suggestion": "bg-amber-50 ring-2 ring-amber-300 ring-inset",
    duplicate: "bg-orange-50 ring-2 ring-orange-300 ring-inset",
    critical: "bg-red-50 ring-2 ring-red-300 ring-inset",
  }[issue.type];

  const rowBadgeStyle = {
    "ai-suggestion": "bg-amber-100 text-amber-700 border-amber-200",
    duplicate: "bg-orange-100 text-orange-700 border-orange-200",
    critical: "bg-red-100 text-red-700 border-red-200",
  }[issue.type];

  const formatHint = getFormatDescription(issue.columnKey);

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      className={cn(
        "w-full text-left px-4 py-3 border-b border-gray-50 transition-all cursor-pointer",
        bgColor,
        isActive && activeBg
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={cn(
              "font-mono text-[11px] font-semibold px-1.5 py-0.5 rounded border",
              rowBadgeStyle
            )}>
              R{rowNumber}
            </span>
            <span className="text-sm font-medium text-gray-800">{columnHeader}</span>
            {issue.confidence && (
              <span className={cn(
                "text-[11px] font-semibold px-1.5 py-0.5 rounded-full",
                issue.confidence >= 0.9 ? "bg-emerald-100 text-emerald-700" :
                issue.confidence >= 0.7 ? "bg-amber-100 text-amber-700" :
                "bg-orange-100 text-orange-700"
              )}>
                {Math.round(issue.confidence * 100)}%
              </span>
            )}
          </div>
          
          {issue.originalValue && issue.suggestion && (
            <div className="mt-2 flex items-center gap-2 text-sm">
              <span className="text-gray-400 line-through truncate max-w-[100px] font-mono" title={issue.originalValue}>
                {issue.originalValue}
              </span>
              <ArrowIcon className="w-4 h-4 text-gray-400 shrink-0" />
              <span className="text-gray-900 font-semibold truncate font-mono" title={issue.suggestion}>
                {issue.suggestion}
              </span>
            </div>
          )}
          
          {issue.message && !issue.suggestion && (
            <p className="mt-1.5 text-sm text-gray-600 truncate" title={issue.message}>{issue.message}</p>
          )}

          {formatHint && issue.type === "ai-suggestion" && (
            <p className="mt-1.5 text-xs text-gray-400">
              Format: {formatHint}
            </p>
          )}
        </div>

        {onQuickFix && issue.type === "ai-suggestion" && (
          <button
            onClick={onQuickFix}
            className="shrink-0 px-3 py-1.5 text-xs font-semibold bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-500 hover:to-orange-500 text-white rounded-lg transition-all shadow-sm hover:shadow-md active:scale-95"
          >
            Fix
          </button>
        )}

        {issue.type === "duplicate" && (
          <div className="flex gap-2 shrink-0">
            <button
              onClick={onDuplicateProceed}
              className="px-3 py-1.5 text-xs font-semibold bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg transition-all shadow-sm hover:shadow-md active:scale-95"
            >
              OK
            </button>
            <button
              onClick={onDuplicateSkip}
              className="px-3 py-1.5 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all"
            >
              Skip
            </button>
          </div>
        )}

        {issue.type === "critical" && onEdit && (
          <button
            onClick={onEdit}
            className="shrink-0 px-3 py-1.5 text-xs font-semibold bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white rounded-lg transition-all shadow-sm hover:shadow-md active:scale-95"
          >
            Edit
          </button>
        )}
      </div>
    </div>
  );
}
