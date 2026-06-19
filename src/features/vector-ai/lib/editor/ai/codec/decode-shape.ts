import type { CompactShape } from "@/features/vector-ai/lib/editor/ai/codec/types";
import { defaultTextFontFamily } from "@/features/vector-ai/lib/editor/ai/codec/encode-doc";
import { isShapeColor } from "@/features/vector-ai/lib/document/color";
import { createShapeId } from "@/features/vector-ai/lib/document/schema";
import type { Shape } from "@/features/vector-ai/lib/document/types";
import {
  VECTOR_AI_DEFAULT_CIRCLE_STYLE,
  VECTOR_AI_DEFAULT_LINE_STYLE,
  VECTOR_AI_DEFAULT_RECT_STYLE,
  VECTOR_AI_MAX_FONT_SIZE,
  VECTOR_AI_MAX_SHAPE_DIMENSION,
  VECTOR_AI_MAX_STROKE_WIDTH,
  VECTOR_AI_MAX_TEXT_LENGTH,
} from "@/features/vector-ai/lib/vector-ai-config";

function readFiniteNumber(value: unknown, label: string): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) {
    throw new Error(`Valeur numérique invalide (${label}).`);
  }
  return n;
}

function readString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Chaîne invalide (${label}).`);
  }
  return value;
}

function readColor(value: unknown, label: string): string {
  const color = readString(value, label);
  if (!isShapeColor(color)) {
    throw new Error(`Couleur invalide (${label}).`);
  }
  return color;
}

function readPositive(
  value: unknown,
  label: string,
  max: number,
): number {
  const n = readFiniteNumber(value, label);
  if (n <= 0 || n > max) {
    throw new Error(`Dimension invalide (${label}).`);
  }
  return n;
}

function readStrokeWidth(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  const n = readFiniteNumber(value, "strokeWidth");
  if (n <= 0 || n > VECTOR_AI_MAX_STROKE_WIDTH) {
    throw new Error("strokeWidth invalide.");
  }
  return n;
}

function decodeRect(raw: unknown[]): Shape {
  if (raw.length < 7) {
    throw new Error("Tuple rect incomplet.");
  }
  const id = createShapeId();
  const x = readFiniteNumber(raw[2], "x");
  const y = readFiniteNumber(raw[3], "y");
  const w = readPositive(raw[4], "w", VECTOR_AI_MAX_SHAPE_DIMENSION);
  const h = readPositive(raw[5], "h", VECTOR_AI_MAX_SHAPE_DIMENSION);
  const fill = readColor(raw[6], "fill");
  const stroke =
    raw[7] !== undefined
      ? readColor(raw[7], "stroke")
      : (VECTOR_AI_DEFAULT_RECT_STYLE.stroke ?? "none");
  const strokeWidth = readStrokeWidth(raw[8]);

  return {
    id,
    type: "rect",
    transform: { x, y },
    style: {
      fill,
      stroke,
      ...(strokeWidth != null ? { strokeWidth } : {}),
    },
    w,
    h,
  };
}

function decodeCircle(raw: unknown[]): Shape {
  if (raw.length < 6) {
    throw new Error("Tuple circle incomplet.");
  }
  const id = createShapeId();
  const x = readFiniteNumber(raw[2], "x");
  const y = readFiniteNumber(raw[3], "y");
  const r = readPositive(raw[4], "r", VECTOR_AI_MAX_SHAPE_DIMENSION);
  const fill = readColor(raw[5], "fill");
  const stroke =
    raw[6] !== undefined
      ? readColor(raw[6], "stroke")
      : (VECTOR_AI_DEFAULT_CIRCLE_STYLE.stroke ?? "#000000");
  const strokeWidth =
    readStrokeWidth(raw[7]) ?? VECTOR_AI_DEFAULT_CIRCLE_STYLE.strokeWidth;

  return {
    id,
    type: "circle",
    transform: { x, y },
    style: {
      fill,
      stroke,
      ...(strokeWidth != null ? { strokeWidth } : {}),
    },
    r,
  };
}

function decodeLine(raw: unknown[]): Shape {
  if (raw.length < 7) {
    throw new Error("Tuple line incomplet.");
  }
  const id = createShapeId();
  const x = readFiniteNumber(raw[2], "x");
  const y = readFiniteNumber(raw[3], "y");
  const x2 = readFiniteNumber(raw[4], "x2");
  const y2 = readFiniteNumber(raw[5], "y2");
  const stroke = readColor(raw[6], "stroke");
  const strokeWidth =
    readStrokeWidth(raw[7]) ?? VECTOR_AI_DEFAULT_LINE_STYLE.strokeWidth;

  return {
    id,
    type: "line",
    transform: { x, y },
    style: {
      fill: "none",
      stroke,
      ...(strokeWidth != null ? { strokeWidth } : {}),
    },
    x2,
    y2,
  };
}

function decodeText(raw: unknown[]): Shape {
  if (raw.length < 7) {
    throw new Error("Tuple text incomplet.");
  }
  const id = createShapeId();
  const x = readFiniteNumber(raw[2], "x");
  const y = readFiniteNumber(raw[3], "y");
  const content = readString(raw[4], "content");
  if (content.length > VECTOR_AI_MAX_TEXT_LENGTH) {
    throw new Error("Texte trop long.");
  }
  const fontSize = readPositive(raw[5], "fontSize", VECTOR_AI_MAX_FONT_SIZE);
  const fill = readColor(raw[6], "fill");

  return {
    id,
    type: "text",
    transform: { x, y },
    style: {
      fill,
    },
    content,
    fontSize,
    fontFamily: defaultTextFontFamily(),
  };
}

export function decodeCompactShape(raw: CompactShape): Shape {
  if (!Array.isArray(raw) || raw.length < 2) {
    throw new Error("Tuple de forme invalide.");
  }

  const kind = raw[0];
  switch (kind) {
    case "r":
      return decodeRect(raw);
    case "c":
      return decodeCircle(raw);
    case "l":
      return decodeLine(raw);
    case "t":
      return decodeText(raw);
    default:
      throw new Error(`Type de forme inconnu : ${String(kind)}.`);
  }
}

export function decodeCompactShapeFromUnknown(raw: unknown): Shape {
  if (!Array.isArray(raw)) {
    throw new Error("Forme compacte invalide.");
  }
  return decodeCompactShape(raw as CompactShape);
}
