"use client";

import { memo } from "react";
import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { useAppStore } from "@/store/app-store";

interface KanbanColumnProps {
  id: string;
  title: string;
  colorClass: string;
  count: number;
  children: ReactNode;
  headerAction?: ReactNode;
  opacity?: number;
  showBorder?: boolean;
  hideScrollbar?: boolean;
}

export const KanbanColumn = memo(function KanbanColumn({
  id,
  title,
  colorClass,
  count,
  children,
  headerAction,
  opacity = 100,
  showBorder = true,
  hideScrollbar = false,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const { getEffectiveTheme } = useAppStore();
  const effectiveTheme = getEffectiveTheme();
  const isCleanTheme = effectiveTheme === "clean";

  // Map column IDs to clean theme classes
  const getColumnClasses = () => {
    switch (id) {
      case "in_progress":
        return "col-in-progress";
      case "waiting_approval":
        return "col-waiting";
      case "verified":
        return "col-verified";
      default:
        return "";
    }
  };

  // Map column IDs to status dot glow classes
  const getStatusDotClasses = () => {
    switch (id) {
      case "in_progress":
        return "status-dot-in-progress glow-cyan";
      case "waiting_approval":
        return "status-dot-waiting glow-orange";
      case "verified":
        return "status-dot-verified glow-green";
      default:
        return "";
    }
  };

  // Clean theme column styles
  if (isCleanTheme) {
    const isBacklog = id === "backlog";
    
    // Explicitly match mockup classes for status dots
    const getCleanStatusDotClass = () => {
      switch (id) {
        case "backlog":
          return "status-dot bg-slate-600";
        case "in_progress":
          return "status-dot bg-cyan-400 glow-cyan";
        case "waiting_approval":
          return "status-dot bg-orange-500 glow-orange";
        case "verified":
          return "status-dot bg-emerald-500 glow-green";
        default:
          return "status-dot bg-slate-600";
      }
    };

    // Explicitly match mockup classes for badges
    const getBadgeClass = () => {
      switch (id) {
        case "in_progress":
          return "mono text-[10px] bg-cyan-500/10 px-2.5 py-0.5 rounded-full text-cyan-400 border border-cyan-500/20";
        case "verified":
          return "mono text-[10px] bg-emerald-500/10 px-2.5 py-0.5 rounded-full text-emerald-500 border border-emerald-500/20";
        case "backlog":
        case "waiting_approval":
        default:
          return "mono text-[10px] bg-white/5 px-2.5 py-0.5 rounded-full text-slate-500 border border-white/5";
      }
    };

    return (
      <div
        ref={setNodeRef}
        className={cn(
          "flex flex-col h-full w-80 gap-5",
          !isBacklog && "rounded-[2.5rem] p-3",
          getColumnClasses()
        )}
        data-testid={`kanban-column-${id}`}
        data-column-id={id}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-2 shrink-0">
          <div className="flex items-center gap-3">
            <span className={getCleanStatusDotClass()} />
            <h3 className={cn(
              "text-[11px] font-black uppercase tracking-widest",
              id === "backlog" ? "text-slate-400" :
              id === "in_progress" ? "text-slate-200" : "text-slate-300"
            )}>
              {title}
            </h3>
            {headerAction}
          </div>
          
          <span className={getBadgeClass()}>
            {count}
          </span>
        </div>

        {/* Content */}
        <div
          className={cn(
            "flex-1 overflow-y-auto custom-scrollbar space-y-4",
            isBacklog ? "pr-2" : "pr-1",
            hideScrollbar && "scrollbar-hide"
          )}
        >
          {children}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative flex flex-col h-full rounded-xl transition-all duration-200 w-72 clean:w-80",
        showBorder && "border border-border/60",
        isOver && "ring-2 ring-primary/30 ring-offset-1 ring-offset-background",
        getColumnClasses()
      )}
      data-testid={`kanban-column-${id}`}
      data-column-id={id}
    >
      {/* Background layer with opacity */}
      <div
        className={cn(
          "absolute inset-0 rounded-xl backdrop-blur-sm transition-colors duration-200",
          isOver ? "bg-accent/80" : "bg-card/80"
        )}
        style={{ opacity: opacity / 100 }}
      />

      {/* Column Header */}
      <div
        className={cn(
          "relative z-10 flex items-center gap-3 px-3 py-2.5",
          showBorder && "border-b border-border/40"
        )}
      >
        <div className={cn("w-2.5 h-2.5 rounded-full shrink-0 status-dot", colorClass, getStatusDotClasses())} />
        <h3 className="font-semibold text-sm text-foreground/90 flex-1 tracking-tight">{title}</h3>
        {headerAction}
        <span className="text-xs font-medium text-muted-foreground/80 bg-muted/50 px-2 py-0.5 rounded-md tabular-nums">
          {count}
        </span>
      </div>

      {/* Column Content */}
      <div
        className={cn(
          "relative z-10 flex-1 overflow-y-auto p-2 space-y-2.5",
          hideScrollbar &&
            "[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]",
          // Smooth scrolling
          "scroll-smooth"
        )}
      >
        {children}
      </div>

      {/* Drop zone indicator when dragging over */}
      {isOver && (
        <div className="absolute inset-0 rounded-xl bg-primary/5 pointer-events-none z-5 border-2 border-dashed border-primary/20" />
      )}
    </div>
  );
});
