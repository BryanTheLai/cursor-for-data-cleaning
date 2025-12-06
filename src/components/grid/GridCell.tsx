"use client";

import { forwardRef, useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import type { CellStatus, CellState } from "@/types";
import { Badge } from "@/components/ui/badge";

interface GridCellProps {
  rowId: string;
  columnKey: string;
  value: string;
  status?: CellStatus;
  isActive: boolean;
  isLocked: boolean;
  isRecentlyFixed?: boolean;
  isEditing?: boolean;
  onClick: () => void;
  onDoubleClick?: () => void;
  onEditComplete?: (value: string) => void;
}

export const GridCell = forwardRef<HTMLTableCellElement, GridCellProps>(
  ({ value, status, isActive, isLocked, isRecentlyFixed, isEditing, onClick, onDoubleClick, onEditComplete }, ref) => {
    const [isAnimating, setIsAnimating] = useState(false);
    const [editValue, setEditValue] = useState(value);
    const [prevState, setPrevState] = useState<CellState | undefined>(status?.state);
    const [transitionAnimation, setTransitionAnimation] = useState<string | null>(null);
    const [valueChanged, setValueChanged] = useState(false);
    const prevValueRef = useRef(value);
    const inputRef = useRef<HTMLInputElement>(null);

    // Focus input when entering edit mode
    useEffect(() => {
      if (isEditing && inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
        setEditValue(value);
      }
    }, [isEditing, value]);

    // Handle live update animation
    useEffect(() => {
      if (status?.state === "live-update") {
        setIsAnimating(true);
        const timer = setTimeout(() => setIsAnimating(false), 2000);
        return () => clearTimeout(timer);
      }
    }, [status?.state]);

    // Track state transitions for animations
    useEffect(() => {
      if (prevState && status?.state && prevState !== status.state) {
        // Determine which transition animation to use
        if (status.state === "validated" || status.state === "clean") {
          if (prevState === "critical") {
            setTransitionAnimation("animate-red-to-green");
          } else if (prevState === "duplicate") {
            setTransitionAnimation("animate-orange-to-green");
          } else if (prevState === "ai-suggestion") {
            setTransitionAnimation("animate-yellow-to-green");
          } else {
            setTransitionAnimation("animate-validated-pulse");
          }
          
          // Clear animation after it completes
          const timer = setTimeout(() => setTransitionAnimation(null), 1500);
          return () => clearTimeout(timer);
        } else if (status.state === "skipped") {
          setTransitionAnimation("animate-skip-fade");
          const timer = setTimeout(() => setTransitionAnimation(null), 500);
          return () => clearTimeout(timer);
        }
      }
      setPrevState(status?.state);
    }, [status?.state, prevState]);

    // Track value changes for slide animation
    useEffect(() => {
      if (prevValueRef.current !== value && value) {
        setValueChanged(true);
        const timer = setTimeout(() => setValueChanged(false), 300);
        prevValueRef.current = value;
        return () => clearTimeout(timer);
      }
    }, [value]);

    const getCellStateClass = () => {
      if (!status) return "cell-clean";
      switch (status.state) {
        case "ai-suggestion":
          return "cell-ai-suggestion";
        case "duplicate":
          return "cell-duplicate";
        case "critical":
          return "cell-critical";
        case "live-update":
          return "cell-live-update";
        case "validated":
          return "cell-validated";
        case "skipped":
          return "cell-skipped";
        default:
          return "cell-clean";
      }
    };

    const getBorderClass = () => {
      if (!status) return "";
      // Low confidence gets yellow border
      if (status.state === "ai-suggestion" && status.confidence && status.confidence < 0.7) {
        return "border-2 border-yellow-400";
      }
      if (status.state === "validated") {
        return "border-l-2 border-l-green-500";
      }
      return "";
    };

    const getConfidenceBadge = () => {
      if (!status?.confidence || status.state !== "ai-suggestion") return null;
      const percent = Math.round(status.confidence * 100);
      const isLow = status.confidence < 0.7;
      return (
        <Badge
          variant={isLow ? "warning" : "secondary"}
          className="ml-1 text-[10px] px-1 py-0"
        >
          {percent}%
        </Badge>
      );
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        onEditComplete?.(editValue);
      } else if (e.key === "Escape") {
        setEditValue(value);
        onEditComplete?.(value);
      }
    };

    const handleBlur = () => {
      onEditComplete?.(editValue);
    };

    return (
      <td
        ref={ref}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        className={cn(
          "relative px-3 py-2 border-r border-gray-200 last:border-r-0 cursor-pointer",
          "tabular-nums cell-transitioning",
          getCellStateClass(),
          getBorderClass(),
          isActive && "cell-selected",
          isLocked && "cursor-not-allowed",
          isAnimating && "animate-purple-pulse",
          isRecentlyFixed && "animate-green-flash",
          transitionAnimation
        )}
      >
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className="w-full bg-white outline-none border-none text-sm px-1 py-0.5 -mx-1 -my-0.5 ring-2 ring-blue-500"
          />
        ) : (
          <div className="flex items-center justify-between gap-1">
            <span className={cn(
              "truncate",
              !value && status?.state === "critical" && "italic text-gray-400",
              status?.state === "skipped" && "line-through",
              valueChanged && "animate-slide-in-value"
            )}>
              {value || (status?.state === "critical" ? "Missing" : status?.state === "skipped" ? "Skipped" : "")}
            </span>
            {getConfidenceBadge()}
          </div>
        )}

        {/* Suggestion indicator when active */}
        {status?.state === "ai-suggestion" && status.suggestion && isActive && (
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 border border-white" />
        )}

        {/* Excel-style handle */}
        {isActive && (
          <div className="excel-handle" />
        )}
      </td>
    );
  }
);

GridCell.displayName = "GridCell";
