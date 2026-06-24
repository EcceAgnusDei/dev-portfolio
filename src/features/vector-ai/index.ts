export * from "@/features/vector-ai/lib/vector-ai-config";
export * from "@/features/vector-ai/lib/document/types";
export * from "@/features/vector-ai/lib/document/schema";
export * from "@/features/vector-ai/lib/editor/core/state";
export * from "@/features/vector-ai/lib/editor/core/reducer";
export * from "@/features/vector-ai/lib/editor/core/editor-queries";
export {
  applyShapePatch,
  hasShapePatch,
  shapePatchFromMove,
} from "@/features/vector-ai/lib/editor/core/shape-patch";
export {
  commitTextEditActions,
  hasSignificantTextContent,
  parseTextFontSizeInput,
  type TextEditCommit,
} from "@/features/vector-ai/lib/editor/dispatch/commit-text-content";
export { screenToWorld, worldToScreen } from "@/features/vector-ai/lib/editor/geometry/screen-to-world";
export { useVectorInteraction } from "@/features/vector-ai/lib/editor/use-vector-interaction";
export { styleToSvgProps } from "@/features/vector-ai/lib/view/style-to-svg-props";
export {
  buildSvgTransform,
  hasTransformExtras,
} from "@/features/vector-ai/lib/view/transform-to-svg";
export {
  presentationFromShape,
  viewBoxToAttr,
  type ShapePresentation,
} from "@/features/vector-ai/lib/view/shape-presentation";
export { segmentsToPathD } from "@/features/vector-ai/lib/view/segments-to-path-d";
export { presentationToXml } from "@/features/vector-ai/lib/view/presentation-to-xml";
export { serializeToSvg } from "@/features/vector-ai/lib/view/serialize-to-svg";
export { ShapeView } from "@/features/vector-ai/lib/view/shape-view";
export { VectorCanvas } from "@/features/vector-ai/lib/view/vector-canvas";
export { VectorCanvasInteractive } from "@/features/vector-ai/components/vector-canvas-interactive";
