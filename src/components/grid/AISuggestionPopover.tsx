"use client";

import { useRef, useEffect, useLayoutEffect, useState } from "react";
import { X, Check, AlertTriangle, ArrowRight, Clock, Loader2, CheckCircle, Copy, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CellStatus } from "@/types";
import { cn, getFormatDescription } from "@/lib/utils";
import { useGridStore } from "@/store/useGridStore";

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface AISuggestionPopoverProps {
  anchorEl: HTMLElement | null;
  status: CellStatus;
  rowId: string;
  columnKey: string;
  onApply: () => void;
  onReject: () => void;
  onFixColumn: () => void;
}

export function AISuggestionPopover({
  anchorEl,
  status,
  rowId,
  columnKey,
  onApply,
  onReject,
  onFixColumn,
}: AISuggestionPopoverProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [showOverrideInput, setShowOverrideInput] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendStatus, setSendStatus] = useState<"idle" | "success" | "error">("idle");
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const { sendWhatsAppRequest, rows, whatsappRequests, resolveDuplicate, overrideCritical, setActiveCell } = useGridStore();
  const popoverRef = useRef<HTMLDivElement>(null);

  const row = rows.find((r) => r.id === rowId);
  const hasPhoneNumber = !!(row?.data?.phone || row?.phoneNumber);
  
  const existingRequest = whatsappRequests.find(
    (r) => r.rowId === rowId && r.missingField === columnKey
  );
  const alreadySent = !!existingRequest;

  useEffect(() => {
    setIsVisible(true);
    return () => setIsVisible(false);
  }, []);

  useLayoutEffect(() => {
    if (!anchorEl || !document.body.contains(anchorEl)) {
      setPosition(null);
      return;
    }

    const updatePosition = () => {
      const rect = anchorEl.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 6,
        left: rect.left,
      });
    };

    updatePosition();

    const resizeObserver = new ResizeObserver(updatePosition);
    resizeObserver.observe(anchorEl);

    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [anchorEl]);

  if (!anchorEl || !document.body.contains(anchorEl)) {
    return null;
  }

  const handleWhatsAppRequest = async () => {
    setIsSending(true);
    setSendStatus("idle");
    try {
      await sendWhatsAppRequest(rowId, columnKey);
      setSendStatus("success");
    } catch {
      setSendStatus("error");
      setTimeout(() => setSendStatus("idle"), 2000);
    } finally {
      setIsSending(false);
    }
  };

  const getStateTitle = () => {
    switch (status.state) {
      case "ai-suggestion":
        return "Suggested Fix";
      case "duplicate":
        return "Duplicate Warning";
      case "critical":
        return status.source === "missing" ? "Missing Data" : "Requires Review";
      default:
        return "Review Required";
    }
  };

  return (
    <div
      ref={popoverRef}
      style={{
        position: "fixed",
        top: position?.top ?? 0,
        left: position?.left ?? 0,
        zIndex: 50,
      }}
      className="z-50"
    >
      <div
        className={cn(
          "w-80 max-h-[360px] bg-white border border-gray-300 shadow-lg flex flex-col",
          "transition-opacity duration-150 ease-out",
          isVisible ? "opacity-100" : "opacity-0"
        )}
      >
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-800">
              {getStateTitle()}
            </span>
            {status.confidence && (
              <span className="text-xs text-gray-500">
                {Math.round(status.confidence * 100)}% confident
              </span>
            )}
          </div>
          <button
            onClick={onReject}
            className="p-1 hover:bg-gray-100 transition-colors"
          >
            <X className="h-4 w-4 text-gray-400" />
          </button>
        </div>

        <div className="p-3 space-y-3 overflow-y-auto flex-1">
          {status.originalValue && (
            <div className="space-y-2">
              {/* Before/After visual */}
              <div className="flex items-center gap-2 text-sm">
                <div className="flex-1 px-2 py-1.5 bg-red-50 border border-red-100 text-red-700 truncate" title={status.originalValue}>
                  {status.originalValue}
                </div>
                {status.suggestion && (
                  <>
                    <ArrowRight className="h-4 w-4 text-gray-400 shrink-0" />
                    <div className="flex-1 px-2 py-1.5 bg-green-50 border border-green-100 text-green-700 font-medium truncate" title={status.suggestion}>
                      {status.suggestion}
                    </div>
                  </>
                )}
              </div>
              {/* Format hint */}
              {getFormatDescription(columnKey) && (
                <p className="text-[10px] text-gray-400">
                  Expected format: {getFormatDescription(columnKey)}
                </p>
              )}
            </div>
          )}

          {status.message && (
            <p className="text-xs text-gray-600 bg-gray-50 px-2 py-1.5">{status.message}</p>
          )}

          {status.state === "duplicate" && status.duplicateInfo && (
            <div className="bg-orange-50 border border-orange-200 p-3 space-y-2">
              <div className="flex items-center gap-2 text-orange-700">
                <Copy className="h-4 w-4" />
                <span className="text-sm font-medium">Previous Transaction Found</span>
              </div>
              
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="h-3 w-3 text-orange-500" />
                  <span>
                    Paid on{" "}
                    <span className="font-medium text-gray-800">
                      {status.duplicateInfo.matchedAt.toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  </span>
                </div>
                
                <div className="bg-white border border-orange-100 p-2 space-y-1 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Payee:</span>
                    <span className="text-gray-800">{status.duplicateInfo.matchedData.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Amount:</span>
                    <span className="text-gray-800">RM {status.duplicateInfo.matchedData.amount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Account:</span>
                    <span className="text-gray-800">{status.duplicateInfo.matchedData.accountNumber}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 pt-1">
                  <div className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    status.duplicateInfo.similarity === 1 ? "bg-red-500" : "bg-orange-400"
                  )} />
                  <span className="text-gray-500">
                    {status.duplicateInfo.similarity === 1 
                      ? "Exact match" 
                      : `${Math.round(status.duplicateInfo.similarity * 100)}% similarity`}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50">
          {status.state === "ai-suggestion" && status.suggestion && (
            <>
              <Button size="sm" onClick={onApply} className="flex-1 justify-center" title="Accept this fix and move to next issue">
                <Check className="h-4 w-4" />
                <kbd className="ml-2 px-1.5 py-0.5 text-[10px] bg-gray-700 text-white">
                  Tab
                </kbd>
              </Button>
              <Button size="sm" variant="destructive" onClick={onReject} title="Keep original value" className="justify-center bg-red-500 hover:bg-red-600">
                <X className="h-4 w-4" />
                <kbd className="ml-2 px-1.5 py-0.5 text-[10px] bg-red-700 text-white">
                  Esc
                </kbd>
              </Button>
            </>
          )}

          {status.state === "ai-suggestion" && (
            <Button
              size="sm"
              variant="outline"
              onClick={onFixColumn}
              className="flex-1 justify-center"
              title="Apply all suggestions in this column (Shift+Tab)"
            >
              Fix All
              <kbd className="ml-2 px-1.5 py-0.5 text-[10px] bg-gray-200 text-gray-600">
                ⇧Tab
              </kbd>
            </Button>
          )}

          {status.state === "critical" && (
            <>
              {/* WhatsApp option for missing fields */}
              {status.source === "missing" && hasPhoneNumber && (
                alreadySent || sendStatus === "success" ? (
                  <div className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs bg-green-50 border border-green-200 text-green-700">
                    <CheckCircle className="h-3 w-3" />
                    <span>Sent {existingRequest ? formatRelativeTime(existingRequest.sentAt) : "just now"}</span>
                    {existingRequest?.status === "pending" && (
                      <span className="text-orange-500 font-medium">• Waiting</span>
                    )}
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleWhatsAppRequest}
                    disabled={isSending}
                    className={cn(
                      "flex-1 transition-all",
                      sendStatus === "error" 
                        ? "text-red-600 border-red-300 bg-red-50" 
                        : "text-green-600 border-green-300 hover:bg-green-50"
                    )}
                  >
                    {isSending ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                        Sending...
                      </>
                    ) : sendStatus === "error" ? (
                      <>
                        <X className="h-3 w-3 mr-1" />
                        Failed - Retry
                      </>
                    ) : (
                      <>
                        <svg className="h-3 w-3 mr-1.5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                        Request via WhatsApp
                      </>
                    )}
                  </Button>
                )
              )}
              
              {/* Override option for sanctioned entities or PDF mismatches */}
              {(status.source === "ai" || status.source === "pdf") && !showOverrideInput && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowOverrideInput(true)}
                    className="flex-1 text-amber-600 border-amber-300 hover:bg-amber-50"
                  >
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Override with Reason
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      resolveDuplicate(rowId, columnKey, "skip");
                      setActiveCell(null);
                    }}
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Skip Row
                  </Button>
                </>
              )}
              
              {/* Override reason input */}
              {showOverrideInput && (
                <div className="w-full space-y-2">
                  <input
                    type="text"
                    placeholder="Enter reason for override..."
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        if (overrideReason.trim()) {
                          overrideCritical(rowId, columnKey, overrideReason);
                          setActiveCell(null);
                          setShowOverrideInput(false);
                          setOverrideReason("");
                        }
                      }}
                      disabled={!overrideReason.trim()}
                      className="flex-1"
                    >
                      <Check className="h-3 w-3 mr-1" />
                      Confirm
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setShowOverrideInput(false);
                        setOverrideReason("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

          {status.state === "duplicate" && (
            <>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => {
                  resolveDuplicate(rowId, columnKey, "proceed");
                  setActiveCell(null);
                }} 
                className="flex-1 text-green-600 border-green-300 hover:bg-green-50"
                title="Keep this payment - it's intentional"
              >
                <Check className="h-3 w-3 mr-1" />
                Proceed
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => {
                  resolveDuplicate(rowId, columnKey, "skip");
                  setActiveCell(null);
                }} 
                className="flex-1 text-orange-600 border-orange-300 hover:bg-orange-50"
                title="Remove from batch - it's a duplicate"
              >
                <X className="h-3 w-3 mr-1" />
                Skip Row
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
