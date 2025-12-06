"use client";

import { useEffect, useState, useMemo } from "react";
import { useGridStore } from "@/store/useGridStore";
import { cn } from "@/lib/utils";

interface WarpProgressProps {
  className?: string;
}

export function WarpProgress({ className }: WarpProgressProps) {
  const { rows, isImporting } = useGridStore();
  const [displayedPercent, setDisplayedPercent] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const stats = useMemo(() => {
    let total = 0;
    let clean = 0;
    let suggestions = 0;
    let duplicates = 0;
    let critical = 0;

    rows.forEach((row) => {
      Object.values(row.status).forEach((status) => {
        total++;
        if (!status || status.state === "clean" || status.state === "validated") {
          clean++;
        } else if (status.state === "ai-suggestion") {
          suggestions++;
        } else if (status.state === "duplicate") {
          duplicates++;
        } else if (status.state === "critical") {
          critical++;
        } else if (status.state === "skipped") {
          clean++;
        }
      });
    });

    const issues = suggestions + duplicates + critical;
    const percent = total > 0 ? Math.round((clean / total) * 100) : 100;

    return { total, clean, issues, suggestions, duplicates, critical, percent };
  }, [rows]);

  useEffect(() => {
    if (stats.percent !== displayedPercent) {
      setIsAnimating(true);
      const timer = setTimeout(() => {
        setDisplayedPercent(stats.percent);
        setIsAnimating(false);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [stats.percent, displayedPercent]);

  const isComplete = stats.issues === 0;
  const hasIssues = stats.issues > 0;

  if (isImporting) {
    return (
      <div className={cn("relative overflow-hidden", className)}>
        <div className="h-1 bg-gray-900  overflow-hidden">
          <div className="h-full bg-gradient-to-r from-cyan-400 via-emerald-400 to-cyan-400 animate-warp-loading" />
        </div>
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-gray-400 font-mono animate-pulse">PROCESSING...</span>
          <span className="text-cyan-400 font-mono tabular-nums">∞</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      {/* Main progress bar */}
      <div className="relative h-2 bg-gray-900  overflow-hidden">
        {/* Glow effect */}
        <div
          className={cn(
            "absolute inset-0 blur-sm transition-opacity duration-500",
            isAnimating ? "opacity-100" : "opacity-0"
          )}
          style={{
            background: isComplete
              ? "linear-gradient(90deg, #10B981 0%, #34D399 100%)"
              : "linear-gradient(90deg, #06B6D4 0%, #10B981 50%, #06B6D4 100%)",
            width: `${displayedPercent}%`,
          }}
        />
        
        {/* Actual progress */}
        <div
          className={cn(
            "h-full  transition-all duration-300 ease-out relative",
            isComplete
              ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
              : "bg-gradient-to-r from-cyan-500 via-emerald-500 to-cyan-400"
          )}
          style={{ width: `${displayedPercent}%` }}
        >
          {/* Shimmer effect */}
          {hasIssues && (
            <div className="absolute inset-0 overflow-hidden ">
              <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            </div>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {stats.suggestions > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2  bg-amber-400" />
              <span className="text-xs text-gray-400 font-mono tabular-nums">
                {stats.suggestions}
              </span>
            </div>
          )}
          {stats.duplicates > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2  bg-orange-400" />
              <span className="text-xs text-gray-400 font-mono tabular-nums">
                {stats.duplicates}
              </span>
            </div>
          )}
          {stats.critical > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2  bg-red-400" />
              <span className="text-xs text-gray-400 font-mono tabular-nums">
                {stats.critical}
              </span>
            </div>
          )}
          {isComplete && (
            <span className="text-xs text-emerald-400 font-medium">
              ALL CLEAR
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-2xl font-bold font-mono tabular-nums transition-all duration-300",
              isComplete ? "text-emerald-400" : "text-white",
              isAnimating && "scale-110"
            )}
          >
            {displayedPercent}
          </span>
          <span className="text-xs text-gray-500">%</span>
        </div>
      </div>
    </div>
  );
}

