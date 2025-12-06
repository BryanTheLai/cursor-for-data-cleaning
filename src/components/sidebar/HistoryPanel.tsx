"use client";

import { RotateCcw, Sparkles, Edit3, MessageCircle, ShieldAlert, CopyMinus, ArrowRightLeft } from "lucide-react";
import { useGridStore } from "@/store/useGridStore";
import { Button } from "@/components/ui/button";

export function HistoryPanel() {
  const { history, undoLastChange, columns } = useGridStore();

  const getActionIcon = (action: string) => {
    switch (action) {
      case "ai-fix":
        return <Sparkles className="h-3 w-3 text-yellow-600" />;
      case "manual":
      case "manual-form":
        return <Edit3 className="h-3 w-3 text-blue-600" />;
      case "whatsapp":
        return <MessageCircle className="h-3 w-3 text-green-600" />;
      case "undo":
      case "redo":
        return <ArrowRightLeft className="h-3 w-3 text-gray-600" />;
      case "duplicate-resolved":
        return <CopyMinus className="h-3 w-3 text-orange-600" />;
      case "critical-override":
        return <ShieldAlert className="h-3 w-3 text-red-600" />;
      default:
        return null;
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case "ai-fix":
        return "AI Fix";
      case "manual":
      case "manual-form":
        return "Manual Edit";
      case "whatsapp":
        return "WhatsApp Reply";
      case "undo":
        return "Undo";
      case "redo":
        return "Redo";
      case "duplicate-resolved":
        return "Duplicate Resolved";
      case "critical-override":
        return "Critical Override";
      case "skip-row":
        return "Row Skipped";
      default:
        return action;
    }
  };

  const getColumnHeader = (key: string) => {
    return columns.find((c) => c.key === key)?.header || key;
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }).format(date);
  };

  const groupedHistory = [...history]
    .reverse()
    .reduce<Record<string, typeof history>>((acc, entry) => {
      const label = getActionLabel(entry.action);
      if (!acc[label]) acc[label] = [];
      acc[label].push(entry);
      return acc;
    }, {});

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">Change History</h3>
          <span className="text-xs text-gray-500">{history.length} changes</span>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {history.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-500">
            <RotateCcw className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p>No changes yet</p>
            <p className="text-xs mt-1">Changes will appear here as you edit</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {Object.entries(groupedHistory).map(([label, entries]) => (
              <div key={label} className="pb-2">
                <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-100">
                  <span className="text-xs font-semibold text-gray-700">{label}</span>
                  <span className="text-[10px] text-gray-500">{entries.length}</span>
                </div>
                <div className="divide-y divide-gray-100">
                  {entries.map((entry) => (
                    <div key={entry.id} className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {getActionIcon(entry.action)}
                          <span className="text-xs font-medium text-gray-600">
                            {getActionLabel(entry.action)}
                          </span>
                        </div>
                        <span className="text-[10px] text-gray-400">
                          {formatTime(entry.timestamp)}
                        </span>
                      </div>

                      <div className="mt-2 text-xs">
                        <span className="text-gray-500">
                          {getColumnHeader(entry.columnKey)}:{" "}
                        </span>
                        <span className="line-through text-gray-400">
                          {entry.previousValue || "(empty)"}
                        </span>
                        <span className="text-gray-400 mx-1">→</span>
                        <span className="font-medium text-gray-900">
                          {entry.newValue}
                        </span>
                      </div>

                      <div className="mt-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 text-xs"
                          onClick={() => undoLastChange(entry.rowId, entry.columnKey)}
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          Undo
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
