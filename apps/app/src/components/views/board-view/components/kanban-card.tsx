"use client";

import { useState, useEffect, useMemo, memo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HotkeyButton } from "@/components/ui/hotkey-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Feature, useAppStore, ThinkingLevel } from "@/store/app-store";
import {
  GripVertical,
  Edit,
  CheckCircle2,
  Circle,
  Loader2,
  Trash2,
  Eye,
  PlayCircle,
  RotateCcw,
  StopCircle,
  Hand,
  MessageSquare,
  GitCommit,
  Cpu,
  Wrench,
  ListTodo,
  Sparkles,
  Expand,
  FileText,
  MoreVertical,
  AlertCircle,
  GitBranch,
  ChevronDown,
  ChevronUp,
  Brain,
  Wand2,
  Archive,
  Lock,
  Target,
  Square,
  Terminal,
  RefreshCw,
  Layers,
  Edit3,
} from "lucide-react";
import { CountUpTimer } from "@/components/ui/count-up-timer";
import { getElectronAPI } from "@/lib/electron";
import { getBlockingDependencies } from "@/lib/dependency-resolver";
import {
  parseAgentContext,
  AgentTaskInfo,
  formatModelName,
  DEFAULT_MODEL,
} from "@/lib/agent-context-parser";
import { Markdown } from "@/components/ui/markdown";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Formats thinking level for compact display
 */
function formatThinkingLevel(level: ThinkingLevel | undefined): string {
  if (!level || level === "none") return "";
  const labels: Record<ThinkingLevel, string> = {
    none: "",
    low: "Low",
    medium: "Med", //
    high: "High", //
    ultrathink: "Ultra",
  };
  return labels[level];
}

interface KanbanCardProps {
  feature: Feature;
  onEdit: () => void;
  onDelete: () => void;
  onViewOutput?: () => void;
  onVerify?: () => void;
  onResume?: () => void;
  onForceStop?: () => void;
  onManualVerify?: () => void;
  onMoveBackToInProgress?: () => void;
  onFollowUp?: () => void;
  onCommit?: () => void;
  onImplement?: () => void;
  onComplete?: () => void;
  onViewPlan?: () => void;
  onApprovePlan?: () => void;
  hasContext?: boolean;
  isCurrentAutoTask?: boolean;
  shortcutKey?: string;
  contextContent?: string;
  summary?: string;
  opacity?: number;
  glassmorphism?: boolean;
  cardBorderEnabled?: boolean;
  cardBorderOpacity?: number;
}

export const KanbanCard = memo(function KanbanCard({
  feature,
  onEdit,
  onDelete,
  onViewOutput,
  onVerify,
  onResume,
  onForceStop,
  onManualVerify,
  onMoveBackToInProgress,
  onFollowUp,
  onCommit,
  onImplement,
  onComplete,
  onViewPlan,
  onApprovePlan,
  hasContext,
  isCurrentAutoTask,
  shortcutKey,
  contextContent,
  summary,
  opacity = 100,
  glassmorphism = true,
  cardBorderEnabled = true,
  cardBorderOpacity = 100,
}: KanbanCardProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSummaryDialogOpen, setIsSummaryDialogOpen] = useState(false);
  const [agentInfo, setAgentInfo] = useState<AgentTaskInfo | null>(null);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const { kanbanCardDetailLevel, enableDependencyBlocking, features, useWorktrees, getEffectiveTheme } = useAppStore();
  const effectiveTheme = getEffectiveTheme();
  const isCleanTheme = effectiveTheme === "clean";

  // Calculate blocking dependencies (if feature is in backlog and has incomplete dependencies)
  const blockingDependencies = useMemo(() => {
    if (!enableDependencyBlocking || feature.status !== "backlog") {
      return [];
    }
    return getBlockingDependencies(feature, features);
  }, [enableDependencyBlocking, feature, features]);

  const showSteps =
    (kanbanCardDetailLevel === "standard" ||
    kanbanCardDetailLevel === "detailed") && !isCleanTheme; // Hide steps in clean theme
  const showAgentInfo = kanbanCardDetailLevel === "detailed" || isCleanTheme; // Always show model info in clean theme

  const isJustFinished = useMemo(() => {
    if (
      !feature.justFinishedAt ||
      feature.status !== "waiting_approval" ||
      feature.error
    ) {
      return false;
    }
    const finishedTime = new Date(feature.justFinishedAt).getTime();
    const twoMinutes = 2 * 60 * 1000;
    return currentTime - finishedTime < twoMinutes;
  }, [feature.justFinishedAt, feature.status, feature.error, currentTime]);

  useEffect(() => {
    if (!feature.justFinishedAt || feature.status !== "waiting_approval") {
      return;
    }

    const finishedTime = new Date(feature.justFinishedAt).getTime();
    const twoMinutes = 2 * 60 * 1000;
    const timeRemaining = twoMinutes - (currentTime - finishedTime);

    if (timeRemaining <= 0) {
      return;
    }

    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [feature.justFinishedAt, feature.status, currentTime]);

  useEffect(() => {
    const loadContext = async () => {
      if (contextContent) {
        const info = parseAgentContext(contextContent);
        setAgentInfo(info);
        return;
      }

      if (feature.status === "backlog") {
        setAgentInfo(null);
        return;
      }

      try {
        const api = getElectronAPI();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const currentProject = (window as any).__currentProject;
        if (!currentProject?.path) return;

        if (api.features) {
          const result = await api.features.getAgentOutput(
            currentProject.path,
            feature.id
          );

          if (result.success && result.content) {
            const info = parseAgentContext(result.content);
            setAgentInfo(info);
          }
        } else {
          const contextPath = `${currentProject.path}/.automaker/features/${feature.id}/agent-output.md`;
          const result = await api.readFile(contextPath);

          if (result.success && result.content) {
            const info = parseAgentContext(result.content);
            setAgentInfo(info);
          }
        }
      } catch {
        console.debug("[KanbanCard] No context file for feature:", feature.id);
      }
    };

    loadContext();

    if (isCurrentAutoTask) {
      const interval = setInterval(loadContext, 3000);
      return () => clearInterval(interval);
    }
  }, [feature.id, feature.status, contextContent, isCurrentAutoTask]);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    onDelete();
  };

  const isDraggable =
    feature.status === "backlog" ||
    feature.status === "waiting_approval" ||
    feature.status === "verified" ||
    (feature.skipTests && !isCurrentAutoTask);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: feature.id,
    disabled: !isDraggable,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
  };

  const borderStyle: React.CSSProperties = { ...style };
  if (!cardBorderEnabled) {
    (borderStyle as Record<string, string>).borderWidth = "0px";
    (borderStyle as Record<string, string>).borderColor = "transparent";
  } else if (cardBorderOpacity !== 100) {
    (borderStyle as Record<string, string>).borderWidth = "1px";
    (
      borderStyle as Record<string, string>
    ).borderColor = `color-mix(in oklch, var(--border) ${cardBorderOpacity}%, transparent)`;
  }

  // CLEAN THEME IMPLEMENTATION
  if (isCleanTheme) {
    return (
      <>
        <div
          ref={setNodeRef}
          style={style}
          className={cn(
            "glass kanban-card flex flex-col gap-4 group relative",
            // Verified state
            feature.status === "verified" && "opacity-60 hover:opacity-100 transition-all",
            // Running card state
            isCurrentAutoTask && "border-cyan-500/40 bg-cyan-500/[0.08]",
            // Dragging state
            isDragging && "scale-105 shadow-xl shadow-black/20 opacity-50 z-50",
            !isDraggable && "cursor-default"
          )}
          onDoubleClick={onEdit}
          {...attributes}
          {...(isDraggable ? listeners : {})}
        >
          {/* Action Icons - Waiting/Verified (In Flow, First Child) */}
          {(feature.status === "waiting_approval" || feature.status === "verified") && (
            <div className={cn(
              "flex justify-end gap-3.5 transition-opacity",
              feature.status === "waiting_approval" ? "opacity-30 group-hover:opacity-100" : "opacity-20"
            )}>
              <Edit3 
                className="w-4 h-4 cursor-pointer hover:text-white transition" 
                onClick={(e) => { e.stopPropagation(); onEdit(); }} 
              />
              <Trash2 
                className="w-4 h-4 cursor-pointer hover:text-rose-400 transition" 
                onClick={(e) => { e.stopPropagation(); handleDeleteClick(e); }} 
              />
            </div>
          )}

          {/* Top Bar - Running State */}
          {isCurrentAutoTask && (
            <div className="flex justify-end items-center gap-2">
              <div className="bg-orange-500/15 text-orange-400 text-[9px] px-2.5 py-1 rounded-lg border border-orange-500/20 flex items-center gap-1.5 font-black mono">
                <RefreshCw className="w-3 h-3" /> {formatModelName(feature.model ?? DEFAULT_MODEL)}
              </div>
              <div className="bg-slate-900/50 text-slate-500 text-[9px] px-2 py-1 rounded-lg border border-white/5 font-mono">
                {feature.startedAt ? (
                  <CountUpTimer
                    startedAt={feature.startedAt}
                    className="text-inherit"
                  />
                ) : "00:00"}
              </div>
            </div>
          )}
          
          {/* Top Bar - In Progress (Inactive) State */}
          {!isCurrentAutoTask && feature.status === "in_progress" && (
             <div className="flex justify-end gap-2">
                 <div className="bg-orange-500/10 text-orange-400 text-[9px] px-2.5 py-1 rounded-lg border border-orange-500/10 flex items-center gap-1.5 font-bold mono">
                    <RefreshCw className="w-3 h-3" /> {formatModelName(feature.model ?? DEFAULT_MODEL)}
                 </div>
                 {/* Duration if available - mocked for now as not in Feature type */}
                 <div className="bg-slate-900/50 text-slate-500 text-[9px] px-2 py-1 rounded-lg border border-white/5 font-mono">
                     00:07
                 </div>
             </div>
          )}

          {/* Delete Icon - Top Right for Backlog (Absolute) */}
          {feature.status === "backlog" && (
            <div className="absolute top-5 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
              <Trash2 
                className="w-4 h-4 text-slate-600 hover:text-red-400 cursor-pointer" 
                onClick={handleDeleteClick}
              />
            </div>
          )}

          {/* Description */}
          <p className={cn(
            "text-[13px] leading-relaxed font-medium line-clamp-3",
            isCurrentAutoTask ? "text-white font-semibold" : "text-slate-300",
            feature.status === "waiting_approval" && "italic",
            feature.status === "verified" && "line-through decoration-slate-600"
          )}>
            {feature.description || feature.summary || "No description"}
          </p>
          
          {/* More link */}
          {(feature.description || "").length > 100 && (
             <div className="flex items-center gap-1 text-[10px] text-slate-500 -mt-1 cursor-pointer hover:text-slate-300">
                <ChevronDown className="w-3 h-3" /> More
             </div>
          )}

          {/* Backlog Info */}
          {feature.status === "backlog" && (
            <div className="text-[10px] font-bold text-cyan-400/80 mono flex items-center gap-1.5 uppercase tracking-tight">
              <Layers className="w-3.5 h-3.5" /> {feature.category || "General"}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-2 mt-auto">
            {/* Backlog Buttons */}
            {feature.status === "backlog" && (
              <>
                <button 
                  onClick={(e) => { e.stopPropagation(); onEdit(); }} 
                  className="flex-1 glass py-2.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-2 hover:bg-white/10 transition"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Edit
                </button>
                {onImplement && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); onImplement(); }} 
                    className="flex-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 py-2.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-2 transition"
                  >
                    <Target className="w-3.5 h-3.5" /> Make
                  </button>
                )}
              </>
            )}

            {/* In Progress Buttons */}
            {feature.status === "in_progress" && (
              <>
                {onViewOutput && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); onViewOutput(); }} 
                    className={cn(
                      "flex-[4] py-3 rounded-xl text-[11px] font-bold flex items-center justify-center gap-2",
                      isCurrentAutoTask ? "btn-cyan font-black tracking-widest" : "bg-cyan-500/15 text-cyan-400 border border-cyan-500/20"
                    )}
                  >
                    <Terminal className={cn("w-4 h-4", isCurrentAutoTask && "stroke-[2.5px]")} /> LOGS
                    {agentInfo?.toolCallCount ? (
                       <span className={cn("px-1.5 rounded ml-1", isCurrentAutoTask ? "bg-black/10" : "bg-cyan-500/10")}>{agentInfo.toolCallCount}</span>
                    ) : null}
                  </button>
                )}
                {onForceStop && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); onForceStop(); }} 
                    className={cn(
                      "flex-1 rounded-xl flex items-center justify-center transition",
                      isCurrentAutoTask ? "bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/20" : "bg-rose-500/20 text-rose-500/50 border border-rose-500/20"
                    )}
                  >
                    <Square className="w-4 h-4 fill-current" />
                  </button>
                )}
              </>
            )}

            {/* Waiting Buttons */}
            {feature.status === "waiting_approval" && (
              <>
                {onFollowUp && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); onFollowUp(); }} 
                    className="flex-1 glass border-white/10 py-3 rounded-xl text-[11px] font-bold flex items-center justify-center gap-2 hover:bg-white/10 transition"
                  >
                    <Wand2 className="w-4 h-4" /> Refine
                  </button>
                )}
                {onCommit && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); onCommit(); }} 
                    className="flex-1 btn-cyan py-3 rounded-xl text-[11px] font-black flex items-center justify-center gap-2 tracking-widest"
                  >
                    <GitCommit className="w-4 h-4 stroke-[2.5px]" /> COMMIT
                  </button>
                )}
              </>
            )}

            {/* Verified Buttons */}
            {feature.status === "verified" && (
              <>
                 {onViewOutput && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); onViewOutput(); }} 
                      className="px-7 glass border-white/10 py-3 rounded-xl text-[11px] font-bold text-slate-500 hover:text-slate-300 transition"
                    >
                      Logs
                    </button>
                 )}
                 {onComplete && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); onComplete(); }} 
                      className="flex-1 bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 py-3 rounded-xl text-[11px] font-black flex items-center justify-center gap-2 tracking-widest"
                    >
                      <CheckCircle2 className="w-4 h-4 stroke-[2.5px]" /> COMPLETE
                    </button>
                 )}
              </>
            )}
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        <DeleteConfirmDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          onConfirm={handleConfirmDelete}
          title="Delete Feature"
          description="Are you sure you want to delete this feature? This action cannot be undone."
          testId="delete-confirmation-dialog"
          confirmTestId="confirm-delete-button"
        />

        {/* Summary Modal - Reusing existing logic */}
        <Dialog open={isSummaryDialogOpen} onOpenChange={setIsSummaryDialogOpen}>
          <DialogContent
            className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col"
            data-testid={`summary-dialog-${feature.id}`}
          >
            {/* ... Existing dialog content ... */}
            <DialogHeader>
                <DialogTitle>Summary</DialogTitle>
                <DialogDescription>{feature.summary}</DialogDescription>
            </DialogHeader>
             <div className="flex-1 overflow-y-auto p-4 bg-card rounded-lg border border-border/50">
                <Markdown>
                  {feature.summary ||
                    summary ||
                    agentInfo?.summary ||
                    "No summary available"}
                </Markdown>
              </div>
            <DialogFooter>
              <Button onClick={() => setIsSummaryDialogOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  const cardElement = (
    <Card
      ref={setNodeRef}
      style={isCurrentAutoTask ? style : borderStyle}
      className={cn(
        // Clean theme kanban-card class
        "kanban-card",
        "cursor-grab active:cursor-grabbing relative kanban-card-content select-none",
        "transition-all duration-200 ease-out",
        // Premium shadow system
        "shadow-sm hover:shadow-md hover:shadow-black/10",
        // Subtle lift on hover
        "hover:-translate-y-0.5",
        // Running card state for clean theme
        isCurrentAutoTask && "is-running kanban-card-active",
        !isCurrentAutoTask &&
          cardBorderEnabled &&
          cardBorderOpacity === 100 &&
          "border-border/50",
        !isCurrentAutoTask &&
          cardBorderEnabled &&
          cardBorderOpacity !== 100 &&
          "border",
        !isDragging && "bg-transparent",
        !glassmorphism && "backdrop-blur-[0px]!",
        isDragging && "scale-105 shadow-xl shadow-black/20 rotate-1",
        // Error state - using CSS variable
        feature.error &&
          !isCurrentAutoTask &&
          "border-[var(--status-error)] border-2 shadow-[var(--status-error-bg)] shadow-lg",
        !isDraggable && "cursor-default"
      )}
      data-testid={`kanban-card-${feature.id}`}
      onDoubleClick={onEdit}
      {...attributes}
      {...(isDraggable ? listeners : {})}
    >
      {/* Background overlay with opacity */}
      {!isDragging && (
        <div
          className={cn(
            "absolute inset-0 rounded-xl bg-card -z-10",
            glassmorphism && "backdrop-blur-sm"
          )}
          style={{ opacity: opacity / 100 }}
        />
      )}

      {/* Priority badge */}
      {feature.priority && (
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  "absolute px-2 py-1 h-8 text-sm font-bold rounded-md flex items-center justify-center z-10",
                  "top-2 left-2 min-w-[36px]",
                  feature.priority === 1 &&
                    "bg-red-500/20 text-red-500 border-2 border-red-500/50",
                  feature.priority === 2 &&
                    "bg-yellow-500/20 text-yellow-500 border-2 border-yellow-500/50",
                  feature.priority === 3 &&
                    "bg-blue-500/20 text-blue-500 border-2 border-blue-500/50"
                )}
                data-testid={`priority-badge-${feature.id}`}
              >
                {feature.priority === 1 ? "H" : feature.priority === 2 ? "M" : "L"}
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">
              <p>
                {feature.priority === 1
                  ? "High Priority"
                  : feature.priority === 2
                  ? "Medium Priority"
                  : "Low Priority"}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Category text next to priority badge */}
      {feature.priority && (
        <div className="absolute top-2 left-[54px] right-12 z-10 flex items-center h-[32px]">
          <span className="text-[11px] text-muted-foreground/70 font-medium truncate">
            {feature.category}
          </span>
        </div>
      )}

      {/* Skip Tests (Manual) indicator badge - positioned at top right */}
      {feature.skipTests && !feature.error && feature.status === "backlog" && (
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  "absolute px-2 py-1 h-8 text-sm font-bold rounded-md flex items-center justify-center z-10",
                  "min-w-[36px]",
                  "top-2 right-2",
                  "bg-[var(--status-warning-bg)] border-2 border-[var(--status-warning)]/50 text-[var(--status-warning)]"
                )}
                data-testid={`skip-tests-badge-${feature.id}`}
              >
                <Hand className="w-4 h-4" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="left" className="text-xs">
              <p>Manual verification required</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Error indicator badge */}
      {feature.error && (
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  "absolute px-2 py-1 text-[11px] font-medium rounded-md flex items-center justify-center z-10",
                  "min-w-[36px]",
                  feature.priority ? "top-11 left-2" : "top-2 left-2",
                  "bg-[var(--status-error-bg)] border border-[var(--status-error)]/40 text-[var(--status-error)]"
                )}
                data-testid={`error-badge-${feature.id}`}
              >
                <AlertCircle className="w-3.5 h-3.5" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs max-w-[250px]">
              <p>{feature.error}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Blocked by dependencies badge - positioned at top right */}
      {blockingDependencies.length > 0 && !feature.error && !feature.skipTests && feature.status === "backlog" && (
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  "absolute px-2 py-1 h-8 text-sm font-bold rounded-md flex items-center justify-center z-10",
                  "min-w-[36px]",
                  "top-2 right-2",
                  "bg-orange-500/20 border-2 border-orange-500/50 text-orange-500"
                )}
                data-testid={`blocked-badge-${feature.id}`}
              >
                <Lock className="w-4 h-4" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="left" className="text-xs max-w-[250px]">
              <p className="font-medium mb-1">Blocked by {blockingDependencies.length} incomplete {blockingDependencies.length === 1 ? 'dependency' : 'dependencies'}</p>
              <p className="text-muted-foreground">
                {blockingDependencies.map(depId => {
                  const dep = features.find(f => f.id === depId);
                  return dep?.description || depId;
                }).join(', ')}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Just Finished indicator badge */}
      {isJustFinished && (
        <div
          className={cn(
            "absolute px-1.5 py-0.5 text-[10px] font-medium rounded-md flex items-center gap-1 z-10",
            feature.priority ? "top-11 left-2" : "top-2 left-2",
            "bg-[var(--status-success-bg)] border border-[var(--status-success)]/40 text-[var(--status-success)]",
            "animate-pulse"
          )}
          data-testid={`just-finished-badge-${feature.id}`}
          title="Agent just finished working on this feature"
        >
          <Sparkles className="w-3 h-3" />
        </div>
      )}

      <CardHeader
        className={cn(
          "p-3 pb-2 block",
          feature.priority && "pt-12",
          !feature.priority &&
            (feature.skipTests || feature.error || isJustFinished) &&
            "pt-10"
        )}
      >
        {isCurrentAutoTask && (
          <div className="absolute top-2 right-2 flex items-center justify-center gap-2 bg-[var(--status-in-progress)]/15 border border-[var(--status-in-progress)]/50 rounded-md px-2 py-0.5">
            <Loader2 className="w-3.5 h-3.5 text-[var(--status-in-progress)] animate-spin" />
            <span className="text-[10px] text-[var(--status-in-progress)] font-medium">
              {formatModelName(feature.model ?? DEFAULT_MODEL)}
            </span>
            {feature.startedAt && (
              <CountUpTimer
                startedAt={feature.startedAt}
                className="text-[var(--status-in-progress)] text-[10px]"
              />
            )}
          </div>
        )}
        {!isCurrentAutoTask && feature.status === "backlog" && (
          <div className="absolute bottom-1 right-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-white/10 text-muted-foreground hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteClick(e);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              data-testid={`delete-backlog-${feature.id}`}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        )}
        {!isCurrentAutoTask &&
          (feature.status === "waiting_approval" ||
            feature.status === "verified") && (
            <>
              <div className="absolute top-2 right-2 flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-white/10 text-muted-foreground hover:text-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  data-testid={`edit-${
                    feature.status === "waiting_approval" ? "waiting" : "verified"
                  }-${feature.id}`}
                  title="Edit"
                >
                  <Edit className="w-4 h-4" />
                </Button>
                {onViewOutput && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-white/10 text-muted-foreground hover:text-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewOutput();
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    data-testid={`logs-${
                      feature.status === "waiting_approval"
                        ? "waiting"
                        : "verified"
                    }-${feature.id}`}
                    title="Logs"
                  >
                    <FileText className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <div className="absolute bottom-1 right-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-white/10 text-muted-foreground hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteClick(e);
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  data-testid={`delete-${
                    feature.status === "waiting_approval" ? "waiting" : "verified"
                  }-${feature.id}`}
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </>
          )}
        {!isCurrentAutoTask && feature.status === "in_progress" && (
          <>
            <div className="absolute top-2 right-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-muted/80 rounded-md"
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                    data-testid={`menu-${feature.id}`}
                  >
                    <MoreVertical className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit();
                    }}
                    data-testid={`edit-feature-${feature.id}`}
                    className="text-xs"
                  >
                    <Edit className="w-3 h-3 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  {onViewOutput && (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewOutput();
                      }}
                      data-testid={`view-logs-${feature.id}`}
                      className="text-xs"
                    >
                      <FileText className="w-3 h-3 mr-2" />
                      View Logs
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="absolute bottom-1 right-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-white/10 text-muted-foreground hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteClick(e);
                }}
                onPointerDown={(e) => e.stopPropagation()}
                data-testid={`delete-feature-${feature.id}`}
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </>
        )}
        <div className="flex items-start gap-2">
          {isDraggable && (
            <div
              className="-ml-2 -mt-1 p-2 touch-none opacity-40 hover:opacity-70 transition-opacity"
              data-testid={`drag-handle-${feature.id}`}
            >
              <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0 overflow-hidden">
            <CardTitle
              className={cn(
                "text-sm leading-snug break-words hyphens-auto overflow-hidden font-medium text-foreground/90",
                !isDescriptionExpanded && "line-clamp-3"
              )}
            >
              {feature.description || feature.summary || feature.id}
            </CardTitle>
            {(feature.description || feature.summary || "").length > 100 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDescriptionExpanded(!isDescriptionExpanded);
                }}
                onPointerDown={(e) => e.stopPropagation()}
                className="flex items-center gap-0.5 text-[10px] text-muted-foreground/70 hover:text-muted-foreground mt-1.5 transition-colors"
                data-testid={`toggle-description-${feature.id}`}
              >
                {isDescriptionExpanded ? (
                  <>
                    <ChevronUp className="w-3 h-3" />
                    <span>Less</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3 h-3" />
                    <span>More</span>
                  </>
                )}
              </button>
            )}
            {!feature.priority && (
              <CardDescription className="text-[11px] mt-1.5 truncate text-muted-foreground/70">
                {feature.category}
              </CardDescription>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-3 pt-0">
        {/* Target Branch Display */}
        {useWorktrees && feature.branchName && (
          <div className="mb-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <GitBranch className="w-3 h-3 shrink-0" />
            <span className="font-mono truncate" title={feature.branchName}>
              {feature.branchName}
            </span>
          </div>
        )}

        {/* Steps Preview */}
        {showSteps && feature.steps && feature.steps.length > 0 && (
          <div className="mb-3 space-y-1.5">
            {feature.steps.slice(0, 3).map((step, index) => (
              <div
                key={index}
                className="flex items-start gap-2 text-[11px] text-muted-foreground/80"
              >
                {feature.status === "verified" ? (
                  <CheckCircle2 className="w-3 h-3 mt-0.5 text-[var(--status-success)] shrink-0" />
                ) : (
                  <Circle className="w-3 h-3 mt-0.5 shrink-0 text-muted-foreground/50" />
                )}
                <span className="break-words hyphens-auto line-clamp-2 leading-relaxed">
                  {step}
                </span>
              </div>
            ))}
            {feature.steps.length > 3 && (
              <p className="text-[10px] text-muted-foreground/60 pl-5">
                +{feature.steps.length - 3} more
              </p>
            )}
          </div>
        )}

        {/* Model/Preset Info for Backlog Cards */}
        {showAgentInfo && feature.status === "backlog" && (
          <div
            className="mb-3 space-y-2 overflow-hidden"
            style={isCleanTheme ? { order: 1 } : undefined}
          >
            <div className="flex items-center gap-2 text-[11px] flex-wrap">
              <div className="flex items-center gap-1 text-[var(--status-info)]">
                <Cpu className="w-3 h-3" />
                <span className="font-medium">
                  {formatModelName(feature.model ?? DEFAULT_MODEL)}
                </span>
              </div>
              {feature.thinkingLevel && feature.thinkingLevel !== "none" && (
                <div className="flex items-center gap-1 text-purple-400">
                  <Brain className="w-3 h-3" />
                  <span className="font-medium">
                    {formatThinkingLevel(feature.thinkingLevel)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Agent Info Panel */}
        {showAgentInfo && feature.status !== "backlog" && agentInfo && (
          <div
            className="mb-3 space-y-2 overflow-hidden"
            style={isCleanTheme ? { order: 1 } : undefined}
          >
            {/* Model & Phase */}
            <div className="flex items-center gap-2 text-[11px] flex-wrap">
              <div className="flex items-center gap-1 text-[var(--status-info)]">
                <Cpu className="w-3 h-3" />
                <span className="font-medium">
                  {formatModelName(feature.model ?? DEFAULT_MODEL)}
                </span>
              </div>
              {agentInfo.currentPhase && (
                <div
                  className={cn(
                    "px-1.5 py-0.5 rounded-md text-[10px] font-medium",
                    agentInfo.currentPhase === "planning" &&
                      "bg-[var(--status-info-bg)] text-[var(--status-info)]",
                    agentInfo.currentPhase === "action" &&
                      "bg-[var(--status-warning-bg)] text-[var(--status-warning)]",
                    agentInfo.currentPhase === "verification" &&
                      "bg-[var(--status-success-bg)] text-[var(--status-success)]"
                  )}
                >
                  {agentInfo.currentPhase}
                </div>
              )}
            </div>

            {/* Task List Progress */}
            {agentInfo.todos.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground/70">
                  <ListTodo className="w-3 h-3" />
                  <span>
                    {
                      agentInfo.todos.filter((t) => t.status === "completed")
                        .length
                    }
                    /{agentInfo.todos.length} tasks
                  </span>
                </div>
                <div className="space-y-0.5 max-h-16 overflow-y-auto">
                  {agentInfo.todos.slice(0, 3).map((todo, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-1.5 text-[10px]"
                    >
                      {todo.status === "completed" ? (
                        <CheckCircle2 className="w-2.5 h-2.5 text-[var(--status-success)] shrink-0" />
                      ) : todo.status === "in_progress" ? (
                        <Loader2 className="w-2.5 h-2.5 text-[var(--status-warning)] animate-spin shrink-0" />
                      ) : (
                        <Circle className="w-2.5 h-2.5 text-muted-foreground/50 shrink-0" />
                      )}
                      <span
                        className={cn(
                          "break-words hyphens-auto line-clamp-2 leading-relaxed",
                          todo.status === "completed" &&
                            "text-muted-foreground/60 line-through",
                          todo.status === "in_progress" &&
                            "text-[var(--status-warning)]",
                          todo.status === "pending" &&
                            "text-muted-foreground/80"
                        )}
                      >
                        {todo.content}
                      </span>
                    </div>
                  ))}
                  {agentInfo.todos.length > 3 && (
                    <p className="text-[10px] text-muted-foreground/60 pl-4">
                      +{agentInfo.todos.length - 3} more
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Summary for waiting_approval and verified */}
            {(feature.status === "waiting_approval" ||
              feature.status === "verified") && (
              <>
                {(feature.summary || summary || agentInfo.summary) && (
                  <div className="space-y-1.5 pt-2 border-t border-border/30 overflow-hidden">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1 text-[10px] text-[var(--status-success)] min-w-0">
                        <Sparkles className="w-3 h-3 shrink-0" />
                        <span className="truncate font-medium">Summary</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsSummaryDialogOpen(true);
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                        className="p-0.5 rounded-md hover:bg-muted/80 transition-colors text-muted-foreground/60 hover:text-muted-foreground shrink-0"
                        title="View full summary"
                        data-testid={`expand-summary-${feature.id}`}
                      >
                        <Expand className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-[10px] text-muted-foreground/70 line-clamp-3 break-words hyphens-auto leading-relaxed overflow-hidden">
                      {feature.summary || summary || agentInfo.summary}
                    </p>
                  </div>
                )}
                {!feature.summary &&
                  !summary &&
                  !agentInfo.summary &&
                  agentInfo.toolCallCount > 0 && (
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60 pt-2 border-t border-border/30">
                      <span className="flex items-center gap-1">
                        <Wrench className="w-2.5 h-2.5" />
                        {agentInfo.toolCallCount} tool calls
                      </span>
                      {agentInfo.todos.length > 0 && (
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5 text-[var(--status-success)]" />
                          {
                            agentInfo.todos.filter(
                              (t) => t.status === "completed"
                            ).length
                          }{" "}
                          tasks done
                        </span>
                      )}
                    </div>
                  )}
              </>
            )}
          </div>
        )}

        {/* Actions */}
        <div
          className="flex flex-wrap gap-1.5"
          style={isCleanTheme ? { order: 2 } : undefined}
        >
          {isCurrentAutoTask && (
            <>
              {/* Approve Plan button - PRIORITY: shows even when agent is "running" (paused for approval) */}
              {feature.planSpec?.status === 'generated' && onApprovePlan && (
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1 min-w-0 h-7 text-[11px] bg-purple-600 hover:bg-purple-700 text-white animate-pulse"
                  onClick={(e) => {
                    e.stopPropagation();
                    onApprovePlan();
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  data-testid={`approve-plan-running-${feature.id}`}
                >
                  <FileText className="w-3 h-3 mr-1 shrink-0" />
                  <span className="truncate">Approve Plan</span>
                </Button>
              )}
              {onViewOutput && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1 h-7 text-[11px]"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewOutput();
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  data-testid={`view-output-${feature.id}`}
                >
                  <FileText className="w-3 h-3 mr-1 shrink-0" />
                  <span className="truncate">Logs</span>
                  {shortcutKey && (
                    <span
                      className="ml-1.5 px-1 py-0.5 text-[9px] font-mono rounded bg-foreground/10"
                      data-testid={`shortcut-key-${feature.id}`}
                    >
                      {shortcutKey}
                    </span>
                  )}
                </Button>
              )}
              {onForceStop && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-7 text-[11px] px-2 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onForceStop();
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  data-testid={`force-stop-${feature.id}`}
                >
                  <StopCircle className="w-3 h-3" />
                </Button>
              )}
            </>
          )}
          {!isCurrentAutoTask && feature.status === "in_progress" && (
            <>
              {/* Approve Plan button - shows when plan is generated and waiting for approval */}
              {feature.planSpec?.status === 'generated' && onApprovePlan && (
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1 h-7 text-[11px] bg-purple-600 hover:bg-purple-700 text-white animate-pulse"
                  onClick={(e) => {
                    e.stopPropagation();
                    onApprovePlan();
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  data-testid={`approve-plan-${feature.id}`}
                >
                  <FileText className="w-3 h-3 mr-1" />
                  Approve Plan
                </Button>
              )}
              {feature.skipTests && onManualVerify ? (
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1 h-7 text-[11px]"
                  onClick={(e) => {
                    e.stopPropagation();
                    onManualVerify();
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  data-testid={`manual-verify-${feature.id}`}
                >
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Verify
                </Button>
              ) : hasContext && onResume ? (
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1 h-7 text-[11px] bg-[var(--status-success)] hover:bg-[var(--status-success)]/90"
                  onClick={(e) => {
                    e.stopPropagation();
                    onResume();
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  data-testid={`resume-feature-${feature.id}`}
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Resume
                </Button>
              ) : onVerify ? (
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1 h-7 text-[11px] bg-[var(--status-success)] hover:bg-[var(--status-success)]/90"
                  onClick={(e) => {
                    e.stopPropagation();
                    onVerify();
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  data-testid={`verify-feature-${feature.id}`}
                >
                  <PlayCircle className="w-3 h-3 mr-1" />
                  Resume
                </Button>
              ) : null}
              {onViewOutput && !feature.skipTests && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-7 text-[11px] px-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewOutput();
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  data-testid={`view-output-inprogress-${feature.id}`}
                >
                  <FileText className="w-3 h-3" />
                </Button>
              )}
            </>
          )}
          {!isCurrentAutoTask && feature.status === "verified" && (
            <>
              {/* Logs button */}
              {onViewOutput && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1 h-7 text-xs min-w-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewOutput();
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  data-testid={`view-output-verified-${feature.id}`}
                >
                  <FileText className="w-3 h-3 mr-1 shrink-0" />
                  <span className="truncate">Logs</span>
                </Button>
              )}
              {/* Complete button */}
              {onComplete && (
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1 h-7 text-xs min-w-0 bg-brand-500 hover:bg-brand-600"
                  onClick={(e) => {
                    e.stopPropagation();
                    onComplete();
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  data-testid={`complete-${feature.id}`}
                >
                  <Archive className="w-3 h-3 mr-1 shrink-0" />
                  <span className="truncate">Complete</span>
                </Button>
              )}
            </>
          )}
          {!isCurrentAutoTask && feature.status === "waiting_approval" && (
            <>
              {/* Refine prompt button */}
              {onFollowUp && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1 h-7 text-[11px] min-w-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onFollowUp();
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  data-testid={`follow-up-${feature.id}`}
                >
                  <Wand2 className="w-3 h-3 mr-1 shrink-0" />
                  <span className="truncate">Refine</span>
                </Button>
              )}
              {onCommit && (
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1 h-7 text-[11px]"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCommit();
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  data-testid={`commit-${feature.id}`}
                >
                  <GitCommit className="w-3 h-3 mr-1" />
                  Commit
                </Button>
              )}
            </>
          )}
          {!isCurrentAutoTask && feature.status === "backlog" && (
            <>
              <Button
                variant="secondary"
                size="sm"
                className="flex-1 h-7 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                onPointerDown={(e) => e.stopPropagation()}
                data-testid={`edit-backlog-${feature.id}`}
              >
                <Edit className="w-3 h-3 mr-1" />
                Edit
              </Button>
              {feature.planSpec?.content && onViewPlan && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs px-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewPlan();
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  data-testid={`view-plan-${feature.id}`}
                  title="View Plan"
                >
                  <Eye className="w-3 h-3" />
                </Button>
              )}
              {onImplement && (
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1 h-7 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    onImplement();
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  data-testid={`make-${feature.id}`}
                >
                  <PlayCircle className="w-3 h-3 mr-1" />
                  Make
                </Button>
              )}
            </>
          )}
        </div>
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        title="Delete Feature"
        description="Are you sure you want to delete this feature? This action cannot be undone."
        testId="delete-confirmation-dialog"
        confirmTestId="confirm-delete-button"
      />

      {/* Summary Modal */}
      <Dialog open={isSummaryDialogOpen} onOpenChange={setIsSummaryDialogOpen}>
        <DialogContent
          className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col"
          data-testid={`summary-dialog-${feature.id}`}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[var(--status-success)]" />
              Implementation Summary
            </DialogTitle>
            <DialogDescription
              className="text-sm"
              title={feature.description || feature.summary || ""}
            >
              {(() => {
                const displayText =
                  feature.description || feature.summary || "No description";
                return displayText.length > 100
                  ? `${displayText.slice(0, 100)}...`
                  : displayText;
              })()}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-4 bg-card rounded-lg border border-border/50">
            <Markdown>
              {feature.summary ||
                summary ||
                agentInfo?.summary ||
                "No summary available"}
            </Markdown>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setIsSummaryDialogOpen(false)}
              data-testid="close-summary-button"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );

  // Wrap with animated border when in progress
  if (isCurrentAutoTask) {
    return <div className="animated-border-wrapper">{cardElement}</div>;
  }

  return cardElement;
});
