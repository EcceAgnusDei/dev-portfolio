import type { PathSegmentLocal } from "@/features/vector-ai/lib/document/types";

export function segmentsToPathD(segments: readonly PathSegmentLocal[]): string {
  const parts: string[] = [];
  for (const seg of segments) {
    if (seg.t === "M") {
      parts.push(`M ${seg.x} ${seg.y}`);
    } else {
      parts.push(
        `C ${seg.c1x} ${seg.c1y} ${seg.c2x} ${seg.c2y} ${seg.x} ${seg.y}`,
      );
    }
  }
  return parts.join(" ");
}
