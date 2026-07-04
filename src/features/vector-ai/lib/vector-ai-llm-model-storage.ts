import {
  isVectorAiLlmModelId,
  VECTOR_AI_DEFAULT_LLM_MODEL,
  type VectorAiLlmModelId,
} from "@/features/vector-ai/lib/vector-ai-config";

const LOCAL_STORAGE_KEY = "dev-portfolio:vector-ai-llm-model";

export function readStoredVectorAiLlmModel(): VectorAiLlmModelId {
  if (typeof window === "undefined") return VECTOR_AI_DEFAULT_LLM_MODEL;
  const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (raw && isVectorAiLlmModelId(raw)) return raw;
  return VECTOR_AI_DEFAULT_LLM_MODEL;
}

export function writeStoredVectorAiLlmModel(model: VectorAiLlmModelId): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCAL_STORAGE_KEY, model);
}
