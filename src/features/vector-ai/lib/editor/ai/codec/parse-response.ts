import { z } from "zod";

import type { VectorAiOp } from "@/features/vector-ai/lib/editor/ai/codec/types";
import { VECTOR_AI_LLM_MESSAGE_MAX_LENGTH } from "@/features/vector-ai/lib/vector-ai-config";

const compactShapeSchema = z
  .array(z.unknown())
  .min(4)
  .refine(
    (tuple) =>
      tuple[0] === "r" ||
      tuple[0] === "c" ||
      tuple[0] === "l" ||
      tuple[0] === "t",
    "Type de forme compacte invalide.",
  );

const addOpSchema = z.tuple([z.literal("add"), compactShapeSchema]);
const clearOpSchema = z.tuple([z.literal("clear")]);

const opSchema = z.union([addOpSchema, clearOpSchema]);

const opsResponseSchema = z.object({
  ops: z.array(opSchema),
  message: z
    .string()
    .trim()
    .min(1)
    .max(VECTOR_AI_LLM_MESSAGE_MAX_LENGTH)
    .optional(),
});

export type ParseVectorAiOpsJsonResult =
  | { ok: true; ops: VectorAiOp[]; message?: string }
  | { ok: false; error: string };

export function parseVectorAiOpsJson(raw: string): ParseVectorAiOpsJsonResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return { ok: false, error: "JSON invalide." };
  }

  const result = opsResponseSchema.safeParse(parsed);
  if (!result.success) {
    return { ok: false, error: "Réponse IA invalide." };
  }

  const { ops, message } = result.data;

  return {
    ok: true,
    ops: ops as VectorAiOp[],
    ...(message ? { message } : {}),
  };
}
