"use client";

import { Button } from "@/components/ui/button";
import { HotkeyButton } from "@/components/ui/hotkey-button";
import { Slider } from "@/components/ui/slider";
import { Play, StopCircle, Plus, Users } from "lucide-react";
import { KeyboardShortcut } from "@/hooks/use-keyboard-shortcuts";
import { useAppStore } from "@/store/app-store";

interface BoardHeaderProps {
  projectName: string;
  maxConcurrency: number;
  onConcurrencyChange: (value: number) => void;
  isAutoModeRunning: boolean;
  onStartAutoMode: () => void;
  onStopAutoMode: () => void;
  onAddFeature: () => void;
  addFeatureShortcut: KeyboardShortcut;
  isMounted: boolean;
}

export function BoardHeader({
  projectName,
  maxConcurrency,
  onConcurrencyChange,
  isAutoModeRunning,
  onStartAutoMode,
  onStopAutoMode,
  onAddFeature,
  addFeatureShortcut,
  isMounted,
}: BoardHeaderProps) {
  const { getEffectiveTheme } = useAppStore();
  const effectiveTheme = getEffectiveTheme();
  const isCleanTheme = effectiveTheme === "clean";

  if (isCleanTheme) {
    return (
      <header className="h-16 flex items-center justify-between px-8 border-b border-white/5 bg-[#0b101a]/40 backdrop-blur-md z-20 shrink-0">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Kanban Board</h2>
          <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold mono">
            {projectName}
          </p>
        </div>

        <div className="flex items-center gap-5">
          {/* Concurrency Display (Visual only to match mockup for now, or interactive if needed) */}
          <div className="flex items-center bg-white/5 border border-white/10 rounded-full px-4 py-1.5 gap-3">
            <Users className="w-4 h-4 text-slate-500" />
            <div className="toggle-track">
              <div className="toggle-thumb"></div>
            </div>
            <span className="mono text-xs font-bold text-slate-400">{maxConcurrency}</span>
          </div>

          {/* Auto Mode Button */}
          {isAutoModeRunning ? (
            <button
              className="flex items-center gap-2 glass px-5 py-2 rounded-xl text-xs font-bold hover:bg-white/10 transition text-rose-400 border-rose-500/30"
              onClick={onStopAutoMode}
            >
              <StopCircle className="w-3.5 h-3.5" /> Stop
            </button>
          ) : (
            <button
              className="flex items-center gap-2 glass px-5 py-2 rounded-xl text-xs font-bold hover:bg-white/10 transition"
              onClick={onStartAutoMode}
            >
              <Play className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400" /> Auto Mode
            </button>
          )}

          {/* Add Feature Button */}
          <button
            className="btn-cyan px-6 py-2 rounded-xl text-xs font-black flex items-center gap-2 shadow-lg shadow-cyan-500/20"
            onClick={onAddFeature}
          >
            <Plus className="w-4 h-4 stroke-[3.5px]" /> ADD FEATURE
          </button>
        </div>
      </header>
    );
  }

  return (
    <div className="flex items-center justify-between p-4 border-b border-border bg-glass backdrop-blur-md">
      <div>
        <h1 className="text-xl font-bold">Kanban Board</h1>
        <p className="text-sm text-muted-foreground">{projectName}</p>
      </div>
      <div className="flex gap-2 items-center">
        {/* Concurrency Slider - only show after mount to prevent hydration issues */}
        {isMounted && (
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary border border-border"
            data-testid="concurrency-slider-container"
          >
            <Users className="w-4 h-4 text-muted-foreground" />
            <Slider
              value={[maxConcurrency]}
              onValueChange={(value) => onConcurrencyChange(value[0])}
              min={1}
              max={10}
              step={1}
              className="w-20"
              data-testid="concurrency-slider"
            />
            <span
              className="text-sm text-muted-foreground min-w-[2ch] text-center"
              data-testid="concurrency-value"
            >
              {maxConcurrency}
            </span>
          </div>
        )}

        {/* Auto Mode Toggle - only show after mount to prevent hydration issues */}
        {isMounted && (
          <>
            {isAutoModeRunning ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={onStopAutoMode}
                data-testid="stop-auto-mode"
              >
                <StopCircle className="w-4 h-4 mr-2" />
                Stop Auto Mode
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={onStartAutoMode}
                data-testid="start-auto-mode"
              >
                <Play className="w-4 h-4 mr-2" />
                Auto Mode
              </Button>
            )}
          </>
        )}

        <HotkeyButton
          size="sm"
          onClick={onAddFeature}
          hotkey={addFeatureShortcut}
          hotkeyActive={false}
          data-testid="add-feature-button"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Feature
        </HotkeyButton>
      </div>
    </div>
  );
}
