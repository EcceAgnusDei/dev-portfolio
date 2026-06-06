import { z } from "zod";

import type {
  CircleShape,
  CubicMvpPathSegments,
  CubicSegmentLocal,
  LineShape,
  MoveSegmentLocal,
  PathShape,
  RectShape,
  Shape,
  ShapeStyle,
  Transform,
  VectorDoc,
  ViewBox,
} from "@/features/vector-ai/lib/document/types";
import {
  VECTOR_AI_DOC_VERSION,
  VECTOR_AI_DEFAULT_VIEWBOX,
  VECTOR_AI_MAX_SHAPE_DIMENSION,
  VECTOR_AI_MAX_SHAPE_ID_LENGTH,
  VECTOR_AI_MAX_SHAPE_NAME_LENGTH,
  VECTOR_AI_MAX_SHAPES,
  VECTOR_AI_MAX_STROKE_WIDTH,
  VECTOR_AI_MAX_VIEWBOX_DIMENSION,
} from "@/features/vector-ai/lib/vector-ai-config";

const colorSchema = z.union([
  z.literal("none"),
  z.string().regex(/^#[0-9A-Fa-f]{6}$/),
]);

const viewBoxSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
  w: z.number().finite().positive().max(VECTOR_AI_MAX_VIEWBOX_DIMENSION),
  h: z.number().finite().positive().max(VECTOR_AI_MAX_VIEWBOX_DIMENSION),
}) satisfies z.ZodType<ViewBox>;

const transformSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
  r: z.number().finite().optional(),
  sx: z.number().finite().positive().optional(),
  sy: z.number().finite().positive().optional(),
}) satisfies z.ZodType<Transform>;

const shapeStyleSchema = z.object({
  fill: colorSchema.optional(),
  stroke: colorSchema.optional(),
  strokeWidth: z
    .number()
    .finite()
    .positive()
    .max(VECTOR_AI_MAX_STROKE_WIDTH)
    .optional(),
  opacity: z.number().finite().min(0).max(1).optional(),
}) satisfies z.ZodType<ShapeStyle>;

const shapeIdSchema = z.string().min(1).max(VECTOR_AI_MAX_SHAPE_ID_LENGTH);

const shapeNameSchema = z.string().min(1).max(VECTOR_AI_MAX_SHAPE_NAME_LENGTH);

const shapeBaseSchema = z.object({
  id: shapeIdSchema,
  transform: transformSchema,
  style: shapeStyleSchema,
  locked: z.boolean().optional(),
  name: shapeNameSchema.optional(),
});

const rectShapeSchema = shapeBaseSchema.extend({
  type: z.literal("rect"),
  w: z.number().finite().positive().max(VECTOR_AI_MAX_SHAPE_DIMENSION),
  h: z.number().finite().positive().max(VECTOR_AI_MAX_SHAPE_DIMENSION),
  rx: z
    .number()
    .finite()
    .nonnegative()
    .max(VECTOR_AI_MAX_SHAPE_DIMENSION)
    .optional(),
}) satisfies z.ZodType<RectShape>;

const circleShapeSchema = shapeBaseSchema.extend({
  type: z.literal("circle"),
  r: z.number().finite().positive().max(VECTOR_AI_MAX_SHAPE_DIMENSION),
}) satisfies z.ZodType<CircleShape>;

const lineShapeSchema = shapeBaseSchema.extend({
  type: z.literal("line"),
  x2: z.number().finite(),
  y2: z.number().finite(),
}) satisfies z.ZodType<LineShape>;

const pathCoordSchema = z.number().finite();

const moveSegmentSchema = z.object({
  t: z.literal("M"),
  x: pathCoordSchema,
  y: pathCoordSchema,
}) satisfies z.ZodType<MoveSegmentLocal>;

const cubicSegmentSchema = z.object({
  t: z.literal("C"),
  x: pathCoordSchema,
  y: pathCoordSchema,
  c1x: pathCoordSchema,
  c1y: pathCoordSchema,
  c2x: pathCoordSchema,
  c2y: pathCoordSchema,
}) satisfies z.ZodType<CubicSegmentLocal>;

const cubicMvpSegmentsSchema = z
  .tuple([moveSegmentSchema, cubicSegmentSchema])
  .refine(
    ([move]) => move.x === 0 && move.y === 0,
    "Le segment M d'une courbe cubique MVP doit être à l'origine locale (0, 0).",
  ) satisfies z.ZodType<CubicMvpPathSegments>;

const pathShapeSchema = shapeBaseSchema.extend({
  type: z.literal("path"),
  segments: cubicMvpSegmentsSchema,
}) satisfies z.ZodType<PathShape>;

export const shapeSchema = z.discriminatedUnion("type", [
  rectShapeSchema,
  circleShapeSchema,
  lineShapeSchema,
  pathShapeSchema,
]) satisfies z.ZodType<Shape>;

export {
  cubicMvpSegmentsSchema,
  cubicSegmentSchema,
  moveSegmentSchema,
  pathShapeSchema,
};

export const vectorDocSchema = z.object({
  version: z.literal(VECTOR_AI_DOC_VERSION),
  viewBox: viewBoxSchema,
  shapes: z.array(shapeSchema).max(VECTOR_AI_MAX_SHAPES),
}) satisfies z.ZodType<VectorDoc>;

export type ParseVectorDocResult =
  | { ok: true; doc: VectorDoc }
  | { ok: false; error: string };

export type ParseShapeResult =
  | { ok: true; shape: Shape }
  | { ok: false; error: string };

export function parseVectorDoc(input: unknown): ParseVectorDocResult {
  const result = vectorDocSchema.safeParse(input);
  if (!result.success) {
    return { ok: false, error: "Document vectoriel invalide." };
  }
  return { ok: true, doc: result.data };
}

export function parseShape(input: unknown): ParseShapeResult {
  const result = shapeSchema.safeParse(input);
  if (!result.success) {
    return { ok: false, error: "Forme invalide." };
  }
  return { ok: true, shape: result.data };
}

export type CreateEmptyDocOptions = {
  viewBox?: Partial<ViewBox>;
};

export function createEmptyDoc(options?: CreateEmptyDocOptions): VectorDoc {
  const viewBox: ViewBox = {
    x: options?.viewBox?.x ?? VECTOR_AI_DEFAULT_VIEWBOX.x,
    y: options?.viewBox?.y ?? VECTOR_AI_DEFAULT_VIEWBOX.y,
    w: options?.viewBox?.w ?? VECTOR_AI_DEFAULT_VIEWBOX.w,
    h: options?.viewBox?.h ?? VECTOR_AI_DEFAULT_VIEWBOX.h,
  };

  return {
    version: VECTOR_AI_DOC_VERSION,
    viewBox,
    shapes: [],
  };
}

export function createShapeId(): string {
  return crypto.randomUUID();
}
