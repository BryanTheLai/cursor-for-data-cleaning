"use client";

import { useState, useCallback } from "react";
import { Upload, FileSpreadsheet, ArrowRight, X, Check, AlertTriangle, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { parseFile, getSampleRows, type ParsedFile } from "@/lib/fileParser";
import type { ColumnMappingResult } from "@/lib/groq";
import { PAYROLL_RULES, getTargetSchemaFromRules } from "@/lib/rulesEngine";

type WizardStep = "upload" | "mapping" | "review";

interface TargetColumn {
  key: string;
  label: string;
  type: string;
  required: boolean;
  rules?: string;
}

const DEFAULT_TARGET_SCHEMA: TargetColumn[] = getTargetSchemaFromRules(PAYROLL_RULES).map(f => ({
  key: f.key,
  label: f.label,
  type: f.type,
  required: f.required,
  rules: f.rules || undefined,
}));

interface ImportWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (data: ImportResult) => void;
}

export interface ImportResult {
  fileName: string;
  mappings: Record<string, string | null>;
  rawRows: Record<string, string>[];
  targetSchema: TargetColumn[];
  unmappedSourceColumns: string[];
  missingRequiredTargets: string[];
}

function SourcePill({ 
  name, 
  sampleValue, 
  confidence,
  isSelected,
  onClick 
}: { 
  name: string; 
  sampleValue?: string;
  confidence?: number;
  isSelected?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex flex-col px-3 py-2  border transition-all w-[200px] shrink-0",
        isSelected 
          ? "border-blue-400 bg-blue-50 shadow-sm" 
          : "border-gray-200 bg-white hover:border-gray-300",
        onClick && "cursor-pointer"
      )}
    >
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-800">{name}</span>
        {confidence !== undefined && confidence > 0 && (
          <span className={cn(
            "text-[10px] px-1.5 py-0.5  font-medium shrink-0",
            confidence >= 0.8 ? "bg-emerald-100 text-emerald-700" :
            confidence >= 0.6 ? "bg-amber-100 text-amber-700" :
            "bg-gray-100 text-gray-600"
          )}>
            {Math.round(confidence * 100)}%
          </span>
        )}
      </div>
      {sampleValue && (
        <span className="text-xs text-gray-400 mt-0.5 break-words">{sampleValue}</span>
      )}
    </div>
  );
}

function TargetPill({ 
  name, 
  required,
  isEmpty,
  isSelected,
  onClick 
}: { 
  name: string; 
  required?: boolean;
  isEmpty?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-1 px-3 py-2.5  border transition-all flex-1",
        isEmpty 
          ? "border-dashed border-gray-300 bg-gray-50" 
          : isSelected 
            ? "border-blue-400 bg-blue-50 shadow-sm"
            : "border-gray-200 bg-white hover:border-gray-300",
        onClick && "cursor-pointer"
      )}
    >
      <span className={cn(
        "text-sm font-medium",
        isEmpty ? "text-gray-400 italic" : "text-gray-800"
      )}>
        {isEmpty ? "Not mapped" : name}
      </span>
      {required && !isEmpty && (
        <span className="text-red-500 text-xs shrink-0">*</span>
      )}
    </div>
  );
}

function MappingSection({ 
  title, 
  count, 
  icon,
  defaultOpen = true,
  children 
}: { 
  title: string; 
  count: number;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  if (count === 0) return null;
  
  return (
    <div className="border border-gray-200  overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium text-gray-700">{title}</span>
          <span className="text-xs text-gray-400 bg-gray-200 px-2 py-0.5 ">{count}</span>
        </div>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        )}
      </button>
      {isOpen && (
        <div className="p-4 space-y-3 bg-white">
          {children}
        </div>
      )}
    </div>
  );
}

function MappingRow({
  sourceCol,
  targetKey,
  confidence,
  sampleValue,
  targetSchema,
  mappedTargets,
  onMappingChange,
  onIgnore,
}: {
  sourceCol: string;
  targetKey: string | null;
  confidence: number;
  sampleValue?: string;
  targetSchema: TargetColumn[];
  mappedTargets: Set<string>;
  onMappingChange: (targetKey: string | null) => void;
  onIgnore: () => void;
}) {
  const [isSelecting, setIsSelecting] = useState(false);
  const targetCol = targetSchema.find(t => t.key === targetKey);

  return (
    <div className="flex items-center gap-4">
      <SourcePill 
        name={sourceCol} 
        sampleValue={sampleValue}
        confidence={confidence}
      />
      
      <ArrowRight className="h-4 w-4 text-gray-400 shrink-0" />
      
      <div className="relative flex-1 min-w-0">
        {isSelecting && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsSelecting(false)}
            />
            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200  shadow-xl py-1 max-h-[200px] overflow-auto">
              <button
                onClick={() => {
                  onMappingChange(null);
                  setIsSelecting(false);
                }}
                className="w-full px-3 py-2 text-left text-sm text-gray-400 hover:bg-gray-50"
              >
                Not mapped
              </button>
              {targetSchema.map((col) => {
                const isUsed = mappedTargets.has(col.key) && targetKey !== col.key;
                return (
                  <button
                    key={col.key}
                    onClick={() => {
                      if (!isUsed) {
                        onMappingChange(col.key);
                        setIsSelecting(false);
                      }
                    }}
                    disabled={isUsed}
                    className={cn(
                      "w-full px-3 py-2 text-left text-sm flex items-center justify-between",
                      isUsed 
                        ? "text-gray-300 cursor-not-allowed" 
                        : "text-gray-700 hover:bg-gray-50"
                    )}
                  >
                    <span>{col.label} {col.required && <span className="text-red-500">*</span>}</span>
                    {isUsed && <span className="text-xs text-gray-300">Used</span>}
                  </button>
                );
              })}
            </div>
          </>
        )}
        
        <div onClick={() => setIsSelecting(!isSelecting)} className="cursor-pointer">
          <TargetPill
            name={targetCol?.label || ""}
            required={targetCol?.required}
            isEmpty={!targetKey}
            isSelected={isSelecting}
          />
        </div>
      </div>

      <button
        onClick={onIgnore}
        className={cn(
          "p-1.5  transition-colors shrink-0",
          targetKey 
            ? "text-transparent pointer-events-none" 
            : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
        )}
        title="Ignore this column"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ImportWizard({ isOpen, onClose, onImportComplete }: ImportWizardProps) {
  const [step, setStep] = useState<WizardStep>("upload");
  const [parsedFile, setParsedFile] = useState<ParsedFile | null>(null);
  const [mappingResult, setMappingResult] = useState<ColumnMappingResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const [manualMappings, setManualMappings] = useState<Record<string, string | null>>({});
  const [ignoredColumns, setIgnoredColumns] = useState<Set<string>>(new Set());

  const targetSchema = DEFAULT_TARGET_SCHEMA;

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processFile = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);
    
    console.log("[IMPORT] Processing file:", file.name);
    
    try {
      const parsed = await parseFile(file);
      setParsedFile(parsed);
      
      console.log("[IMPORT] File parsed successfully", {
        headers: parsed.headers,
        rowCount: parsed.rowCount,
      });

      console.log("[MAPPING] Sending to AI for column mapping...");
      
      const response = await fetch("/api/ai/map-columns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceHeaders: parsed.headers,
          sampleRows: getSampleRows(parsed.rows, 5),
          targetSchema: targetSchema.map(col => ({
            key: col.key,
            label: col.label,
            type: col.type,
            required: col.required,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to map columns");
      }

      const mapping: ColumnMappingResult = await response.json();
      
      console.log("[MAPPING] AI mapping result:", mapping);
      
      setMappingResult(mapping);
      setManualMappings(mapping.mappings);
      setStep("mapping");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to process file";
      console.error("[IMPORT] Error:", message);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [targetSchema]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      await processFile(file);
    }
  }, [processFile]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processFile(file);
    }
  }, [processFile]);

  const getMergedMappings = (): Record<string, string | null> => {
    return { ...mappingResult?.mappings, ...manualMappings };
  };

  const getMappedTargets = (): Set<string> => {
    const mappings = getMergedMappings();
    return new Set(Object.values(mappings).filter((v): v is string => v !== null));
  };

  const getUnmappedSourceColumns = (): string[] => {
    if (!parsedFile) return [];
    const mappings = getMergedMappings();
    return parsedFile.headers.filter(h => mappings[h] === null && !ignoredColumns.has(h));
  };

  const getMissingRequiredTargets = (): string[] => {
    const mappedTargets = getMappedTargets();
    return targetSchema
      .filter(col => col.required && !mappedTargets.has(col.key))
      .map(col => col.label);
  };

  const handleMappingChange = (sourceCol: string, targetKey: string | null) => {
    console.log("[MAPPING] Manual change:", sourceCol, "→", targetKey);
    setManualMappings(prev => ({ ...prev, [sourceCol]: targetKey }));
  };

  const handleIgnoreColumn = (sourceCol: string) => {
    console.log("[MAPPING] Ignoring column:", sourceCol);
    setIgnoredColumns(prev => new Set([...prev, sourceCol]));
    setManualMappings(prev => ({ ...prev, [sourceCol]: null }));
  };

  const handleContinue = () => {
    if (step === "mapping") {
      setStep("review");
    } else if (step === "review") {
      handleImport();
    }
  };

  const handleBack = () => {
    if (step === "mapping") {
      setStep("upload");
      setParsedFile(null);
      setMappingResult(null);
    } else if (step === "review") {
      setStep("mapping");
    }
  };

  const handleImport = () => {
    if (!parsedFile) return;

    const result: ImportResult = {
      fileName: parsedFile.fileName,
      mappings: getMergedMappings(),
      rawRows: parsedFile.rows,
      targetSchema,
      unmappedSourceColumns: getUnmappedSourceColumns(),
      missingRequiredTargets: getMissingRequiredTargets(),
    };

    console.log("[IMPORT] Import complete:", {
      fileName: result.fileName,
      rowCount: result.rawRows.length,
      mappedColumns: Object.entries(result.mappings).filter(([, v]) => v !== null).length,
      unmappedColumns: result.unmappedSourceColumns.length,
      missingRequired: result.missingRequiredTargets.length,
    });

    onImportComplete(result);
    handleClose();
  };

  const handleClose = () => {
    setStep("upload");
    setParsedFile(null);
    setMappingResult(null);
    setManualMappings({});
    setIgnoredColumns(new Set());
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  const mappings = getMergedMappings();
  const mappedTargets = getMappedTargets();
  const unmappedSourceColumns = getUnmappedSourceColumns();
  const missingRequiredTargets = getMissingRequiredTargets();

  const recommendedMappings = parsedFile?.headers.filter(h => 
    mappings[h] !== null && !ignoredColumns.has(h)
  ) || [];
  
  const unmappedColumns = parsedFile?.headers.filter(h => 
    mappings[h] === null && !ignoredColumns.has(h)
  ) || [];

  const missingTargets = targetSchema.filter(t => !mappedTargets.has(t.key));

  const getSampleValue = (col: string) => {
    if (!parsedFile || parsedFile.rows.length === 0) return undefined;
    return parsedFile.rows[0][col];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-3xl bg-white  shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Import Data</h2>
          </div>
          <button onClick={handleClose} className="p-1 hover:bg-gray-100 ">
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        <div className="flex items-center gap-2 px-6 py-3 bg-gray-50 border-b border-gray-200">
          {["upload", "mapping", "review"].map((s, i) => (
            <div key={s} className="flex items-center">
              <div className={cn(
                "w-8 h-8  flex items-center justify-center text-sm font-medium",
                step === s ? "bg-blue-600 text-white" :
                ["mapping", "review"].indexOf(step) > i ? "bg-green-600 text-white" :
                "bg-gray-200 text-gray-500"
              )}>
                {["mapping", "review"].indexOf(step) > i ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span className={cn(
                "ml-2 text-sm",
                step === s ? "text-gray-900 font-medium" : "text-gray-500"
              )}>
                {s === "upload" ? "Upload" : s === "mapping" ? "Map Columns" : "Review"}
              </span>
              {i < 2 && <ArrowRight className="h-4 w-4 text-gray-300 mx-3" />}
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-auto p-6">
          {step === "upload" && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                "border-2 border-dashed  p-12 text-center transition-colors",
                isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400",
                isLoading && "opacity-50 pointer-events-none"
              )}
            >
              {isLoading ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
                  <p className="text-gray-600">Processing file...</p>
                </div>
              ) : (
                <>
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-700 mb-2">
                    Drop your file here
                  </p>
                  <p className="text-sm text-gray-500 mb-4">
                    Supports CSV and Excel (.xlsx, .xls)
                  </p>
                  <label className="inline-block">
                    <input
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <span className="px-4 py-2 bg-blue-600 text-white  cursor-pointer hover:bg-blue-700 transition-colors">
                      Browse Files
                    </span>
                  </label>
                </>
              )}
            </div>
          )}

          {step === "mapping" && parsedFile && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">{parsedFile.fileName}</h3>
                  <p className="text-sm text-gray-500">{parsedFile.rowCount} rows detected</p>
                </div>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 ">
                  AI-mapped with Groq
                </span>
              </div>

              <MappingSection 
                title="Recommended" 
                count={recommendedMappings.length}
                icon={<Check className="h-4 w-4 text-emerald-600" />}
              >
                {recommendedMappings.map((sourceCol) => (
                  <MappingRow
                    key={sourceCol}
                    sourceCol={sourceCol}
                    targetKey={mappings[sourceCol]}
                    confidence={mappingResult?.confidence[sourceCol] || 0}
                    sampleValue={getSampleValue(sourceCol)}
                    targetSchema={targetSchema}
                    mappedTargets={mappedTargets}
                    onMappingChange={(targetKey) => handleMappingChange(sourceCol, targetKey)}
                    onIgnore={() => handleIgnoreColumn(sourceCol)}
                  />
                ))}
              </MappingSection>

              <MappingSection 
                title="Unmapped Fields" 
                count={unmappedColumns.length}
                icon={<div className="w-4 h-4 border-2 border-dashed border-gray-400 " />}
              >
                {unmappedColumns.map((sourceCol) => (
                  <MappingRow
                    key={sourceCol}
                    sourceCol={sourceCol}
                    targetKey={mappings[sourceCol]}
                    confidence={0}
                    sampleValue={getSampleValue(sourceCol)}
                    targetSchema={targetSchema}
                    mappedTargets={mappedTargets}
                    onMappingChange={(targetKey) => handleMappingChange(sourceCol, targetKey)}
                    onIgnore={() => handleIgnoreColumn(sourceCol)}
                  />
                ))}
              </MappingSection>

              {missingTargets.length > 0 && (
                <MappingSection 
                  title="Missing Target Fields" 
                  count={missingTargets.filter(t => t.required).length}
                  icon={<AlertTriangle className="h-4 w-4 text-amber-500" />}
                >
                  <div className="space-y-3">
                    {missingTargets.map((target) => (
                      <div key={target.key} className="flex items-center gap-4">
                        <div className="flex items-center px-3 py-2.5  border border-dashed border-gray-300 bg-gray-50 w-[200px] shrink-0">
                          <span className="text-sm text-gray-400 italic">Empty</span>
                        </div>
                        <ArrowRight className="h-4 w-4 text-gray-400 shrink-0" />
                        <div className="flex items-center gap-2 flex-1">
                          <TargetPill
                            name={target.label}
                            required={target.required}
                          />
                          {target.required && (
                            <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1  shrink-0">
                              Required
                            </span>
                          )}
                        </div>
                        <div className="w-[28px]" />
                      </div>
                    ))}
                    <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-100">
                      Required fields will be imported as empty and marked CRITICAL. You can request this data via WhatsApp.
                    </p>
                  </div>
                </MappingSection>
              )}

              {ignoredColumns.size > 0 && (
                <MappingSection 
                  title="Ignored" 
                  count={ignoredColumns.size}
                  icon={<X className="h-4 w-4 text-gray-400" />}
                  defaultOpen={false}
                >
                  <div className="flex flex-wrap gap-2">
                    {Array.from(ignoredColumns).map((col) => (
                      <div key={col} className="flex items-center gap-1 px-2 py-1 bg-gray-100  text-sm text-gray-500">
                        <span className="line-through">{col}</span>
                        <button
                          onClick={() => {
                            setIgnoredColumns(prev => {
                              const newSet = new Set(prev);
                              newSet.delete(col);
                              return newSet;
                            });
                          }}
                          className="ml-1 text-blue-600 hover:text-blue-700"
                        >
                          Undo
                        </button>
                      </div>
                    ))}
                  </div>
                </MappingSection>
              )}
            </div>
          )}

          {step === "review" && parsedFile && (
            <div className="space-y-6">
              <div className="p-4 bg-blue-50 border border-blue-200 ">
                <h3 className="font-medium text-blue-900 mb-2">Ready to Import</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• <strong>{parsedFile.rowCount}</strong> rows will be imported</li>
                  <li>• <strong>{Object.values(getMergedMappings()).filter(v => v !== null).length}</strong> columns mapped to schema</li>
                  {unmappedSourceColumns.length > 0 && (
                    <li>• <strong>{unmappedSourceColumns.length}</strong> extra columns preserved in raw data</li>
                  )}
                  {missingRequiredTargets.length > 0 && (
                    <li className="text-orange-700">• <strong>{missingRequiredTargets.length}</strong> required fields missing — will be marked critical</li>
                  )}
                </ul>
              </div>

              <div className="border border-gray-200  overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                  <span className="text-sm font-medium text-gray-700">Preview (first 5 rows)</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        {targetSchema.map((col) => (
                          <th key={col.key} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            {col.label}
                            {col.required && <span className="text-red-500 ml-1">*</span>}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {getSampleRows(parsedFile.rows, 5).map((row, i) => {
                        const inverseMap: Record<string, string> = {};
                        Object.entries(mappings).forEach(([src, tgt]) => {
                          if (tgt) inverseMap[tgt] = src;
                        });

                        return (
                          <tr key={i} className="border-t border-gray-100">
                            {targetSchema.map((col) => {
                              const sourceCol = inverseMap[col.key];
                              const value = sourceCol ? row[sourceCol] : "";
                              const isMissing = col.required && !value;

                              return (
                                <td
                                  key={col.key}
                                  className={cn(
                                    "px-3 py-2",
                                    isMissing ? "bg-red-50 text-red-500 italic" : "text-gray-700"
                                  )}
                                >
                                  {value || (isMissing ? "Missing" : "-")}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200  text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50 ">
          <div>
            {step !== "upload" && (
              <Button variant="ghost" onClick={handleBack}>
                Back
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            {step !== "upload" && (
              <Button onClick={handleContinue}>
                {step === "review" ? "Import" : "Continue"}
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
