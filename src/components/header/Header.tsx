"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { Upload, Check, Loader2, Download, Sparkles, Command, Zap, Settings2, MessageCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGridStore } from "@/store/useGridStore";
import { ImportWizard, type ImportResult } from "@/components/ImportWizard";
import { CommandPalette } from "@/components/ui/CommandPalette";
import { ExportPreview } from "@/components/ui/ExportPreview";
import { RulesSettings } from "@/components/ui/RulesSettings";
import { PayModal } from "@/components/ui/PayModal";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

type FilterType = "all" | "ai-suggestion" | "duplicate" | "critical";

export function Header() {
  const { rows, filter, setFilter, fileName, processImportResult, isImporting, runAmlScan, amlScanStatus } = useGridStore();
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isRulesSettingsOpen, setIsRulesSettingsOpen] = useState(false);
  const [isPayOpen, setIsPayOpen] = useState(false);
  const { addToast } = useToast();

  const stats = useMemo(() => {
    let suggestions = 0;
    let duplicates = 0;
    let critical = 0;
    let totalCells = 0;
    let cleanCells = 0;

    rows.forEach((row) => {
      Object.values(row.status).forEach((status) => {
        totalCells++;
        if (status?.state === "ai-suggestion") {
          suggestions++;
        } else if (status?.state === "duplicate") {
          duplicates++;
        } else if (status?.state === "critical") {
          critical++;
        } else {
          cleanCells++;
        }
      });
    });

    const totalIssues = suggestions + duplicates + critical;
    const percent = totalCells > 0 ? Math.round((cleanCells / totalCells) * 100) : 100;

    return { totalIssues, suggestions, duplicates, critical, percent };
  }, [rows]);

  const filterButtons: { id: FilterType; label: string; count: number; dotColor: string; activeColor: string }[] = [
    { id: "all", label: "All", count: rows.length, dotColor: "", activeColor: "bg-gray-100 text-gray-900" },
    { id: "ai-suggestion", label: "Fixes", count: stats.suggestions, dotColor: "bg-amber-400", activeColor: "bg-amber-50 text-amber-900" },
    { id: "duplicate", label: "Dups", count: stats.duplicates, dotColor: "bg-orange-400", activeColor: "bg-orange-50 text-orange-900" },
    { id: "critical", label: "Critical", count: stats.critical, dotColor: "bg-red-400", activeColor: "bg-red-50 text-red-900" },
  ];

  const handleImportComplete = async (result: ImportResult) => {
    await processImportResult(result);
  };

  const isComplete = stats.totalIssues === 0;

  const handleDeepScan = async () => {
    try {
      await runAmlScan();
      addToast("Claude scan complete", "success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Deep scan failed";
      addToast(message, "error");
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white">
        <div className="flex items-center gap-3 px-4 h-10">
          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <Image src="/ryt logo.png" alt="Ryt Flow" width={24} height={24} className="h-6 w-auto" />
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-bold text-[#0000e6] font-mono">
                Ryt Flow
              </span>
              <span className="text-[10px] text-[#00ddd7] font-mono uppercase tracking-wide">
                Banking for power users
              </span>
            </div>
          </div>

          {/* File info */}
          <span className="text-xs text-gray-400 font-mono truncate max-w-[100px] shrink-0" title={fileName}>
            {fileName}
          </span>
          <span className="text-[10px] text-gray-400 font-mono tabular-nums bg-gray-100 px-1 py-0.5 shrink-0">
            {rows.length}
          </span>

          {/* Separator */}
          <div className="h-4 w-px bg-gray-200 shrink-0" />

          {/* Filter pills */}
          <div className="flex items-center gap-0.5 shrink-0">
            {filterButtons.map((btn) => (
              btn.count > 0 || btn.id === "all" ? (
                <button
                  key={btn.id}
                  onClick={() => setFilter(btn.id)}
                  className={cn(
                    "flex items-center gap-1 px-2 py-0.5 text-xs font-medium transition-colors",
                    filter === btn.id ? btn.activeColor : "text-gray-500 hover:bg-gray-50"
                  )}
                >
                  {btn.dotColor && <div className={cn("w-1.5 h-1.5", btn.dotColor)} />}
                  <span>{btn.label}</span>
                  <span className="text-[10px] font-mono tabular-nums opacity-60">{btn.count}</span>
                </button>
              ) : null
            ))}
          </div>

          {/* Spacer */}
          <div className="flex-1 min-w-4" />

          {/* Progress indicator */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Zap className={cn(
              "h-3.5 w-3.5",
              isComplete ? "text-[#00ddd7]" : "text-[#0000e6]"
            )} />
            <span className={cn(
              "text-sm font-bold font-mono tabular-nums",
              isComplete ? "text-[#00ddd7]" : "text-[#0000e6]"
            )}>
              {stats.percent}%
            </span>
            {!isComplete && (
              <span className="text-[10px] text-gray-400">
                ({stats.totalIssues})
              </span>
            )}
          </div>

          {/* Separator */}
          <div className="h-4 w-px bg-gray-200 shrink-0" />

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setIsRulesSettingsOpen(true)}
              className="flex items-center gap-1 px-1.5 py-0.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
              title="Rules Settings"
            >
              <Settings2 className="h-3.5 w-3.5" />
            </button>

            <button
              onClick={() => setIsCommandPaletteOpen(true)}
              className="flex items-center gap-1 px-1.5 py-0.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
              title="Open command palette (⌘K)"
            >
              <Command className="h-3.5 w-3.5" />
              <kbd className="text-[9px] px-1 py-0.5 bg-gray-100 font-mono">⌘K</kbd>
            </button>

            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={handleDeepScan}
              disabled={amlScanStatus === "loading"}
              title="Deep AML scan with Claude"
            >
              {amlScanStatus === "loading" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
              ) : (
                <ShieldCheck className="h-3.5 w-3.5 mr-1 text-indigo-600" />
              )}
              Deep Scan
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => setIsImportOpen(true)}
              disabled={isImporting}
              title="Import CSV/Excel file"
            >
              {isImporting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
              ) : (
                <Upload className="h-3.5 w-3.5 mr-1" />
              )}
              Import
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => setIsExportOpen(true)}
              title="Export cleaned data"
            >
              <Download className="h-3.5 w-3.5 mr-1" />
              Export
            </Button>

            <Button
              size="sm"
              className="h-6 px-2 text-xs bg-[#0000e6] hover:bg-[#0000cc] text-white"
              onClick={() => setIsPayOpen(true)}
              title="Resolve all issues before sending payment details via WhatsApp"
              disabled={!isComplete}
            >
              <MessageCircle className="h-3.5 w-3.5 mr-1" />
              Pay
            </Button>
          </div>
        </div>

        {/* Thin progress bar as bottom border */}
        <div className="h-[2px] bg-gray-100">
          <div
            className={cn(
              "h-full transition-all duration-500 ease-out",
              isComplete
                ? "bg-[#00ddd7]"
                : "bg-gradient-to-r from-[#0000e6] via-[#00ddd7] to-[#0000e6]"
            )}
            style={{ width: `${stats.percent}%` }}
          />
        </div>
      </header>

      <ImportWizard
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportComplete={handleImportComplete}
      />

      <ExportPreview
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onOpenChange={setIsCommandPaletteOpen}
        onOpenImport={() => setIsImportOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
      />

      <RulesSettings
        isOpen={isRulesSettingsOpen}
        onClose={() => setIsRulesSettingsOpen(false)}
      />

      <PayModal
        isOpen={isPayOpen}
        onClose={() => setIsPayOpen(false)}
      />
    </>
  );
}
