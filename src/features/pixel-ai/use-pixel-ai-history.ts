"use client";

import { useCallback, useRef, useState } from "react";

import {
  loadPixelsOntoGrid,
  snapshotGridState,
  type GridStateSnapshot,
  type GridStateSource,
} from "@/features/pixel-ai/lib/apply-grid-snapshot";

const PIXEL_AI_HISTORY_MAX = 100;

function capStack(stack: GridStateSnapshot[]): GridStateSnapshot[] {
  if (stack.length <= PIXEL_AI_HISTORY_MAX) return stack;
  return stack.slice(-PIXEL_AI_HISTORY_MAX);
}

type UsePixelAiHistoryParams = {
  getGrid: () => GridStateSource | null;
  syncInputsFromGrid: () => void;
  onApplyError: (message: string) => void;
};

export function usePixelAiHistory({
  getGrid,
  syncInputsFromGrid,
  onApplyError,
}: UsePixelAiHistoryParams) {
  const undoStackRef = useRef<GridStateSnapshot[]>([]);
  const redoStackRef = useRef<GridStateSnapshot[]>([]);
  const [avail, setAvail] = useState({ canUndo: false, canRedo: false });

  const syncAvail = useCallback(() => {
    setAvail({
      canUndo: undoStackRef.current.length > 0,
      canRedo: redoStackRef.current.length > 0,
    });
  }, []);

  const clearHistory = useCallback(() => {
    undoStackRef.current = [];
    redoStackRef.current = [];
    syncAvail();
  }, [syncAvail]);

  const recordBeforeAiModification = useCallback(() => {
    const grid = getGrid();
    if (!grid) return;
    undoStackRef.current = capStack([
      ...undoStackRef.current,
      snapshotGridState(grid),
    ]);
    redoStackRef.current = [];
    syncAvail();
  }, [getGrid, syncAvail]);

  const discardLastUndoRecord = useCallback(() => {
    if (undoStackRef.current.length === 0) return;
    undoStackRef.current = undoStackRef.current.slice(0, -1);
    syncAvail();
  }, [syncAvail]);

  const undo = useCallback(() => {
    const grid = getGrid();
    if (!grid || undoStackRef.current.length === 0) return;

    const previous = undoStackRef.current[undoStackRef.current.length - 1]!;
    undoStackRef.current = undoStackRef.current.slice(0, -1);
    redoStackRef.current = capStack([
      ...redoStackRef.current,
      snapshotGridState(grid),
    ]);

    const err = loadPixelsOntoGrid(grid, previous);
    if (err) {
      onApplyError(err);
      return;
    }

    syncInputsFromGrid();
    syncAvail();
  }, [getGrid, onApplyError, syncAvail, syncInputsFromGrid]);

  const redo = useCallback(() => {
    const grid = getGrid();
    if (!grid || redoStackRef.current.length === 0) return;

    const next = redoStackRef.current[redoStackRef.current.length - 1]!;
    redoStackRef.current = redoStackRef.current.slice(0, -1);
    undoStackRef.current = capStack([
      ...undoStackRef.current,
      snapshotGridState(grid),
    ]);

    const err = loadPixelsOntoGrid(grid, next);
    if (err) {
      onApplyError(err);
      return;
    }

    syncInputsFromGrid();
    syncAvail();
  }, [getGrid, onApplyError, syncAvail, syncInputsFromGrid]);

  return {
    canUndo: avail.canUndo,
    canRedo: avail.canRedo,
    clearHistory,
    recordBeforeAiModification,
    discardLastUndoRecord,
    undo,
    redo,
  };
}
