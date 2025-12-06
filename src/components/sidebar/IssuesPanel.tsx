"use client";

import { useMemo } from "react";
import { AlertTriangle, XCircle, CheckCircle2, Pencil, ArrowRight } from "lucide-react";
import { useGridStore } from "@/store/useGridStore";
import { cn, getFormatDescription } from "@/lib/utils";

interface Issue {
  id: string;
  rowId: string;
  columnKey: string;
  type: "ai-suggestion" | "duplicate" | "critical";
  priority: number; // Lower = fix first
  message: string;
  originalValue?: string;
  suggestion?: string;
  confidence?: number;
}

export function IssuesPanel() {
  const { rows, columns, activeCell, setActiveCell, applySuggestion, applyColumnFix, resolveDuplicate } = useGridStore();

  // Collect and sort all issues
  const issues = useMemo(() => {
    const allIssues: Issue[] = [];

    rows.forEach((row) => {
      Object.entries(row.status).forEach(([columnKey, status]) => {
        if (!status || status.state === "clean" || status.state === "validated" || status.state === "live-update" || status.state === "skipped") {
          return;
        }

        // Priority: AI suggestions (easy fixes) first, then duplicates, then critical
        let priority = 0;
        if (status.state === "ai-suggestion") {
          // Higher confidence = easier fix = lower priority number
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

    // Sort by priority (lower first = easier fixes first)
    return allIssues.sort((a, b) => a.priority - b.priority);
  }, [rows]);

  // Group issues by type for summary
  const grouped = useMemo(() => {
    return {
      aiSuggestions: issues.filter((i) => i.type === "ai-suggestion"),
      duplicates: issues.filter((i) => i.type === "duplicate"),
      critical: issues.filter((i) => i.type === "critical"),
    };
  }, [issues]);

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
    // Navigate to cell - the user can then double-click or press Enter/F2 to edit
    setActiveCell({ rowId: issue.rowId, columnKey: issue.columnKey });
  };

  const handleFixAllType = (type: Issue["type"]) => {
    const issuesOfType = issues.filter((i) => i.type === type && i.type === "ai-suggestion");
    issuesOfType.forEach((issue) => {
      applySuggestion(issue.rowId, issue.columnKey);
    });
  };

  if (issues.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <CheckCircle2 className="h-12 w-12 text-green-500 mb-3" />
        <p className="text-sm font-medium text-gray-900">All Clear!</p>
        <p className="text-xs text-gray-500 mt-1">No issues found in your data</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Summary header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-700">Issues</h3>
            <p className="text-[10px] text-gray-500 mt-0.5">Click to navigate, fix issues one by one</p>
          </div>
          <span className="text-xs text-gray-500 tabular-nums bg-gray-100 px-1.5 py-0.5 rounded">{issues.length} total</span>
        </div>
        
        {grouped.aiSuggestions.length > 0 && (
          <button
            onClick={() => handleFixAllType("ai-suggestion")}
            className="w-full text-left px-3 py-2 bg-amber-50 border border-amber-200 rounded text-xs hover:bg-amber-100 transition-colors"
            title="Apply all suggested fixes at once"
          >
            <div className="flex items-center justify-between">
              <span className="text-amber-800 font-medium">
                Fix all {grouped.aiSuggestions.length} suggestions
              </span>
              <span className="text-amber-600 text-[10px] bg-amber-100 px-1.5 py-0.5 rounded">Batch</span>
            </div>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {grouped.aiSuggestions.length > 0 && (
          <div className="border-b border-gray-100">
            <div className="px-4 py-2 bg-yellow-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Pencil className="h-3 w-3 text-yellow-700" />
                <span className="text-xs font-medium text-yellow-800">
                  Suggested Fixes ({grouped.aiSuggestions.length})
                </span>
              </div>
              <span className="text-[10px] text-yellow-600">Auto-corrections</span>
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

        {/* Duplicates */}
        {grouped.duplicates.length > 0 && (
          <div className="border-b border-gray-100">
            <div className="px-4 py-2 bg-orange-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-orange-600" />
                <span className="text-xs font-medium text-orange-800">
                  Duplicates ({grouped.duplicates.length})
                </span>
              </div>
              <span className="text-[10px] text-orange-600">Potential repeats</span>
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

        {/* Critical */}
        {grouped.critical.length > 0 && (
          <div>
            <div className="px-4 py-2 bg-red-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <XCircle className="h-3.5 w-3.5 text-red-600" />
                <span className="text-xs font-medium text-red-800">
                  Critical ({grouped.critical.length})
                </span>
              </div>
              <span className="text-[10px] text-red-600">Needs manual review</span>
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
    "ai-suggestion": "hover:bg-yellow-50",
    duplicate: "hover:bg-orange-50",
    critical: "hover:bg-red-50",
  }[issue.type];

  const activeBg = {
    "ai-suggestion": "bg-yellow-50 ring-1 ring-yellow-200",
    duplicate: "bg-orange-50 ring-1 ring-orange-200",
    critical: "bg-red-50 ring-1 ring-red-200",
  }[issue.type];

  const formatHint = getFormatDescription(issue.columnKey);

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      className={cn(
        "w-full text-left px-4 py-2.5 border-b border-gray-50 transition-all cursor-pointer",
        bgColor,
        isActive && activeBg
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="font-mono text-[10px] bg-gray-100 px-1 rounded">R{rowNumber}</span>
            <span className="font-medium text-gray-700">{columnHeader}</span>
            {issue.confidence && (
              <span className={cn(
                "px-1 py-0.5 rounded text-[10px]",
                issue.confidence >= 0.9 ? "bg-green-100 text-green-700" :
                issue.confidence >= 0.7 ? "bg-yellow-100 text-yellow-700" :
                "bg-orange-100 text-orange-700"
              )}>
                {Math.round(issue.confidence * 100)}%
              </span>
            )}
          </div>
          
          {issue.originalValue && issue.suggestion && (
            <div className="mt-1.5 flex items-center gap-1.5 text-xs">
              <span className="text-gray-400 line-through truncate max-w-[80px]" title={issue.originalValue}>
                {issue.originalValue}
              </span>
              <ArrowRight className="h-3 w-3 text-gray-400 shrink-0" />
              <span className="text-gray-900 font-medium truncate" title={issue.suggestion}>
                {issue.suggestion}
              </span>
            </div>
          )}
          
          {issue.message && !issue.suggestion && (
            <p className="mt-1 text-xs text-gray-600 truncate" title={issue.message}>{issue.message}</p>
          )}

          {/* Format hint for suggestions */}
          {formatHint && issue.type === "ai-suggestion" && (
            <p className="mt-1 text-[10px] text-gray-400">
              Format: {formatHint}
            </p>
          )}
        </div>

        {/* AI Suggestion actions */}
        {onQuickFix && issue.type === "ai-suggestion" && (
          <button
            onClick={onQuickFix}
            className="shrink-0 px-2 py-1 text-[10px] font-medium bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded transition-colors"
            title="Apply this fix"
          >
            Fix
          </button>
        )}

        {/* Duplicate actions */}
        {issue.type === "duplicate" && (
          <div className="flex gap-1 shrink-0">
            <button
              onClick={onDuplicateProceed}
              className="px-2 py-1 text-[10px] font-medium bg-green-100 hover:bg-green-200 text-green-800 rounded transition-colors"
              title="Keep this payment - it's intentional"
            >
              OK
            </button>
            <button
              onClick={onDuplicateSkip}
              className="px-2 py-1 text-[10px] font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
              title="Remove from batch - it's a duplicate"
            >
              Skip
            </button>
          </div>
        )}

        {/* Critical actions */}
        {issue.type === "critical" && onEdit && (
          <button
            onClick={onEdit}
            className="shrink-0 px-2 py-1 text-[10px] font-medium bg-red-100 hover:bg-red-200 text-red-800 rounded transition-colors"
            title="Go to cell and edit manually"
          >
            Edit
          </button>
        )}
      </div>
    </div>
  );
}
