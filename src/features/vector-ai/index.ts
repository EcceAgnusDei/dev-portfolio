export * from "@/features/vector-ai/lib/vector-ai-config";
export * from "@/features/vector-ai/lib/document/types";
export * from "@/features/vector-ai/lib/document/schema";
export * from "@/features/vector-ai/lib/editor/state";
export * from "@/features/vector-ai/lib/editor/reducer";
export * from "@/features/vector-ai/lib/editor/selectors";
export { applyShapePatch } from "@/features/vector-ai/lib/editor/shape-patch";
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
export { presentationToXml } from "@/features/vector-ai/lib/view/presentation-to-xml";
export { serializeToSvg } from "@/features/vector-ai/lib/view/serialize-to-svg";
export { ShapeView } from "@/features/vector-ai/lib/view/shape-view";
export { VectorCanvas } from "@/features/vector-ai/lib/view/vector-canvas";
export { VectorCanvasInteractive } from "@/features/vector-ai/components/vector-canvas-interactive";
export { screenToWorld } from "@/features/vector-ai/lib/editor/pointer/screen-to-world";
export { useVectorPointer } from "@/features/vector-ai/lib/editor/pointer/use-vector-pointer";
