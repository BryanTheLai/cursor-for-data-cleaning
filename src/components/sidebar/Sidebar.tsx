"use client";

import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  History,
  Palette,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LegendPanel } from "./LegendPanel";
import { WhatsAppPanel } from "./WhatsAppPanel";
import { HistoryPanel } from "./HistoryPanel";
import { IssuesPanel } from "./IssuesPanel";

type TabType = "issues" | "legend" | "whatsapp" | "history";

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("issues");

  const tabs: { id: TabType; label: string; icon: React.ReactNode; tooltip: string }[] = [
    { id: "issues", label: "Issues", icon: <AlertCircle className="h-4 w-4" />, tooltip: "View and fix data issues" },
    { id: "legend", label: "Legend", icon: <Palette className="h-4 w-4" />, tooltip: "Color meanings" },
    {
      id: "whatsapp",
      label: "WhatsApp",
      icon: <MessageCircle className="h-4 w-4" />,
      tooltip: "Request missing data via WhatsApp",
    },
    { id: "history", label: "History", icon: <History className="h-4 w-4" />, tooltip: "View recent changes" },
  ];

  return (
    <div
      className={cn(
        "flex flex-col bg-white border-l border-gray-200 transition-all duration-200",
        isCollapsed ? "w-12" : "w-80"
      )}
    >
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex items-center justify-center h-10 border-b border-gray-200 hover:bg-gray-50 transition-colors"
      >
        {isCollapsed ? (
          <ChevronLeft className="h-4 w-4 text-gray-500" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-500" />
        )}
      </button>

      <div
        className={cn(
          "flex border-b border-gray-200",
          isCollapsed ? "flex-col" : "flex-row"
        )}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              if (isCollapsed) setIsCollapsed(false);
            }}
            className={cn(
              "flex items-center justify-center px-3 py-2.5 text-sm transition-colors",
              activeTab === tab.id
                ? "text-emerald-700 border-b-2 border-emerald-600 bg-emerald-50/50"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50",
              "gap-0",
              isCollapsed && "py-3"
            )}
            aria-label={tab.label}
            title={`${tab.label} — ${tab.tooltip}`}
          >
            {tab.icon}
          </button>
        ))}
      </div>

      {!isCollapsed && (
        <div className="flex-1 overflow-auto">
          {activeTab === "issues" && <IssuesPanel />}
          {activeTab === "legend" && <LegendPanel />}
          {activeTab === "whatsapp" && <WhatsAppPanel />}
          {activeTab === "history" && <HistoryPanel />}
        </div>
      )}
    </div>
  );
}
