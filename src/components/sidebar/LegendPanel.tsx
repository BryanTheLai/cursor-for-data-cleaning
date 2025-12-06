"use client";

import { cn } from "@/lib/utils";

const legendItems = [
  {
    state: "clean",
    label: "Clean",
    description: "No issues detected",
    bgClass: "bg-white border border-gray-200",
  },
  {
    state: "ai-suggestion",
    label: "AI Suggestion",
    description: "AI fix available - Press Tab to accept",
    bgClass: "bg-yellow-50 border border-yellow-300",
  },
  {
    state: "duplicate",
    label: "Duplicate Warning",
    description: "Matches previous transaction",
    bgClass: "bg-orange-50 border border-orange-300",
  },
  {
    state: "critical",
    label: "Critical Issue",
    description: "Missing data or compliance flag",
    bgClass: "bg-red-50 border border-red-300",
  },
  {
    state: "live-update",
    label: "Live Update",
    description: "Data received via WhatsApp",
    bgClass: "bg-purple-50 border border-purple-300",
  },
  {
    state: "validated",
    label: "Validated",
    description: "Confirmed against external source",
    bgClass: "bg-white border-l-2 border-l-green-500 border border-gray-200",
  },
];

export function LegendPanel() {
  return (
    <div className="p-4 space-y-3">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
        Cell States
      </h3>
      <div className="space-y-2">
        {legendItems.map((item) => (
          <div key={item.state} className="flex items-start gap-3">
            <div
              className={cn("w-8 h-6 rounded shrink-0", item.bgClass)}
            />
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900">{item.label}</p>
              <p className="text-xs text-gray-500">{item.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-4 border-t border-gray-200">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Keyboard Shortcuts
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Accept suggestion</span>
            <kbd className="px-2 py-1 text-xs bg-gray-100 border border-gray-200 rounded">
              Tab
            </kbd>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Reject / Close</span>
            <kbd className="px-2 py-1 text-xs bg-gray-100 border border-gray-200 rounded">
              Esc
            </kbd>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Navigate</span>
            <kbd className="px-2 py-1 text-xs bg-gray-100 border border-gray-200 rounded">
              Arrow Keys
            </kbd>
          </div>
        </div>
      </div>
    </div>
  );
}
