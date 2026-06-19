import {
  decodeCompactShapeForUpdate,
  decodeCompactShapeFromUnknown,
} from "@/features/vector-ai/lib/editor/ai/codec/decode-shape";
import {
  createIdMapFromShapes,
  resolveShortId,
} from "@/features/vector-ai/lib/editor/ai/codec/id-map";
import type { IdMap, VectorAiOp } from "@/features/vector-ai/lib/editor/ai/codec/types";
import { parseVectorDoc } from "@/features/vector-ai/lib/document/schema";
import type { Shape, VectorDoc } from "@/features/vector-ai/lib/document/types";
import { VECTOR_AI_MAX_SHAPES } from "@/features/vector-ai/lib/vector-ai-config";

export type ApplyVectorAiOpsResult =
  | { ok: true; doc: VectorDoc }
  | { ok: false; error: string };

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

function applyUpdate(
  shapes: Shape[],
  op: Extract<VectorAiOp, ["update", unknown]>,
  idMap: IdMap,
): Shape[] {
  const shortId =
    Array.isArray(op[1]) && typeof op[1][1] === "string" ? op[1][1] : "";
  const realId = resolveShortId(idMap, shortId);
  const index = shapes.findIndex((s) => s.id === realId);
  if (index < 0) {
    throw new Error("Forme introuvable.");
  }
  const existing = shapes[index]!;
  const updated = decodeCompactShapeForUpdate(op[1], existing);
  const next = [...shapes];
  next[index] = updated;
  return next;
}

function applyDelete(
  shapes: Shape[],
  shortId: string,
  idMap: IdMap,
): Shape[] {
  const realId = resolveShortId(idMap, shortId);
  const target = shapes.find((s) => s.id === realId);
  if (!target) {
    throw new Error("Forme introuvable.");
  }
  return shapes.filter((s) => s.id !== realId);
}

export function applyVectorAiOps(
  baseDoc: VectorDoc,
  ops: VectorAiOp[],
): ApplyVectorAiOpsResult {
  let shapes = [...baseDoc.shapes];
  const idMap = createIdMapFromShapes(baseDoc.shapes);

  try {
    for (const op of ops) {
      if (op[0] === "add") {
        shapes = applyAdd(shapes, op);
        continue;
      }
      if (op[0] === "update") {
        shapes = applyUpdate(shapes, op, idMap);
        continue;
      }
      if (op[0] === "delete") {
        shapes = applyDelete(shapes, op[1], idMap);
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
