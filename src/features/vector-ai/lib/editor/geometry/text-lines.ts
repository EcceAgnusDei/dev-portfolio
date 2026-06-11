import { VECTOR_AI_TEXT_LINE_HEIGHT_FACTOR } from "@/features/vector-ai/lib/vector-ai-config";

export function splitTextLines(content: string): string[] {
  return content.length > 0 ? content.split("\n") : [""];
}

export function textLineHeight(fontSize: number): number {
  return fontSize * VECTOR_AI_TEXT_LINE_HEIGHT_FACTOR;
}
