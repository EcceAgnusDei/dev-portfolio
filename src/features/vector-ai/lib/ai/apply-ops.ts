import { decodeCompactShapeFromUnknown } from "@/features/vector-ai/lib/ai/codec/decode-shape";
import type { VectorAiOp } from "@/features/vector-ai/lib/ai/codec/types";
import { parseVectorDoc } from "@/features/vector-ai/lib/document/schema";
import type { Shape, VectorDoc } from "@/features/vector-ai/lib/document/types";
import { VECTOR_AI_MAX_SHAPES } from "@/features/vector-ai/lib/vector-ai-config";

export type ApplyVectorAiOpsResult =
  | { ok: true; doc: VectorDoc }
  | { ok: false; error: string };

function isPathShape(shape: Shape): boolean {
  return shape.type === "path";
}

function applyClear(shapes: Shape[]): Shape[] {
  return shapes.filter(isPathShape);
}

function applyAdd(shapes: Shape[], op: Extract<VectorAiOp, ["add", unknown]>): Shape[] {
  const shape = decodeCompactShapeFromUnknown(op[1]);
  if (shapes.length >= VECTOR_AI_MAX_SHAPES) {
    throw new Error("Nombre maximal de formes atteint.");
  }
  if (shapes.some((s) => s.id === shape.id)) {
    throw new Error("Identifiant de forme en double.");
  }
  return [...shapes, shape];
}

export function applyVectorAiOps(
  baseDoc: VectorDoc,
  ops: VectorAiOp[],
): ApplyVectorAiOpsResult {
  let shapes = [...baseDoc.shapes];

  try {
    for (const op of ops) {
      if (op[0] === "clear") {
        shapes = applyClear(shapes);
        continue;
      }
      if (op[0] === "add") {
        shapes = applyAdd(shapes, op);
      }
    }
  } catch (err) {
    const message =
      err instanceof Error && err.message.trim()
        ? err.message
        : "Opération IA invalide.";
    return { ok: false, error: message };
  }

  const candidate: VectorDoc = {
    ...baseDoc,
    shapes,
  };

  const parsed = parseVectorDoc(candidate);
  if (!parsed.ok) {
    return { ok: false, error: "Document IA invalide." };
  }

  return { ok: true, doc: parsed.doc };
}
