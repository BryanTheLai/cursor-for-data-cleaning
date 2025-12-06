"use client";

import { useCallback, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X, Download, ArrowRight, Check, AlertTriangle, MessageCircle, FileJson, FileSpreadsheet, ChevronDown } from "lucide-react";
import { useGridStore } from "@/store/useGridStore";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ExportPreviewProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Change {
  rowIndex: number;
  column: string;
  original: string;
  cleaned: string;
  source: "ai" | "whatsapp" | "manual" | "duplicate";
}

type ExportFormat = "csv" | "json" | "maybank" | "cimb";

const EXPORT_FORMATS: { value: ExportFormat; label: string; description: string }[] = [
  { value: "csv", label: "Standard CSV", description: "Universal format" },
  { value: "json", label: "JSON", description: "API-ready format" },
  { value: "maybank", label: "Maybank Bulk", description: "MBB payment format" },
  { value: "cimb", label: "CIMB BizChannel", description: "CIMB bulk format" },
];

export function ExportPreview({ isOpen, onClose }: ExportPreviewProps) {
  const { rows, columns, fileName, history } = useGridStore();
  const [exportFormat, setExportFormat] = useState<ExportFormat>("csv");
  const [showFormatDropdown, setShowFormatDropdown] = useState(false);

  const changes = useMemo(() => {
    const result: Change[] = [];
    
    history.forEach((entry) => {
      const rowIndex = rows.findIndex((r) => r.id === entry.rowId) + 1;
      const col = columns.find((c) => c.key === entry.columnKey);
      
      if (rowIndex > 0 && col && entry.previousValue !== entry.newValue) {
        let source: Change["source"] = "ai";
        if (entry.action === "whatsapp") source = "whatsapp";
        else if (entry.action === "manual" || entry.action === "manual-form") source = "manual";
        else if (entry.action === "duplicate-resolved" || entry.action === "skip-row") source = "duplicate";

        result.push({
          rowIndex,
          column: col.header,
          original: entry.previousValue || "(empty)",
          cleaned: entry.newValue || "(empty)",
          source,
        });
      }
    });

    return result;
  }, [history, rows, columns]);

  const stats = useMemo(() => {
    const bySource = {
      ai: changes.filter((c) => c.source === "ai").length,
      whatsapp: changes.filter((c) => c.source === "whatsapp").length,
      manual: changes.filter((c) => c.source === "manual").length,
      duplicate: changes.filter((c) => c.source === "duplicate").length,
    };
    return { total: changes.length, ...bySource };
  }, [changes]);

  const remainingIssues = useMemo(() => {
    let count = 0;
    rows.forEach((row) => {
      Object.values(row.status).forEach((status) => {
        if (status && ["ai-suggestion", "duplicate", "critical"].includes(status.state)) {
          count++;
        }
      });
    });
    return count;
  }, [rows]);

  const generateCSV = useCallback(() => {
    return [
      columns.map((col) => col.header).join(","),
      ...rows.map((row) =>
        columns
          .map((col) => {
            const value = row.data[col.key] || "";
            return value.includes(",") || value.includes('"')
              ? `"${value.replace(/"/g, '""')}"`
              : value;
          })
          .join(",")
      ),
    ].join("\n");
  }, [rows, columns]);

  const generateJSON = useCallback(() => {
    const data = rows.map((row) => {
      const obj: Record<string, string> = {};
      columns.forEach((col) => {
        obj[col.key] = row.data[col.key] || "";
      });
      return obj;
    });
    return JSON.stringify({ rows: data, exportedAt: new Date().toISOString(), totalRows: rows.length }, null, 2);
  }, [rows, columns]);

  const generateMaybankFormat = useCallback(() => {
    const header = "RecordType|PaymentDate|ValueDate|CurrencyCode|Amount|PaymentRef|BeneficiaryName|BeneficiaryAccountNo|BeneficiaryBankCode";
    const dataRows = rows.map((row) => {
      const date = new Date().toISOString().split("T")[0].replace(/-/g, "");
      return [
        "D",
        date,
        date,
        "MYR",
        row.data.amount || "0.00",
        row.data.id || `REF${Date.now()}`,
        row.data.name || "",
        row.data.accountNumber || "",
        row.data.bank || "MBB",
      ].join("|");
    });
    return [header, ...dataRows].join("\n");
  }, [rows]);

  const generateCIMBFormat = useCallback(() => {
    const header = "SEQ,BENEFICIARY_NAME,BENEFICIARY_ACCOUNT,BANK_CODE,AMOUNT,PAYMENT_REF,PARTICULARS";
    const dataRows = rows.map((row, idx) => {
      return [
        idx + 1,
        `"${row.data.name || ""}"`,
        row.data.accountNumber || "",
        row.data.bank || "CIMB",
        row.data.amount || "0.00",
        row.data.id || `PAY${idx + 1}`,
        "Salary Payment",
      ].join(",");
    });
    return [header, ...dataRows].join("\n");
  }, [rows]);

  const handleDownload = useCallback(() => {
    let content: string;
    let mimeType: string;
    let extension: string;

    switch (exportFormat) {
      case "json":
        content = generateJSON();
        mimeType = "application/json;charset=utf-8;";
        extension = "json";
        break;
      case "maybank":
        content = generateMaybankFormat();
        mimeType = "text/plain;charset=utf-8;";
        extension = "txt";
        break;
      case "cimb":
        content = generateCIMBFormat();
        mimeType = "text/csv;charset=utf-8;";
        extension = "csv";
        break;
      default:
        content = generateCSV();
        mimeType = "text/csv;charset=utf-8;";
        extension = "csv";
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const cleanFileName = fileName.replace(/\.[^/.]+$/, "") + `_cleaned.${extension}`;
    link.download = cleanFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onClose();
  }, [fileName, onClose, exportFormat, generateCSV, generateJSON, generateMaybankFormat, generateCIMBFormat]);

  if (!isOpen) return null;

  const content = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-3xl bg-white  shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Export Preview</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {fileName.replace(/\.[^/.]+$/, "")}_cleaned.csv
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200  transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Summary stats */}
        <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 tabular-nums">{rows.length}</div>
              <div className="text-xs text-gray-500">Total Rows</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-600 tabular-nums">{stats.total}</div>
              <div className="text-xs text-gray-500">Changes Made</div>
            </div>
            <div className="text-center">
              <div className={cn(
                "text-2xl font-bold tabular-nums",
                remainingIssues > 0 ? "text-amber-600" : "text-emerald-600"
              )}>
                {remainingIssues}
              </div>
              <div className="text-xs text-gray-500">Remaining Issues</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-cyan-600 tabular-nums">
                {stats.total > 0 ? Math.round(((rows.length * columns.length - remainingIssues) / (rows.length * columns.length)) * 100) : 100}%
              </div>
              <div className="text-xs text-gray-500">Clean Rate</div>
            </div>
          </div>

          {/* Source breakdown */}
          {stats.total > 0 && (
            <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-gray-100">
              {stats.ai > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                  <div className="w-2 h-2  bg-amber-400" />
                  <span className="font-mono tabular-nums">{stats.ai}</span> AI fixes
                </div>
              )}
              {stats.whatsapp > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                  <div className="w-2 h-2  bg-violet-400" />
                  <span className="font-mono tabular-nums">{stats.whatsapp}</span> WhatsApp
                </div>
              )}
              {stats.manual > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                  <div className="w-2 h-2  bg-blue-400" />
                  <span className="font-mono tabular-nums">{stats.manual}</span> Manual
                </div>
              )}
              {stats.duplicate > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                  <div className="w-2 h-2  bg-orange-400" />
                  <span className="font-mono tabular-nums">{stats.duplicate}</span> Duplicates
                </div>
              )}
            </div>
          )}
        </div>

        {/* Changes list */}
        <div className="max-h-[400px] overflow-y-auto">
          {changes.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Check className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No changes recorded yet</p>
              <p className="text-xs text-gray-400 mt-1">
                Changes will appear here as you fix issues
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {changes.slice(0, 50).map((change, index) => (
                <div
                  key={index}
                  className="px-6 py-3 flex items-center gap-4 hover:bg-gray-50 transition-colors"
                >
                  {/* Row indicator */}
                  <div className="flex-shrink-0 w-10 text-right">
                    <span className="text-xs font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 ">
                      R{change.rowIndex}
                    </span>
                  </div>

                  {/* Column */}
                  <div className="flex-shrink-0 w-24">
                    <span className="text-xs font-medium text-gray-600 truncate block">
                      {change.column}
                    </span>
                  </div>

                  {/* Before → After */}
                  <div className="flex-1 flex items-center gap-2 min-w-0">
                    <div className="flex-1 min-w-0">
                      <span
                        className="text-sm text-red-600 line-through truncate block font-mono"
                        title={change.original}
                      >
                        {change.original}
                      </span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span
                        className="text-sm text-emerald-600 font-medium truncate block font-mono"
                        title={change.cleaned}
                      >
                        {change.cleaned}
                      </span>
                    </div>
                  </div>

                  {/* Source badge */}
                  <div className="flex-shrink-0">
                    {change.source === "ai" && (
                      <span className="text-[10px] px-1.5 py-0.5  bg-amber-100 text-amber-700">
                        AI
                      </span>
                    )}
                    {change.source === "whatsapp" && (
                      <span className="text-[10px] px-1.5 py-0.5  bg-violet-100 text-violet-700 flex items-center gap-1">
                        <MessageCircle className="h-2.5 w-2.5" /> WA
                      </span>
                    )}
                    {change.source === "manual" && (
                      <span className="text-[10px] px-1.5 py-0.5  bg-blue-100 text-blue-700">
                        Manual
                      </span>
                    )}
                    {change.source === "duplicate" && (
                      <span className="text-[10px] px-1.5 py-0.5  bg-orange-100 text-orange-700">
                        Dup
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {changes.length > 50 && (
                <div className="px-6 py-3 text-center text-xs text-gray-400">
                  +{changes.length - 50} more changes
                </div>
              )}
            </div>
          )}
        </div>

        {/* Warning if remaining issues */}
        {remainingIssues > 0 && (
          <div className="px-6 py-3 bg-amber-50 border-t border-amber-100 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span className="text-sm text-amber-800">
              {remainingIssues} issue{remainingIssues > 1 ? "s" : ""} remaining. You can still export, but consider reviewing them first.
            </span>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="relative">
            <button
              onClick={() => setShowFormatDropdown(!showFormatDropdown)}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {exportFormat === "json" ? (
                <FileJson className="h-4 w-4 text-blue-600" />
              ) : (
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              )}
              <span>{EXPORT_FORMATS.find(f => f.value === exportFormat)?.label}</span>
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </button>
            {showFormatDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowFormatDropdown(false)} />
                <div className="absolute bottom-full left-0 mb-2 w-56 bg-white border border-gray-200 rounded-lg shadow-xl z-50">
                  {EXPORT_FORMATS.map((format) => (
                    <button
                      key={format.value}
                      onClick={() => {
                        setExportFormat(format.value);
                        setShowFormatDropdown(false);
                      }}
                      className={cn(
                        "w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center justify-between first:rounded-t-lg last:rounded-b-lg",
                        exportFormat === format.value && "bg-emerald-50"
                      )}
                    >
                      <div>
                        <div className="text-sm font-medium text-gray-900">{format.label}</div>
                        <div className="text-xs text-gray-500">{format.description}</div>
                      </div>
                      {exportFormat === format.value && (
                        <Check className="h-4 w-4 text-emerald-600" />
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download {EXPORT_FORMATS.find(f => f.value === exportFormat)?.label}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

