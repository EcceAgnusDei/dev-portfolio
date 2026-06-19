import type {
  TextShape,
  VectorDoc,
} from "@/features/vector-ai/lib/document/types";
import type { DraftStyle } from "@/features/vector-ai/lib/editor/core/draft-style";
import { getShapeById } from "@/features/vector-ai/lib/editor/core/selectors";
import {
  isValidTextFontSizeInput,
  parseTextFontSizeInput,
} from "@/features/vector-ai/lib/editor/dispatch/commit-text-content";
import { buildTextShape } from "@/features/vector-ai/lib/editor/dispatch/create-text";
import type { WorldPoint } from "@/features/vector-ai/lib/editor/geometry/world-point";
import { VECTOR_AI_DEFAULT_FONT_SIZE } from "@/features/vector-ai/lib/vector-ai-config";

export type TextEditSession = {
  shapeId: string;
  fontSizeDraft: string;
  world?: WorldPoint;
};

export function beginTextEditSession(
  shapeId: string,
  fontSize: number,
  world?: WorldPoint,
): TextEditSession {
  const session: TextEditSession = {
    shapeId,
    fontSizeDraft: String(fontSize),
  };
  if (world !== undefined) {
    session.world = world;
  }
  return session;
}

export function updateTextEditFontSizeDraft(
  session: TextEditSession,
  fontSizeDraft: string,
): TextEditSession {
  return { ...session, fontSizeDraft };
}

export function textShapeForEditSession(
  session: TextEditSession,
  doc: VectorDoc,
  draftStyle: DraftStyle,
): TextShape | undefined {
  const existing = getShapeById(doc, session.shapeId);
  if (existing?.type === "text") return existing;
  if (session.world === undefined) return undefined;

  const fontSize = parseTextFontSizeInput(
    session.fontSizeDraft,
    VECTOR_AI_DEFAULT_FONT_SIZE,
  );
  return buildTextShape(session.shapeId, session.world, "", fontSize, draftStyle);
}

export function textEditPreviewFontSize(
  session: TextEditSession,
  fallbackFontSize: number,
): number {
  if (!isValidTextFontSizeInput(session.fontSizeDraft)) {
    return fallbackFontSize;
  }
  return Number(session.fontSizeDraft);
}

export function commitFontSizeFromTextEditSession(
  session: TextEditSession,
  fallbackFontSize: number,
): number {
  return parseTextFontSizeInput(session.fontSizeDraft, fallbackFontSize);
}
