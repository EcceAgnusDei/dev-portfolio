import type { Shape, VectorDoc } from "@/features/vector-ai/lib/document/types";
import { getShapeById } from "@/features/vector-ai/lib/editor/core/selectors";
import type { EditorAction } from "@/features/vector-ai/lib/editor/core/state";

export type ZOrderCommand = "forward" | "backward" | "front" | "back";

export const Z_ORDER_COMMANDS: readonly ZOrderCommand[] = [
  "front",
  "forward",
  "backward",
  "back",
] as const;

export function canReorderShape(doc: VectorDoc, id: string): boolean {
  const shape = getShapeById(doc, id);
  return shape !== undefined && !shape.locked;
}

export function reorderableSelectedIds(
  doc: VectorDoc,
  ids: readonly string[],
): string[] {
  return ids.filter((id) => canReorderShape(doc, id));
}

export function canReorderSelectedShapes(
  doc: VectorDoc,
  ids: readonly string[],
): boolean {
  return reorderableSelectedIds(doc, ids).length > 0;
}

function shapesHaveSameOrder(a: readonly Shape[], b: readonly Shape[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((shape, index) => shape.id === b[index]?.id);
}

export function reorderShapes(
  shapes: readonly Shape[],
  ids: readonly string[],
  command: ZOrderCommand,
): Shape[] {
  const selectedIds = new Set(ids);
  if (selectedIds.size === 0) return [...shapes];

  const next = [...shapes];

  switch (command) {
    case "forward": {
      for (let i = next.length - 2; i >= 0; i--) {
        const current = next[i]!;
        const above = next[i + 1]!;
        if (selectedIds.has(current.id) && !selectedIds.has(above.id)) {
          next[i] = above;
          next[i + 1] = current;
        }
      }
      return next;
    }
    case "backward": {
      for (let i = 1; i < next.length; i++) {
        const current = next[i]!;
        const below = next[i - 1]!;
        if (selectedIds.has(current.id) && !selectedIds.has(below.id)) {
          next[i] = below;
          next[i - 1] = current;
        }
      }
      return next;
    }
    case "front": {
      const remaining = next.filter((shape) => !selectedIds.has(shape.id));
      const moved = next.filter((shape) => selectedIds.has(shape.id));
      return [...remaining, ...moved];
    }
    case "back": {
      const moved = next.filter((shape) => selectedIds.has(shape.id));
      const remaining = next.filter((shape) => !selectedIds.has(shape.id));
      return [...moved, ...remaining];
    }
  }
}

export function canApplyZOrderCommand(
  doc: VectorDoc,
  ids: readonly string[],
  command: ZOrderCommand,
): boolean {
  const reorderable = reorderableSelectedIds(doc, ids);
  if (reorderable.length === 0) return false;
  const nextShapes = reorderShapes(doc.shapes, reorderable, command);
  return !shapesHaveSameOrder(doc.shapes, nextShapes);
}

export type ZOrderAvailability = Record<ZOrderCommand, boolean>;

export function getZOrderAvailability(
  doc: VectorDoc,
  ids: readonly string[],
): ZOrderAvailability {
  return {
    front: canApplyZOrderCommand(doc, ids, "front"),
    forward: canApplyZOrderCommand(doc, ids, "forward"),
    backward: canApplyZOrderCommand(doc, ids, "backward"),
    back: canApplyZOrderCommand(doc, ids, "back"),
  };
}

export function reorderShapeActions(
  doc: VectorDoc,
  ids: readonly string[],
  command: ZOrderCommand,
): EditorAction[] {
  if (!canApplyZOrderCommand(doc, ids, command)) return [];

  return [
    {
      type: "SHAPES_REORDER",
      ids: reorderableSelectedIds(doc, ids),
      command,
      recordHistory: true,
    },
  ];
}
