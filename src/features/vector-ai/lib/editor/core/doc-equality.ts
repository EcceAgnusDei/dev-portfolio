import type {
  PathSegmentLocal,
  Shape,
  ShapeStyle,
  Transform,
  VectorDoc,
  ViewBox,
} from "@/features/vector-ai/lib/document/types";

function isSameViewBox(a: ViewBox, b: ViewBox): boolean {
  return a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;
}

function isSameTransform(a: Transform, b: Transform): boolean {
  return (
    a.x === b.x &&
    a.y === b.y &&
    a.r === b.r &&
    a.sx === b.sx &&
    a.sy === b.sy
  );
}

function isSameShapeStyle(a: ShapeStyle, b: ShapeStyle): boolean {
  return (
    a.fill === b.fill &&
    a.stroke === b.stroke &&
    a.strokeWidth === b.strokeWidth &&
    a.opacity === b.opacity
  );
}

function isSamePathSegment(a: PathSegmentLocal, b: PathSegmentLocal): boolean {
  if (a.t !== b.t) return false;
  if (a.t === "M" && b.t === "M") {
    return a.x === b.x && a.y === b.y;
  }
  if (a.t === "C" && b.t === "C") {
    return (
      a.x === b.x &&
      a.y === b.y &&
      a.c1x === b.c1x &&
      a.c1y === b.c1y &&
      a.c2x === b.c2x &&
      a.c2y === b.c2y
    );
  }
  return false;
}

function isSameShapeBase(a: Shape, b: Shape): boolean {
  return (
    a.id === b.id &&
    a.type === b.type &&
    isSameTransform(a.transform, b.transform) &&
    isSameShapeStyle(a.style, b.style) &&
    a.locked === b.locked &&
    a.name === b.name
  );
}

function isSameShape(a: Shape, b: Shape): boolean {
  if (!isSameShapeBase(a, b)) return false;

  switch (a.type) {
    case "rect":
      return (
        b.type === "rect" &&
        a.w === b.w &&
        a.h === b.h &&
        a.rx === b.rx
      );
    case "circle":
      return b.type === "circle" && a.r === b.r;
    case "line":
      return b.type === "line" && a.x2 === b.x2 && a.y2 === b.y2;
    case "path": {
      if (b.type !== "path" || a.segments.length !== b.segments.length) {
        return false;
      }
      return a.segments.every((segment, index) =>
        isSamePathSegment(segment, b.segments[index]!),
      );
    }
    case "text":
      return (
        b.type === "text" &&
        a.content === b.content &&
        a.fontSize === b.fontSize &&
        a.fontFamily === b.fontFamily
      );
    default: {
      const _exhaustive: never = a;
      return _exhaustive;
    }
  }
}

export function isSameVectorDoc(a: VectorDoc, b: VectorDoc): boolean {
  if (a.version !== b.version || !isSameViewBox(a.viewBox, b.viewBox)) {
    return false;
  }
  if (a.shapes.length !== b.shapes.length) return false;

  return a.shapes.every((shape, index) => isSameShape(shape, b.shapes[index]!));
}
