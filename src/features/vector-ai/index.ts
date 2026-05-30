export * from "@/features/vector-ai/lib/vector-ai-config";
export * from "@/features/vector-ai/lib/document/types";
export * from "@/features/vector-ai/lib/document/schema";
export * from "@/features/vector-ai/lib/editor/state";
export * from "@/features/vector-ai/lib/editor/reducer";
export * from "@/features/vector-ai/lib/editor/selectors";
export { applyShapePatch } from "@/features/vector-ai/lib/editor/shape-patch";
export { styleToSvgProps } from "@/features/vector-ai/lib/render/style-to-svg-props";
export {
  buildSvgTransform,
  hasTransformExtras,
} from "@/features/vector-ai/lib/render/transform-to-svg";
export { ShapeView } from "@/features/vector-ai/lib/render/shape-view";
export { VectorCanvas } from "@/features/vector-ai/lib/render/vector-canvas";
