"use client";

import { useState } from "react";
import { Send, Check, Clock, ExternalLink, RefreshCw, Copy, CheckCircle2 } from "lucide-react";
import { useGridStore } from "@/store/useGridStore";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function WhatsAppPanel() {
  const { whatsappRequests, isPolling } = useGridStore();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const pendingCount = whatsappRequests.filter((r) => r.status === "pending").length;
  const repliedCount = whatsappRequests.filter((r) => r.status === "replied").length;

  // Polling is now handled in DataGrid to ensure it runs regardless of which tab is active

  const copyFormLink = async (requestId: string) => {
    const formLink = `${window.location.origin}/verify/${requestId}`;
    await navigator.clipboard.writeText(formLink);
    setCopiedId(requestId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openFormLink = (requestId: string) => {
    const formLink = `${window.location.origin}/verify/${requestId}`;
    window.open(formLink, '_blank');
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Stats */}
      <div className="flex items-center gap-4 p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex-1 text-center">
          <div className="flex items-center justify-center gap-1">
            <p className="text-2xl font-bold text-orange-600">{pendingCount}</p>
            {isPolling && pendingCount > 0 && (
              <RefreshCw className="h-3 w-3 text-orange-500 animate-spin" />
            )}
          </div>
          <p className="text-xs text-gray-500">Pending</p>
        </div>
        <div className="w-px h-8 bg-gray-200" />
        <div className="flex-1 text-center">
          <p className="text-2xl font-bold text-green-600">{repliedCount}</p>
          <p className="text-xs text-gray-500">Replied</p>
        </div>
      </div>

      {/* Requests list */}
      <div className="flex-1 overflow-auto">
        {whatsappRequests.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-500">
            <Send className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p>No WhatsApp requests yet</p>
            <p className="text-xs mt-1">
              Click on a missing field to send a request
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {whatsappRequests.map((request) => (
              <div
                key={request.id}
                className={cn(
                  "p-3 transition-colors",
                  request.status === "replied" && "bg-green-50/50"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {request.recipientName}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {request.recipientPhone}
                    </p>
                  </div>
                  {request.status === "pending" ? (
                    <Clock className="h-4 w-4 text-orange-500 shrink-0" />
                  ) : (
                    <Check className="h-4 w-4 text-green-600 shrink-0" />
                  )}
                </div>

                <div className="mt-2 text-xs">
                  <span className="text-gray-500">Requested: </span>
                  <span className="font-medium text-gray-700">
                    {request.missingField}
                  </span>
                </div>

                {request.status === "replied" && request.repliedValue && (
                  <div className="mt-1 text-xs">
                    <span className="text-gray-500">Response: </span>
                    <span className="font-medium text-green-700">
                      {request.repliedValue}
                    </span>
                  </div>
                )}

                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[10px] text-gray-400">
                    {formatTime(request.sentAt)}
                    {request.repliedAt && ` → ${formatTime(request.repliedAt)}`}
                  </span>

                  {request.status === "pending" && (
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-xs px-2"
                        onClick={() => copyFormLink(request.id)}
                        title="Copy form link"
                      >
                        {copiedId === request.id ? (
                          <CheckCircle2 className="h-3 w-3 text-green-600" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-xs"
                        onClick={() => openFormLink(request.id)}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Open Form
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
