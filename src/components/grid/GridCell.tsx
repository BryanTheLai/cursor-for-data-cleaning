"use client";

import { forwardRef, useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import type { CellStatus, CellState } from "@/types";

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

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const percent = Math.round(confidence * 100);
  const isHigh = confidence >= 0.9;
  const isMedium = confidence >= 0.7 && confidence < 0.9;
  
  return (
    <span className={cn(
      "ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full tabular-nums",
      isHigh && "bg-emerald-100 text-emerald-700",
      isMedium && "bg-amber-100 text-amber-700",
      !isHigh && !isMedium && "bg-orange-100 text-orange-700"
    )}>
      {percent}%
    </span>
  );
}

export const GridCell = forwardRef<HTMLTableCellElement, GridCellProps>(
  ({ value, status, isActive, isLocked, isRecentlyFixed, isEditing, onClick, onDoubleClick, onEditComplete }, ref) => {
    const [isAnimating, setIsAnimating] = useState(false);
    const [editValue, setEditValue] = useState(value);
    const [prevState, setPrevState] = useState<CellState | undefined>(status?.state);
    const [transitionAnimation, setTransitionAnimation] = useState<string | null>(null);
    const [valueChanged, setValueChanged] = useState(false);
    const [displayValue, setDisplayValue] = useState(value);
    const prevValueRef = useRef(value);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
      if (isEditing && inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
        setEditValue(value);
      }
    }, [isEditing, value]);

    useEffect(() => {
      if (status?.state === "live-update") {
        setIsAnimating(true);
        const timer = setTimeout(() => setIsAnimating(false), 2000);
        return () => clearTimeout(timer);
      }
    }, [status?.state]);

    useEffect(() => {
      if (prevState && status?.state && prevState !== status.state) {
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

    useEffect(() => {
      if (prevValueRef.current !== value && value) {
        setValueChanged(true);
        setDisplayValue(value);
        const timer = setTimeout(() => setValueChanged(false), 500);
        prevValueRef.current = value;
        return () => clearTimeout(timer);
      } else {
        setDisplayValue(value);
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

    const showConfidence = status?.confidence && status.state === "ai-suggestion" && !isEditing;
    const isEmpty = !value && status?.state === "critical";
    const isSkipped = status?.state === "skipped";

    return (
      <td
        ref={ref}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        className={cn(
          "relative px-3 py-2.5 border-r border-gray-100 last:border-r-0 cursor-pointer min-h-[44px]",
          "tabular-nums transition-all duration-300",
          getCellStateClass(),
          isActive && "cell-selected",
          isLocked && "cursor-not-allowed opacity-50",
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
            className="w-full bg-white outline-none border-none text-sm font-medium px-1 py-0.5 -mx-1 -my-0.5 ring-2 ring-blue-500 rounded"
          />
        ) : (
          <div className="flex items-center justify-between gap-1">
            <span className={cn(
              "truncate text-sm",
              isEmpty && "italic text-red-400 font-medium",
              isSkipped && "line-through text-gray-400",
              valueChanged && "animate-slide-in-value"
            )}>
              {displayValue || (isEmpty ? "Missing" : isSkipped ? "Skipped" : "")}
            </span>
            {showConfidence && <ConfidenceBadge confidence={status.confidence!} />}
          </div>
        )}

        {status?.state === "ai-suggestion" && status.suggestion && isActive && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-br from-amber-400 to-orange-400 rounded-full border-2 border-white shadow-sm" />
        )}

        {isActive && !isEditing && (
          <div className="excel-handle" />
        )}
      </td>
    );
  }
);

GridCell.displayName = "GridCell";
