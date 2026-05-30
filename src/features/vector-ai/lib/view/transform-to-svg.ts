import type { Transform } from "@/features/vector-ai/lib/document/types";

export function hasTransformExtras(transform: Transform): boolean {
  return (
    transform.r != null || transform.sx != null || transform.sy != null
  );
}

export function buildSvgTransform(transform: Transform): string {
  const parts: string[] = [`translate(${transform.x} ${transform.y})`];
  if (transform.r != null && transform.r !== 0) {
    parts.push(`rotate(${transform.r})`);
  }
  const sx = transform.sx ?? 1;
  const sy = transform.sy ?? 1;
  if (transform.sx != null || transform.sy != null) {
    parts.push(`scale(${sx} ${sy})`);
  }
  return parts.join(" ");
}
