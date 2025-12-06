"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X, MessageCircle, Check, AlertTriangle } from "lucide-react";
import { useGridStore } from "@/store/useGridStore";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SendState = "idle" | "sending" | "sent" | "error";

export function PayModal({ isOpen, onClose }: PayModalProps) {
  const { rows, sendWhatsAppRequest } = useGridStore();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sendStatus, setSendStatus] = useState<Record<string, SendState>>({});
  const [isSending, setIsSending] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const candidates = useMemo(() => {
    const fallback = "+60138509983";
    return rows
      .map((row) => {
        const phone = row.data.phone || row.phoneNumber || fallback;
        if (!phone) return null;
        return {
          id: row.id,
          name: row.data.name || "Unknown",
          phone,
          amount: row.data.amount || "0.00",
          bank: row.data.bank || "N/A",
          accountNumber: row.data.accountNumber || "",
          date: row.data.date || "",
        };
      })
      .filter((item): item is NonNullable<typeof item> => !!item);
  }, [rows]);

  useEffect(() => {
    if (isOpen) {
      setSelected(new Set(candidates.map((c) => c.id)));
      setSendStatus({});
      setIsSending(false);
    }
  }, [isOpen, candidates]);

  if (!isOpen || !hasMounted) return null;

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(candidates.map((c) => c.id)));
  const clearAll = () => setSelected(new Set());

  const handleSend = async () => {
    if (selected.size === 0) return;
    setIsSending(true);
    const nextStatus: Record<string, SendState> = {};

    await Promise.allSettled(
      candidates
        .filter((c) => selected.has(c.id))
        .map(async (candidate) => {
          nextStatus[candidate.id] = "sending";
          setSendStatus({ ...nextStatus });
          try {
            await sendWhatsAppRequest(candidate.id, "phone", {
              missingFields: ["payment-details"],
              details: {
                amount: candidate.amount,
                bank: candidate.bank,
                accountNumber: candidate.accountNumber,
                date: candidate.date,
              },
            });
            nextStatus[candidate.id] = "sent";
          } catch (error) {
            console.error("[PAY] send failed", error);
            nextStatus[candidate.id] = "error";
          }
        })
    );

    setSendStatus({ ...nextStatus });
    setIsSending(false);
  };

  const sentCount = Object.values(sendStatus).filter((s) => s === "sent").length;
  const errorCount = Object.values(sendStatus).filter((s) => s === "error").length;

  const content = (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-3xl bg-white shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <MessageCircle className="h-5 w-5 text-emerald-600" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Send payment details</h2>
              <p className="text-sm text-gray-500">Select the numbers to receive WhatsApp payment details</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 transition-colors">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-3 bg-amber-50 border-b border-amber-100 text-sm text-amber-800 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          Pick your own number before sending. This demo sends a WhatsApp preview with the payment details for each selected row.
        </div>

        <div className="px-6 py-3 flex items-center gap-3 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <span className="font-medium">{selected.size}</span>
            <span className="text-gray-500">selected</span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={selectAll}>
              Select all
            </Button>
            <Button size="sm" variant="ghost" onClick={clearAll}>
              Clear
            </Button>
          </div>
          <div className="flex-1" />
          {sentCount > 0 && (
            <div className="text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded">
              Sent {sentCount} message{sentCount === 1 ? "" : "s"}
            </div>
          )}
          {errorCount > 0 && (
            <div className="text-xs text-red-700 bg-red-50 px-2 py-1 rounded">
              {errorCount} failed
            </div>
          )}
        </div>

        <div className="max-h-[420px] overflow-y-auto divide-y divide-gray-100">
          {candidates.length === 0 ? (
            <div className="p-6 text-sm text-gray-500">No rows with phone numbers available.</div>
          ) : (
            candidates.map((c) => {
              const status = sendStatus[c.id] || "idle";
              return (
                <label
                  key={c.id}
                  className="flex items-center gap-3 px-6 py-3 hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(c.id)}
                    onChange={() => toggleSelect(c.id)}
                    className="w-4 h-4 text-emerald-600 border-gray-300 focus:ring-emerald-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 truncate">{c.name}</span>
                      <span className="text-xs text-gray-500">{c.phone}</span>
                    </div>
                    <div className="text-xs text-gray-600 mt-1 flex flex-wrap gap-3">
                      <span className="font-mono text-gray-800">RM {c.amount}</span>
                      <span>{c.bank}</span>
                      {c.accountNumber && <span className="text-gray-500">Acct: {c.accountNumber}</span>}
                      {c.date && <span className="text-gray-500">Date: {c.date}</span>}
                    </div>
                  </div>
                  <div
                    className={cn(
                      "text-xs px-2 py-1 rounded",
                      status === "sent" && "bg-emerald-50 text-emerald-700",
                      status === "error" && "bg-red-50 text-red-700",
                      status === "sending" && "bg-gray-100 text-gray-600",
                      status === "idle" && "text-gray-400"
                    )}
                  >
                    {status === "sent" && "Sent"}
                    {status === "error" && "Error"}
                    {status === "sending" && "Sending"}
                    {status === "idle" && ""}
                  </div>
                </label>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-white">
          <div className="text-sm text-gray-600">
            Messages include amount, bank, account, and date. Reply OK to confirm; edit via the provided link.
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose} disabled={isSending}>
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={selected.size === 0 || isSending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isSending ? "Sending..." : `Send to ${selected.size}`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
