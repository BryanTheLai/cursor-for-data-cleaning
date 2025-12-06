"use client";

import { useState } from "react";
import { Upload, FileSpreadsheet, ChevronRight, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useGridStore } from "@/store/useGridStore";
import { ImportWizard, type ImportResult } from "@/components/ImportWizard";
import { cn } from "@/lib/utils";

type FilterType = "all" | "ai-suggestion" | "duplicate" | "critical";

export function Header() {
  const { rows, jumpToNextError, filter, setFilter, fileName, processImportResult, isImporting } = useGridStore();
  const [isImportOpen, setIsImportOpen] = useState(false);

  const counts = rows.reduce(
    (acc, row) => {
      Object.values(row.status).forEach((status) => {
        if (status.state === "ai-suggestion") acc.suggestions++;
        else if (status.state === "duplicate") acc.duplicates++;
        else if (status.state === "critical") acc.critical++;
      });
      return acc;
    },
    { suggestions: 0, duplicates: 0, critical: 0 }
  );

  const totalIssues = counts.suggestions + counts.duplicates + counts.critical;

  const filterButtons: { id: FilterType; label: string; count: number; color: string; activeColor: string; tooltip: string }[] = [
    { id: "all", label: "All", count: rows.length, color: "text-gray-600", activeColor: "bg-gray-100 text-gray-900", tooltip: "Show all rows" },
    { id: "ai-suggestion", label: "Fixes", count: counts.suggestions, color: "text-amber-700", activeColor: "bg-amber-100 text-amber-900", tooltip: "Auto-corrections ready to apply" },
    { id: "duplicate", label: "Duplicates", count: counts.duplicates, color: "text-orange-700", activeColor: "bg-orange-100 text-orange-900", tooltip: "Potential duplicate payments" },
    { id: "critical", label: "Critical", count: counts.critical, color: "text-red-700", activeColor: "bg-red-100 text-red-900", tooltip: "Requires manual review" },
  ];

  const handleImportComplete = async (result: ImportResult) => {
    console.log("[HEADER] Import complete, processing result");
    await processImportResult(result);
  };

  return (
    <>
      <header className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-gray-700" />
            <h1 className="text-base font-semibold text-gray-900">RytFlow</h1>
          </div>

          <div className="h-6 w-px bg-gray-200" />

          <span className="text-sm text-gray-500">{fileName}</span>
          <Badge variant="secondary" className="text-xs font-normal">
            {rows.length} rows
          </Badge>
        </div>

        <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1">
          {filterButtons.map((btn) => (
            btn.count > 0 || btn.id === "all" ? (
              <button
                key={btn.id}
                onClick={() => setFilter(btn.id)}
                title={btn.tooltip}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors",
                  filter === btn.id ? btn.activeColor : `${btn.color} hover:bg-gray-100`
                )}
              >
                <span className="font-medium">{btn.label}</span>
                <span className={cn(
                  "text-xs px-1.5 py-0.5 rounded tabular-nums",
                  filter === btn.id ? "bg-white/50" : "bg-gray-200/50"
                )}>
                  {btn.count}
                </span>
              </button>
            ) : null
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsImportOpen(true)}
            disabled={isImporting}
          >
            {isImporting ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-1.5" />
            )}
            {isImporting ? "Importing..." : "Upload"}
          </Button>

          {totalIssues > 0 ? (
            <Button size="sm" onClick={() => jumpToNextError()}>
              Next Issue
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button size="sm" className="bg-green-600 hover:bg-green-700">
              <Check className="h-3.5 w-3.5 mr-1.5" />
              Submit
            </Button>
          )}
        </div>
      </header>

      <ImportWizard
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportComplete={handleImportComplete}
      />
    </>
  );
}
